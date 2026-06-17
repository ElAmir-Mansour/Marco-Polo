import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { forumPosts, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

// Basic keyword NLP frustration detector
function analyzeSentiment(text: string): "positive" | "neutral" | "frustrated" {
  const cleanText = text.toLowerCase();
  
  const frustrationKeywords = [
    "stuck", "frustrated", "hard", "quit", "confused", 
    "impossible", "hate", "failing", "give up", "annoyed", 
    "broken", "error", "useless", "wtf", "cant solve"
  ];

  const positiveKeywords = [
    "great", "love", "fun", "solved", "easy", 
    "awesome", "helped", "cool", "passed", "yay"
  ];

  const hasFrustrated = frustrationKeywords.some(kw => cleanText.includes(kw));
  const hasPositive = positiveKeywords.some(kw => cleanText.includes(kw));

  if (hasFrustrated) return "frustrated";
  if (hasPositive) return "positive";
  return "neutral";
}

export async function POST(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const body = await request.json();
    const { userId, email, content } = body;

    if (!userId || !email || !content) {
      return NextResponse.json({ error: "Missing required fields: userId, email, content" }, { status: 400 });
    }

    if (sessionData.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. You cannot post content for other users." }, { status: 403 });
    }

    const sentiment = analyzeSentiment(content);

    // 1. Log forum post in PostgreSQL
    const insertedPosts = await db
      .insert(forumPosts)
      .values({
        userId,
        authorEmail: email.toLowerCase().trim(),
        content: content.trim(),
        sentiment,
      })
      .returning();

    const post = insertedPosts[0];

    // 2. If sentiment is frustrated, update the user status
    let statusUpdated = false;
    if (sentiment === "frustrated") {
      await db
        .update(users)
        .set({ currentStatus: "frustrated" })
        .where(eq(users.id, userId));
      statusUpdated = true;
    }

    return NextResponse.json({
      success: true,
      post,
      sentiment,
      statusUpdated,
    });
  } catch (error: any) {
    console.error("Community post API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const postsList = await db
      .select()
      .from(forumPosts)
      .orderBy(desc(forumPosts.createdAt))
      .limit(20);

    return NextResponse.json({
      success: true,
      posts: postsList,
    });
  } catch (error: any) {
    console.error("Get posts API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
