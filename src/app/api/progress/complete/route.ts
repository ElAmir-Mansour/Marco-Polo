import { NextResponse } from "next/server";
import { getProgress, saveProgress, saveStreak, saveChallengeLog } from "@/lib/aws/dynamodb";
import { checkAndDecayStreak } from "@/lib/services/streak";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, roadmapId, nodeId, challengeId, codeSubmitted, isCorrect, feedbackText } = body;

    if (!userId || !roadmapId || !nodeId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
    });
  } catch (error: any) {
    console.error("Complete node challenge API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
export async function GET() {
  return NextResponse.json({ message: "Progress Complete Challenge Endpoint Active" });
}
