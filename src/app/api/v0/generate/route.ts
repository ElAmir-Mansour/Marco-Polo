import { NextResponse } from "next/server";
import { v0 } from "v0-sdk";
import { env } from "@/lib/env";

const SYSTEM_PROMPT = `
You are an expert React and Tailwind CSS developer who creates state-of-the-art UI components.
You MUST write clean, modern, and beautifully styled TypeScript components.

Styling Theme & Colors (Desert Midnight & Neon Gold):
- Background: Deep Dark Blue/Black (use 'bg-[#070F19]' or 'bg-[#0D1B2A]')
- Panels/Cards: Dark Slate Blue (use 'bg-[#0D1B2A]' with backdrop filter glassmorphism)
- Primary Accent: Neon Desert Gold (use 'text-[#D4AF37]', 'border-[#D4AF37]', 'bg-[#D4AF37]')
- Secondary Accent: Turquoise Spring (use 'text-[#00A896]', 'border-[#00A896]', 'bg-[#00A896]')
- Highlights: Flame Orange (use 'text-[#F26419]', 'bg-[#F26419]')
- Fonts: Google Fonts Outfit/Inter style.

Guidelines:
1. Return ONLY the component code, self-contained, using Tailwind CSS classes.
2. Use Lucide icons if needed (e.g. from 'lucide-react').
3. Keep the layout premium, responsive, and interactive with hover transition effects.
4. Do not wrap code in markdown tags like \`\`\`jsx or \`\`\`tsx inside the file contents.
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt, nodeTitle } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required to generate a component." },
        { status: 400 }
      );
    }

    if (!env.V0_API_KEY) {
      console.warn("⚠️ V0_API_KEY missing. Returning mock component fallback.");
      // Fallback design
      const mockComponent = `import React from 'react';
import { Compass, Sparkles } from 'lucide-react';

export default function OasisBoilerplate() {
  return (
    <div className="bg-[#0D1B2A]/80 backdrop-blur-md border border-[#D4AF37]/20 p-6 rounded-2xl max-w-sm mx-auto shadow-[0_0_15px_rgba(212,175,55,0.15)] text-center">
      <Compass className="h-10 w-10 text-[#D4AF37] mx-auto animate-spin-slow mb-4" />
      <h3 className="text-[#F4F6F8] font-serif font-bold text-base uppercase tracking-wider">Oasis UI Boilerplate</h3>
      <p className="text-[#8D99AE] text-xs leading-relaxed mt-2">
        This is a fallback placeholder. Configure a valid V0_API_KEY in your env file to unlock live generative React + Tailwind layouts directly from v0.app.
      </p>
      <button className="mt-4 w-full bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-[#070F19] font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1 transition-all">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Continue Expedition</span>
      </button>
    </div>
  );
}`;
      return NextResponse.json({
        success: true,
        chatId: "mock-chat-id",
        webUrl: "https://v0.dev/chat/mock",
        description: "Generated placeholder (Offline fallback mode).",
        files: {
          "components/oasis-boilerplate.tsx": {
            content: mockComponent,
          },
        },
      });
    }

    console.log(`Sending prompt to v0 API for node: ${nodeTitle || "General"}...`);
    
    // Create chat generation using the v0-sdk client methods
    const chat: any = await v0.chats.create({
      message: `Create a component: ${prompt}${nodeTitle ? ` suitable for the milestone node "${nodeTitle}"` : ""}.`,
      system: SYSTEM_PROMPT,
    });

    console.log(`v0 Chat created successfully. ID: ${chat.id}`);

    // If latestVersion exists, retrieve files
    const latestFiles = chat.latestVersion?.files || {};
    
    return NextResponse.json({
      success: true,
      chatId: chat.id,
      webUrl: chat.webUrl,
      description: chat.text || chat.latestVersion?.description || "Component generated successfully.",
      files: latestFiles,
    });
  } catch (error: any) {
    console.error("Vercel v0 API generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate component via v0 API." },
      { status: 500 }
    );
  }
}
