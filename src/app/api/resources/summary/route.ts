import { NextResponse } from "next/server";
import { generateText } from "ai";
import { env } from "@/lib/env";
import { getGoogleClient } from "@/lib/services/ai-client";

const SUMMARY_PROMPT = (title: string, url: string, type: string) => `
You are Master Marco Polo (the AI Caravan Master). Provide a 30-second bulleted summary of this learning resource:
Title: "${title}"
URL: "${url}"
Type: "${type}"

Provide exactly 3 bullet points:
1. 💡 Core Concept: What this teaches.
2. ⏱ Study Time: Expected reading/watching time.
3. 🐫 Caravanner Takeaway: The best quick advice for this skill.

Keep it extremely concise (max 3 lines) and use the desert Caravan traveler tone.
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, url, type } = body;

    if (!title || !url) {
      return NextResponse.json({ error: "Missing required fields: title, url" }, { status: 400 });
    }

    if (!env.GEMINI_API_KEY) {
      // Offline fallback summaries
      return NextResponse.json({
        summary: [
          `💡 Core Concept: Quick foundations for ${title}.`,
          "⏱ Study Time: 2-3 minutes of focused attention.",
          "🐫 Caravanner Takeaway: Walk this path step-by-step to master loops and assignments.",
        ].join("\n"),
      });
    }

    const { text } = await generateText({
      model: getGoogleClient()("gemini-2.5-flash"),
      prompt: SUMMARY_PROMPT(title, url, type || "documentation"),
      temperature: 0.2,
    });

    return NextResponse.json({ summary: text.trim() });
  } catch (error: any) {
    console.error("Resource summary API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
