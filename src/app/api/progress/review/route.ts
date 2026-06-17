import { NextResponse } from "next/server";
import { generateText } from "ai";
import { env } from "@/lib/env";
import { getGoogleClient } from "@/lib/services/ai-client";
import { getSession } from "@/lib/session";

const CODE_REVIEW_PROMPT = (code: string, question: string, functionName: string) => `
You are Master Marco Polo (the AI Caravan Master Code Reviewer). 
Review the following user code submission:

\`\`\`javascript
${code}
\`\`\`

The code was submitted for this puzzle challenge:
"${question}"

Provide a brief, professional tutor review of this submission.
- Output estimated Time and Space complexity (e.g. O(N)).
- Call out 1-2 clean code improvements or optimizations.
- Keep the overall review under 4 short lines of bulleted points.
- Do NOT provide the complete corrected refactored code solution. Keep it conceptual.
- Maintain the Caravanserai desert guide tone (e.g. "A fine trade route, Traveler...", "Consider the weight of your camels...").
`;

export async function POST(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const body = await request.json();
    const { codeSubmitted, question, functionName } = body;

    if (!codeSubmitted || !question) {
      return NextResponse.json({ error: "Missing codeSubmitted or question fields" }, { status: 400 });
    }

    if (!env.GEMINI_API_KEY) {
      // Mock feedback review fallback
      return NextResponse.json({
        review: [
          "🐫 A fine trade route, Traveler! Your solution is functional.",
          "⏱ Complexity: Time O(N) | Space O(1).",
          "💡 Tip: Be sure your code checks edge cases like empty inputs.",
        ].join("\n"),
      });
    }

    const { text } = await generateText({
      model: getGoogleClient()("gemini-2.5-flash"),
      prompt: CODE_REVIEW_PROMPT(codeSubmitted, question, functionName || "solution"),
      temperature: 0.2,
    });

    return NextResponse.json({ review: text.trim() });
  } catch (error: any) {
    console.error("Code review API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
