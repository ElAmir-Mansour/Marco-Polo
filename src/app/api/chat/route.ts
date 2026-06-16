import { streamText, convertToModelMessages } from "ai";
import { env } from "@/lib/env";
import { getGoogleClient } from "@/lib/services/ai-client";

const SYSTEM_PROMPT = (role: string, level: string, nodeTitle?: string) => `
You are "Master Marco Polo" (the AI Caravan Master), a legendary software engineer who has traveled the engineering trails for decades. You guide travelers along the Silk Road of coding.
Your demeanor is wise, encouraging, and themed like an ancient desert guide (mentioning things like sands, camel caravans, oases, spices, trade routes, or the Great Bazaar occasionally).

The traveler you are speaking with is studying to be a ${role} at a ${level} experience level.
${nodeTitle ? `They are currently at the milestone node: "${nodeTitle}".` : ""}

CRITICAL BEHAVIORAL RULE:
- NEVER give the user the direct source code solution to their challenges or assignments.
- Always guide them with conceptual explanations, leading questions, pseudo-code hints, or syntax callouts.
- Encourage them to think through the problem and write their own implementation.
- Keep your answers concise, structured, and easy to read. Use code blocks only for examples of patterns, never for direct answers.
`;

export async function POST(request: Request) {
  try {
    const { messages, userContext } = await request.json();

    const role = userContext?.targetRole || "Fullstack Engineer";
    const level = userContext?.experienceLevel || "beginner";
    const nodeTitle = userContext?.nodeTitle || "Foundations";

    // Standard model message array
    const coreMessages = await convertToModelMessages(messages);

    if (!env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY missing. Returning mock streaming response.");
      // Simulating a stream by using standard Vercel AI SDK text responses
      // In this environment, we can stream standard mock text
      const mockResponseStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const words = `Ah, traveler! The sands are hot and the path is long, but fear not. Master Marco Polo guides you even without connection coordinates. You are studying to be a ${role} at the "${nodeTitle}" milestone. What engineering puzzle do you wish to unravel? Describe your code, and I will point your compass in the right direction!`.split(" ");
          for (const word of words) {
            controller.enqueue(encoder.encode(word + " "));
            await new Promise((resolve) => setTimeout(resolve, 80));
          }
          controller.close();
        },
      });
      return new Response(mockResponseStream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Call streamText using gemini model
    const result = await streamText({
      model: getGoogleClient()("gemini-2.5-flash"),
      system: SYSTEM_PROMPT(role, level, nodeTitle),
      messages: coreMessages,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("AI Chat API route error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
