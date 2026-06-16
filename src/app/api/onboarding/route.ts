import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roadmaps } from "@/lib/db/schema";
import { saveProgress, getProgress } from "@/lib/aws/dynamodb";
import { generatePersonalizedRoadmap } from "@/lib/services/ai-roadmap";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { env } from "@/lib/env";
import { getGoogleClient } from "@/lib/services/ai-client";

// Assesses the conversation using Gemini
const ONBOARDING_ASSESSMENT_PROMPT = (chatHistory: string) => `
You are Master Marco Polo (the AI Caravan Master). The user is in an onboarding conversation to determine their learning path.
Analyze the following conversation history:

${chatHistory}

We need to collect:
1. Target Role (e.g. Frontend Engineer, Backend, DevOps, AI Specialist)
2. Experience Level (beginner, intermediate, or advanced)
3. Focus Interests (e.g. Next.js, AWS, Drizzle, databases)
4. Context/Goals (what they want to build or achieve)

Based on the conversation:
Are ALL four pieces of information fully collected? Answer in JSON format.
If NOT complete:
- Set "onboardingComplete" to false.
- Set "nextQuestion" to a friendly chat message from Master Marco Polo asking for the next missing detail. Keep the historical desert Caravan traveler theme.
- Set "collected" with whatever fields you have identified so far.

If ALL information IS complete:
- Set "onboardingComplete" to true.
- Set "nextQuestion" to "Great, let me prepare your learning path map!"
- Set "collected" containing:
  - "targetRole" (string, standard name)
  - "experienceLevel" (one of: "beginner", "intermediate", "advanced")
  - "interests" (array of strings)
  - "surveyAnswers" (string, summarizing their background goals)

Format your response as a single, raw JSON object. Return ONLY the raw JSON string without markdown or backticks.
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, message, restart } = body;

    if (!email) {
      return NextResponse.json({ error: "Missing required field: email" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find or create user
    let userRecord = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    const userId = userRecord ? userRecord.id : `user_${Date.now()}`;

    if (!userRecord) {
      const inserted = await db
        .insert(users)
        .values({
          id: userId,
          email: normalizedEmail,
          role: "traveler",
          experienceLevel: "beginner",
          targetRole: "Software Engineer",
          currentStatus: "normal",
        })
        .returning();
      userRecord = inserted[0];
    }

    // 2. Initialize or parse chatState
    let chatState: {
      messages: { role: "assistant" | "user"; content: string }[];
      collected: {
        targetRole?: string;
        experienceLevel?: string;
        interests?: string[];
        surveyAnswers?: string;
      };
    } = {
      messages: [
        {
          role: "assistant",
          content: "Peace be upon you, traveler! 🐫 I am Master Marco Polo, your Caravan Master guide. What software engineering role is your target destination (e.g. Frontend, Backend, AI)?",
        },
      ],
      collected: {},
    };

    if (userRecord.onboardingChatState && !restart) {
      try {
        chatState = JSON.parse(userRecord.onboardingChatState);
        // Defensive deduplication of identical consecutive messages
        if (chatState.messages && chatState.messages.length > 1) {
          const uniqueMessages: typeof chatState.messages = [];
          for (const msg of chatState.messages) {
            if (uniqueMessages.length === 0) {
              uniqueMessages.push(msg);
            } else {
              const last = uniqueMessages[uniqueMessages.length - 1];
              if (!(last.role === msg.role && last.content === msg.content)) {
                uniqueMessages.push(msg);
              }
            }
          }
          chatState.messages = uniqueMessages;
        }
      } catch (e) {
        console.error("Failed to parse onboardingChatState", e);
      }
    }

    // 3. Bypass assessment if this is an initialization or loading request (no message provided)
    if (!message || !message.trim()) {
      if (!restart) {
        const existingRoadmap = await db.query.roadmaps.findFirst({
          where: eq(roadmaps.createdBy, userRecord.id),
        });

        if (existingRoadmap) {
          const progressData = await getProgress(userRecord.id, existingRoadmap.id);
          return NextResponse.json({
            success: true,
            onboardingComplete: true,
            userId: userRecord.id,
            roadmapId: existingRoadmap.id,
            roadmap: {
              title: existingRoadmap.title,
              description: existingRoadmap.description,
              nodes: (progressData as any)?.nodes || [],
            },
            chatHistory: chatState.messages,
          });
        }
      }

      if (!userRecord.onboardingChatState || restart) {
        await db
          .update(users)
          .set({ onboardingChatState: JSON.stringify(chatState) })
          .where(eq(users.id, userRecord.id));
      }
      return NextResponse.json({
        success: true,
        onboardingComplete: false,
        userId: userRecord.id,
        chatHistory: chatState.messages,
      });
    }

    // Append new user message
    chatState.messages.push({ role: "user", content: message });

    // 4. Assess progress
    let assessment: {
      onboardingComplete: boolean;
      nextQuestion: string;
      collected: any;
    };
    let usingFallback = false;

    if (env.GEMINI_API_KEY && chatState.messages.filter(m => m.role === "user").length > 0) {
      try {
        const historyText = chatState.messages
          .map((m) => `${m.role === "assistant" ? "Master Marco Polo" : "Traveler"}: ${m.content}`)
          .join("\n");
        const { text } = await generateText({
          model: getGoogleClient()("gemini-2.5-flash"),
          prompt: ONBOARDING_ASSESSMENT_PROMPT(historyText),
          temperature: 0.1,
        });

        const cleaned = text
          .trim()
          .replace(/^```json/i, "")
          .replace(/^```/, "")
          .replace(/```$/, "")
          .trim();
        assessment = JSON.parse(cleaned);
      } catch (err) {
        console.error("Gemini assessment error, falling back to state machine:", err);
        assessment = getFallbackOnboarding(chatState.messages);
        usingFallback = true;
      }
    } else {
      assessment = getFallbackOnboarding(chatState.messages);
      usingFallback = true;
    }

    // 5. Append assistant next question
    chatState.messages.push({ role: "assistant", content: assessment.nextQuestion });
    chatState.collected = { ...chatState.collected, ...assessment.collected };

    // 6. Save chatState back to database
    await db
      .update(users)
      .set({ onboardingChatState: JSON.stringify(chatState) })
      .where(eq(users.id, userRecord.id));

    // 7. If complete, generate final learning path
    if (assessment.onboardingComplete) {
      const { targetRole, experienceLevel, interests, surveyAnswers } = chatState.collected;

      const personalizedRoadmap = await generatePersonalizedRoadmap(
        targetRole || "Software Engineer",
        experienceLevel || "beginner",
        interests || [],
        surveyAnswers || ""
      );

      if (personalizedRoadmap.usingFallback) {
        usingFallback = true;
      }

      const roadmapId = `${userRecord.id}_${(targetRole || "engineer").replace(/\s+/g, "_").toLowerCase()}_roadmap`;

      // Save user profile details
      await db
        .update(users)
        .set({
          experienceLevel: experienceLevel || "beginner",
          targetRole: targetRole || "Software Engineer",
        })
        .where(eq(users.id, userRecord.id));

      // Save roadmap meta details
      const existingRoadmap = await db.query.roadmaps.findFirst({
        where: eq(roadmaps.id, roadmapId),
      });

      if (!existingRoadmap) {
        await db.insert(roadmaps).values({
          id: roadmapId,
          title: personalizedRoadmap.title,
          description: personalizedRoadmap.description,
          difficulty: experienceLevel || "beginner",
          isPremium: false,
          createdBy: userRecord.id,
        });
      }

      // Initialize progress nodes in DynamoDB
      const initialProgress = {
        userId: userRecord.id,
        roadmapId,
        completedSteps: [],
        currentActiveNode: personalizedRoadmap.nodes[0]?.id || "node-1",
        lastAccessedTimestamp: new Date().toISOString(),
        nodes: personalizedRoadmap.nodes,
        title: personalizedRoadmap.title,
        description: personalizedRoadmap.description,
      };

      await saveProgress(initialProgress as any);

      return NextResponse.json({
        success: true,
        onboardingComplete: true,
        userId: userRecord.id,
        roadmapId,
        roadmap: personalizedRoadmap,
        chatHistory: chatState.messages,
        usingFallback,
      });
    }

    // Still in progress
    return NextResponse.json({
      success: true,
      onboardingComplete: false,
      userId: userRecord.id,
      chatHistory: chatState.messages,
      usingFallback,
    });
  } catch (error: any) {
    console.error("Conversational onboarding API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// Fallback assessment state machine
function getFallbackOnboarding(chatHistory: any[]) {
  const userMessagesCount = chatHistory.filter((m) => m.role === "user").length;

  if (userMessagesCount === 0) {
    return {
      onboardingComplete: false,
      nextQuestion: "Peace be upon you, traveler! 🐫 I am Master Marco Polo, your Caravan Master guide. What software engineering role is your target destination (e.g. Frontend, Backend, AI)?",
      collected: {},
    };
  }

  if (userMessagesCount === 1) {
    const role = chatHistory[chatHistory.length - 1].content;
    return {
      onboardingComplete: false,
      nextQuestion: `A fine destination: "${role}"! Now, what is your experience level? Are you a Novice Traveler (beginner), Caravan Merchant (intermediate), or Expedition Master (advanced)?`,
      collected: { targetRole: role },
    };
  }

  if (userMessagesCount === 2) {
    const levelText = chatHistory[chatHistory.length - 1].content.toLowerCase();
    let experienceLevel = "beginner";
    if (levelText.includes("merchant") || levelText.includes("intermediate") || levelText.includes("middle")) {
      experienceLevel = "intermediate";
    } else if (levelText.includes("master") || levelText.includes("advanced") || levelText.includes("senior")) {
      experienceLevel = "advanced";
    }

    const prevUserMessages = chatHistory.filter((m) => m.role === "user");
    const role = prevUserMessages[0]?.content || "Software Engineer";

    return {
      onboardingComplete: false,
      nextQuestion: "Excellent. Tell me about your key technical interests (e.g. Next.js, databases, cloud, system design)?",
      collected: { targetRole: role, experienceLevel },
    };
  }

  if (userMessagesCount === 3) {
    const interestsText = chatHistory[chatHistory.length - 1].content;
    const prevUserMessages = chatHistory.filter((m) => m.role === "user");
    const role = prevUserMessages[0]?.content || "Software Engineer";
    const levelText = prevUserMessages[1]?.content.toLowerCase() || "";
    let experienceLevel = "beginner";
    if (levelText.includes("merchant") || levelText.includes("intermediate")) {
      experienceLevel = "intermediate";
    } else if (levelText.includes("master") || levelText.includes("advanced")) {
      experienceLevel = "advanced";
    }

    return {
      onboardingComplete: false,
      nextQuestion: "Almost there! Briefly describe any projects you have built, or what you hope to achieve during this trail.",
      collected: {
        targetRole: role,
        experienceLevel,
        interests: interestsText.split(",").map((i: string) => i.trim()),
      },
    };
  }

  const prevUserMessages = chatHistory.filter((m) => m.role === "user");
  const role = prevUserMessages[0]?.content || "Software Engineer";
  const levelText = prevUserMessages[1]?.content.toLowerCase() || "";
  let experienceLevel = "beginner";
  if (levelText.includes("merchant") || levelText.includes("intermediate")) {
    experienceLevel = "intermediate";
  } else if (levelText.includes("master") || levelText.includes("advanced")) {
    experienceLevel = "advanced";
  }
  const interestsText = prevUserMessages[2]?.content || "";
  const goalsText = chatHistory[chatHistory.length - 1].content;

  return {
    onboardingComplete: true,
    nextQuestion: "Perfect! Preparing your learning trail map now...",
    collected: {
      targetRole: role,
      experienceLevel,
      interests: interestsText.split(",").map((i: string) => i.trim()),
      surveyAnswers: goalsText,
    },
  };
}
