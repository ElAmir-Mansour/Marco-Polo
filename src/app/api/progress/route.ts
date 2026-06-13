import { NextResponse } from "next/server";
import { getProgress } from "@/lib/aws/dynamodb";
import { checkAndDecayStreak } from "@/lib/services/streak";
import { db } from "@/lib/db";
import { users, roadmaps } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const roadmapId = searchParams.get("roadmapId");

    if (!userId) {
      return NextResponse.json({ error: "Missing required parameter: userId" }, { status: 400 });
    }

    let activeRoadmapId = roadmapId;
    if (!activeRoadmapId) {
      const userRoadmap = await db.query.roadmaps.findFirst({
        where: eq(roadmaps.createdBy, userId),
      });
      if (userRoadmap) {
        activeRoadmapId = userRoadmap.id;
      }
    }

    // 1. Load progress and streaks (auto-decay/shield evaluation)
    const progress = activeRoadmapId ? await getProgress(userId, activeRoadmapId) : null;
    const streak = await checkAndDecayStreak(userId);

    // 2. Load relational attributes from RDS Postgres (Subscriptions, Coins, etc.)
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return NextResponse.json({
      success: true,
      progress,
      streak,
      user: userRecord ? {
        coinsBalance: userRecord.coinsBalance,
        streakShields: userRecord.streakShields,
        subscriptionStatus: userRecord.subscriptionStatus || "inactive",
        subscriptionEndsAt: userRecord.subscriptionEndsAt,
      } : null,
    });
  } catch (error: any) {
    console.error("Progress API route error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
