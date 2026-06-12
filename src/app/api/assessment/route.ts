import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, assessments } from "@/lib/db/schema";
import { getProgress, saveProgress } from "@/lib/aws/dynamodb";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing required parameter: userId" }, { status: 400 });
    }

    // Load all completed assessments for the user
    const results = await db.query.assessments.findMany({
      where: eq(assessments.userId, userId),
    });

    return NextResponse.json({
      success: true,
      assessments: results.map(r => ({
        ...r,
        subSkills: typeof r.subSkills === "string" ? JSON.parse(r.subSkills || "{}") : r.subSkills,
      })),
    });
  } catch (error: any) {
    console.error("GET assessment error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, trackId, score, subSkills } = body;

    if (!userId || !trackId || score === undefined || !subSkills) {
      return NextResponse.json({ error: "Missing required parameters: userId, trackId, score, subSkills" }, { status: 400 });
    }

    // Calculate percentile relative to standard 300 scale
    const percentile = Math.min(99, Math.max(1, Math.round((score / 300) * 99)));

    // Load user assessments to check duplicate of the same track
    const allUserAssessments = await db.query.assessments.findMany({
      where: eq(assessments.userId, userId),
    });
    const match = allUserAssessments.find((a: any) => a.trackId === trackId);

    const subSkillsJson = JSON.stringify(subSkills);

    if (match) {
      await db
        .update(assessments)
        .set({
          score,
          percentile,
          subSkills: subSkillsJson,
          createdAt: new Date(),
        })
        .where(eq(assessments.id, match.id));
    } else {
      await db.insert(assessments).values({
        userId,
        trackId,
        score,
        percentile,
        subSkills: subSkillsJson,
      });
    }

    // Roadmap Optimization: Auto-skip early nodes on high scores
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    let roadmapOptimized = false;
    let completedNodes: string[] = [];

    if (userRecord && userRecord.targetRole) {
      const roadmapId = `${userRecord.id}_${userRecord.targetRole.replace(/\s+/g, "_").toLowerCase()}_roadmap`;
      const progress = await getProgress(userId, roadmapId);

      if (progress && (progress as any).nodes && (progress as any).nodes.length > 0) {
        const nodesToComplete: string[] = [];
        const progressNodes = (progress as any).nodes;
        
        if (score >= 220) {
          // Expert: Complete first 2 nodes
          if (progressNodes[0]) nodesToComplete.push(progressNodes[0].id);
          if (progressNodes[1]) nodesToComplete.push(progressNodes[1].id);
        } else if (score >= 150) {
          // Proficient: Complete 1st node
          if (progressNodes[0]) nodesToComplete.push(progressNodes[0].id);
        }

        if (nodesToComplete.length > 0) {
          const uniqueCompleted = Array.from(new Set([...progress.completedSteps, ...nodesToComplete]));
          progress.completedSteps = uniqueCompleted;
          
          // Update active node to the next uncompleted one
          const nextActive = progressNodes.find((n: any) => !uniqueCompleted.includes(n.id));
          if (nextActive) {
            progress.currentActiveNode = nextActive.id;
          }
          
          progress.lastAccessedTimestamp = new Date().toISOString();
          await saveProgress(progress as any);
          roadmapOptimized = true;
          completedNodes = nodesToComplete;
        }
      }
    }

    return NextResponse.json({
      success: true,
      score,
      percentile,
      roadmapOptimized,
      completedNodes,
    });
  } catch (error: any) {
    console.error("POST assessment error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
