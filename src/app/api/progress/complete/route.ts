import { NextResponse } from "next/server";
import { getProgress, saveProgress, saveStreak, saveChallengeLog } from "@/lib/aws/dynamodb";
import { checkAndDecayStreak } from "@/lib/services/streak";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const body = await request.json();
    const { userId, roadmapId, nodeId, challengeId, codeSubmitted, isCorrect, feedbackText } = body;

    if (!userId || !roadmapId || !nodeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (sessionData.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. You cannot complete milestones for other users." }, { status: 403 });
    }

    // 1. Log challenge submission
    await saveChallengeLog({
      challengeId: challengeId || `${roadmapId}_${nodeId}_challenge`,
      userId,
      codeSubmitted: codeSubmitted || "",
      isCorrect: !!isCorrect,
      feedbackText: feedbackText || "",
      timestamp: new Date().toISOString(),
    });

    // Load user profile details from PostgreSQL
    let userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Load active progress
    const progress = await getProgress(userId, roadmapId);
    
    // Check if step is already completed
    const completedSet = new Set(progress.completedSteps || []);
    let progressUpdated = false;

    if (isCorrect && !completedSet.has(nodeId)) {
      completedSet.add(nodeId);
      progress.completedSteps = Array.from(completedSet);
      
      // Determine the next active node in order
      const nodesList: any[] = (progress as any).nodes || [];
      const currentIdx = nodesList.findIndex((n) => n.id === nodeId);
      if (currentIdx !== -1 && currentIdx < nodesList.length - 1) {
        progress.currentActiveNode = nodesList[currentIdx + 1].id;
      }
      progress.lastAccessedTimestamp = new Date().toISOString();
      await saveProgress(progress);
      progressUpdated = true;

      // Credit 25 coins to PostgreSQL profile for solving a new challenge
      try {
        if (userRecord) {
          const newBalance = userRecord.coinsBalance + 25;
          await db
            .update(users)
            .set({ coinsBalance: newBalance })
            .where(eq(users.id, userId));
          userRecord.coinsBalance = newBalance;
          console.log(`[Economy] Credited 25 coins to user ${userId}. New balance: ${newBalance}`);
        }
      } catch (err) {
        console.error("Failed to credit coins on challenge completion:", err);
      }
    }

    // 2. Update Streak (Evaluate baseline using checkAndDecayStreak first)
    const streak = await checkAndDecayStreak(userId);
    let streakUpdated = false;

    if (isCorrect) {
      const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const lastCompleted = streak.lastCompletedTimestamp ? streak.lastCompletedTimestamp.split("T")[0] : "";
      
      if (lastCompleted !== todayStr) {
        // If streak is active (currentStreak > 0), increment it; otherwise set to 1.
        if (streak.currentStreak > 0) {
          streak.currentStreak += 1;
        } else {
          streak.currentStreak = 1;
        }

        if (streak.currentStreak > streak.maxStreak) {
          streak.maxStreak = streak.currentStreak;
        }

        streak.lastCompletedTimestamp = new Date().toISOString();
        if (!streak.history.includes(todayStr)) {
          streak.history.push(todayStr);
        }

        await saveStreak(streak);
        streakUpdated = true;
      }
    }

    return NextResponse.json({
      success: true,
      progressUpdated,
      streakUpdated,
      progress,
      streak,
      user: userRecord ? {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        coinsBalance: userRecord.coinsBalance,
        streakShields: userRecord.streakShields,
        subscriptionStatus: userRecord.subscriptionStatus || "inactive",
      } : null,
    });
  } catch (error: any) {
    console.error("Complete node challenge API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export async function GET() {
  return NextResponse.json({ message: "Progress Complete Challenge Endpoint Active" });
}
