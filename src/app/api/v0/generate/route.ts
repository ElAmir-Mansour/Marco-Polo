import { NextResponse } from "next/server";
import { v0 } from "v0-sdk";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";

export const maxDuration = 300; // Allow up to 5 minutes for long-running v0 generations

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
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

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
    
    // Create chat generation using the v0-sdk client methods asynchronously
    const chat: any = await v0.chats.create({
      message: `Create a component: ${prompt}${nodeTitle ? ` suitable for the milestone node "${nodeTitle}"` : ""}.`,
      system: SYSTEM_PROMPT,
      responseMode: "async",
      chatPrivacy: "unlisted",
    });

    console.log(`v0 Chat created successfully (async). ID: ${chat.id}`);

    // Map files array to a dictionary of file names to content
    const latestFilesRaw = chat.latestVersion?.files || [];
    const files: Record<string, { content: string }> = {};
    if (Array.isArray(latestFilesRaw)) {
      for (const file of latestFilesRaw) {
        if (file && file.name) {
          files[file.name] = { content: file.content };
        }
      }
    } else {
      Object.assign(files, latestFilesRaw);
    }
    
    return NextResponse.json({
      success: true,
      status: chat.latestVersion?.status || "pending",
      chatId: chat.id,
      webUrl: chat.webUrl,
      description: chat.text || chat.latestVersion?.description || "Component generation initialized.",
      files,
    });
  } catch (error: any) {
    console.error("Vercel v0 API generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate component via v0 API." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json(
        { error: "chatId query parameter is required." },
        { status: 400 }
      );
    }

    if (!env.V0_API_KEY) {
      // Offline fallback status handler
      return NextResponse.json({
        success: true,
        status: "completed",
        chatId,
        webUrl: "https://v0.dev/chat/mock",
        description: "Generated placeholder (Offline fallback mode).",
        files: {
          "components/oasis-boilerplate.tsx": {
            content: `import React from 'react';
import { Compass } from 'lucide-react';

export default function OasisBoilerplate() {
  return (
    <div className="bg-[#0D1B2A]/80 backdrop-blur-md border border-[#D4AF37]/20 p-6 rounded-2xl max-w-sm mx-auto text-center">
      <Compass className="h-10 w-10 text-[#D4AF37] mx-auto mb-4" />
      <h3 className="text-[#F4F6F8] font-bold text-base">Oasis UI Boilerplate (Fallback)</h3>
    </div>
  );
}`,
          },
        },
      });
    }

    console.log(`Polling v0 status for chatId: ${chatId}...`);
    const chat: any = await v0.chats.getById({ chatId });

    const latestFilesRaw = chat.latestVersion?.files || [];
    const files: Record<string, { content: string }> = {};
    if (Array.isArray(latestFilesRaw)) {
      for (const file of latestFilesRaw) {
        if (file && file.name) {
          files[file.name] = { content: file.content };
        }
      }
    } else {
      Object.assign(files, latestFilesRaw);
    }

    return NextResponse.json({
      success: true,
      status: chat.latestVersion?.status || "pending",
      chatId: chat.id,
      webUrl: chat.webUrl,
      description: chat.text || chat.latestVersion?.description || "Generating component...",
      files,
    });
  } catch (error: any) {
    console.error("Vercel v0 API status polling error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch status from v0 API." },
      { status: 500 }
    );
  }
}

