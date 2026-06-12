import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import fs from "fs";
import path from "path";

// Load configurations
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Verify if credentials are provided, otherwise use fallback
const hasCredentials = !!(accessKeyId && secretAccessKey);

let ddocClient: DynamoDBDocumentClient | null = null;

if (hasCredentials) {
  const client = new DynamoDBClient({
    region,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
  ddocClient = DynamoDBDocumentClient.from(client);
} else {
  console.warn("⚠️ AWS Credentials not found. DynamoDB falling back to file-backed in-memory store for local development.");
}

// Filesystem mock database file path - use /tmp on Vercel to avoid EROFS
const isVercel = 
  process.env.VERCEL === "1" || 
  process.env.VERCEL === "true" ||
  process.env.LAMBDA_TASK_ROOT !== undefined ||
  process.cwd() === "/var/task" ||
  process.cwd().includes("/var/task");

const ddbFilePath = isVercel
  ? path.join("/tmp", "in-memory-dynamodb.json")
  : path.join(process.cwd(), "in-memory-dynamodb.json");

// Helper to load mock DB from filesystem
function loadMockStore() {
  try {
    if (fs.existsSync(ddbFilePath)) {
      const data = fs.readFileSync(ddbFilePath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load in-memory-dynamodb.json", err);
  }
  return {
    streaks: {},
    progress: {},
    challengeLogs: {},
  };
}

// Helper to save mock DB to filesystem
function saveMockStore(store: any) {
  try {
    fs.writeFileSync(ddbFilePath, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save in-memory-dynamodb.json", err);
  }
}

// File-backed mock store for development
const mockStore = loadMockStore();

export interface Streak {
  userId: string;
  currentStreak: number;
  maxStreak: number;
  lastCompletedTimestamp: string;
  history: string[];
}

export interface UserProgress {
  userId: string;
  roadmapId: string;
  completedSteps: string[];
  currentActiveNode: string;
  lastAccessedTimestamp: string;
}

export interface ChallengeLog {
  challengeId: string;
  userId: string;
  codeSubmitted: string;
  isCorrect: boolean;
  feedbackText: string;
  timestamp: string;
}

// Helper: Get Streak
export async function getStreak(userId: string): Promise<Streak> {
  const tableName = process.env.DYNAMODB_STREAKS_TABLE || "UserStreaks";
  if (ddocClient) {
    try {
      const response = await ddocClient.send(
        new GetCommand({
          TableName: tableName,
          Key: { userId },
        })
      );
      return (
        (response.Item as Streak) || {
          userId,
          currentStreak: 0,
          maxStreak: 0,
          lastCompletedTimestamp: "",
          history: [],
        }
      );
    } catch (error) {
      console.error("DynamoDB getStreak error, falling back to mock:", error);
    }
  }

  // Fallback
  return (
    mockStore.streaks[userId] || {
      userId,
      currentStreak: 0,
      maxStreak: 0,
      lastCompletedTimestamp: "",
      history: [],
    }
  );
}

// Helper: Update Streak
export async function saveStreak(streak: Streak): Promise<void> {
  const tableName = process.env.DYNAMODB_STREAKS_TABLE || "UserStreaks";
  if (ddocClient) {
    try {
      await ddocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: streak,
        })
      );
      return;
    } catch (error) {
      console.error("DynamoDB saveStreak error, saving to mock:", error);
    }
  }

  // Fallback
  mockStore.streaks[streak.userId] = streak;
  saveMockStore(mockStore);
}

// Helper: Get Progress
export async function getProgress(userId: string, roadmapId: string): Promise<UserProgress> {
  const tableName = process.env.DYNAMODB_PROGRESS_TABLE || "UserProgress";
  const primaryKey = `${userId}_${roadmapId}`;
  if (ddocClient) {
    try {
      const response = await ddocClient.send(
        new GetCommand({
          TableName: tableName,
          Key: { userId_roadmapId: primaryKey },
        })
      );
      return (
        (response.Item as UserProgress) || {
          userId,
          roadmapId,
          completedSteps: [],
          currentActiveNode: "",
          lastAccessedTimestamp: "",
        }
      );
    } catch (error) {
      console.error("DynamoDB getProgress error, falling back to mock:", error);
    }
  }

  // Fallback
  return (
    mockStore.progress[primaryKey] || {
      userId,
      roadmapId,
      completedSteps: [],
      currentActiveNode: "",
      lastAccessedTimestamp: "",
    }
  );
}

// Helper: Update Progress
export async function saveProgress(progress: UserProgress): Promise<void> {
  const tableName = process.env.DYNAMODB_PROGRESS_TABLE || "UserProgress";
  const primaryKey = `${progress.userId}_${progress.roadmapId}`;
  const ddbItem = {
    userId_roadmapId: primaryKey,
    ...progress,
  };
  if (ddocClient) {
    try {
      await ddocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: ddbItem,
        })
      );
      return;
    } catch (error) {
      console.error("DynamoDB saveProgress error, saving to mock:", error);
    }
  }

  // Fallback
  mockStore.progress[primaryKey] = progress;
  saveMockStore(mockStore);
}

// Helper: Save Challenge Log
export async function saveChallengeLog(log: ChallengeLog): Promise<void> {
  const tableName = process.env.DYNAMODB_CHALLENGE_LOGS_TABLE || "DailyChallengeLogs";
  const primaryKey = `${log.challengeId}_${log.userId}`;
  const ddbItem = {
    challengeId_userId: primaryKey,
    ...log,
  };
  if (ddocClient) {
    try {
      await ddocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: ddbItem,
        })
      );
      return;
    } catch (error) {
      console.error("DynamoDB saveChallengeLog error, saving to mock:", error);
    }
  }

  // Fallback
  mockStore.challengeLogs[primaryKey] = log;
  saveMockStore(mockStore);
}
