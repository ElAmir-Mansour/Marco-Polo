import fs from "fs";
import path from "path";

// Force mock databases for isolated local testing
(globalThis as any).useMock = true;
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;

import { checkAndDecayStreak } from "../src/lib/services/streak";

// Paths to in-memory databases
const dbPath = path.join(process.cwd(), "in-memory-db.json");
const ddbPath = path.join(process.cwd(), "in-memory-dynamodb.json");

// Backup original files
let dbBackup: string | null = null;
let ddbBackup: string | null = null;

if (fs.existsSync(dbPath)) {
  dbBackup = fs.readFileSync(dbPath, "utf8");
}
if (fs.existsSync(ddbPath)) {
  ddbBackup = fs.readFileSync(ddbPath, "utf8");
}

function restoreBackups() {
  if (dbBackup !== null) {
    fs.writeFileSync(dbPath, dbBackup, "utf8");
  }
  if (ddbBackup !== null) {
    fs.writeFileSync(ddbPath, ddbBackup, "utf8");
  }
  console.log("\n🧹 Backups of in-memory databases restored successfully.");
}

// Helper to write database state
function writeState(userRecord: any, streakRecord: any) {
  // 1. Relational DB
  const dbData = dbBackup ? JSON.parse(dbBackup) : { users: [], verification_tokens: [] };
  dbData.users = dbData.users.filter((u: any) => u.id !== userRecord.id);
  dbData.users.push(userRecord);
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), "utf8");

  // 2. DynamoDB
  const ddbData = ddbBackup ? JSON.parse(ddbBackup) : { streaks: {}, progress: {}, challengeLogs: {} };
  ddbData.streaks[streakRecord.userId] = streakRecord;
  fs.writeFileSync(ddbPath, JSON.stringify(ddbData, null, 2), "utf8");
}

// Helper to read database state
function readState(userId: string) {
  const dbData = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const ddbData = JSON.parse(fs.readFileSync(ddbPath, "utf8"));

  const user = dbData.users.find((u: any) => u.id === userId);
  const streak = ddbData.streaks[userId];

  return { user, streak };
}

let failed = false;
function assert(name: string, condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
  } else {
    console.error(`❌ [FAIL] ${name}: ${message}`);
    failed = true;
  }
}

async function runTests() {
  try {
    console.log("🚀 Starting Streak Decay and Shield Consumption Logic Tests...\n");

    const userId = "test_streak_user";

    // Setup base dates relative to today
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const twoDaysAgo = new Date();
    twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split("T")[0];

    const threeDaysAgo = new Date();
    threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
    const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

    // --- TEST 1: Completed Today ---
    console.log("--- Test 1: Completed Today ---");
    writeState(
      { id: userId, email: "test@example.com", streakShields: 2, coinsBalance: 100 },
      { userId, currentStreak: 5, maxStreak: 10, lastCompletedTimestamp: now.toISOString(), history: [todayStr] }
    );
    let result = await checkAndDecayStreak(userId);
    let state = readState(userId);
    assert("Test 1 - Streak Active", result.currentStreak === 5, `Expected streak to remain 5, got ${result.currentStreak}`);
    assert("Test 1 - Shields Intact", state.user.streakShields === 2, `Expected shields to remain 2, got ${state.user.streakShields}`);

    // --- TEST 2: Completed Yesterday ---
    console.log("\n--- Test 2: Completed Yesterday ---");
    writeState(
      { id: userId, email: "test@example.com", streakShields: 2, coinsBalance: 100 },
      { userId, currentStreak: 5, maxStreak: 10, lastCompletedTimestamp: yesterday.toISOString(), history: [yesterdayStr] }
    );
    result = await checkAndDecayStreak(userId);
    state = readState(userId);
    assert("Test 2 - Streak Active", result.currentStreak === 5, `Expected streak to remain 5, got ${result.currentStreak}`);
    assert("Test 2 - Shields Intact", state.user.streakShields === 2, `Expected shields to remain 2, got ${state.user.streakShields}`);

    // --- TEST 3: Missed Yesterday with 1 Shield ---
    console.log("\n--- Test 3: Missed Yesterday with 1 Shield ---");
    writeState(
      { id: userId, email: "test@example.com", streakShields: 1, coinsBalance: 100 },
      { userId, currentStreak: 5, maxStreak: 10, lastCompletedTimestamp: twoDaysAgo.toISOString(), history: [twoDaysAgoStr] }
    );
    result = await checkAndDecayStreak(userId);
    state = readState(userId);
    assert("Test 3 - Streak Active (Protected)", result.currentStreak === 5, `Expected streak to remain 5, got ${result.currentStreak}`);
    assert("Test 3 - Shield Consumed", state.user.streakShields === 0, `Expected shields to decrease to 0, got ${state.user.streakShields}`);
    const lastCompletedFormatted = result.lastCompletedTimestamp.split("T")[0];
    assert("Test 3 - Last Completed Shifted to Yesterday", lastCompletedFormatted === yesterdayStr, `Expected last completed date ${yesterdayStr}, got ${lastCompletedFormatted}`);

    // --- TEST 4: Missed Yesterday with 0 Shields ---
    console.log("\n--- Test 4: Missed Yesterday with 0 Shields ---");
    writeState(
      { id: userId, email: "test@example.com", streakShields: 0, coinsBalance: 100 },
      { userId, currentStreak: 5, maxStreak: 10, lastCompletedTimestamp: twoDaysAgo.toISOString(), history: [twoDaysAgoStr] }
    );
    result = await checkAndDecayStreak(userId);
    state = readState(userId);
    assert("Test 4 - Streak Decayed to 0", result.currentStreak === 0, `Expected streak to decay to 0, got ${result.currentStreak}`);
    assert("Test 4 - Shields Remain 0", state.user.streakShields === 0, `Expected shields to remain 0, got ${state.user.streakShields}`);

    // --- TEST 5: Missed 2 Days with 2 Shields ---
    console.log("\n--- Test 5: Missed 2 Days with 2 Shields (Gap requires 2 shields) ---");
    writeState(
      { id: userId, email: "test@example.com", streakShields: 2, coinsBalance: 100 },
      { userId, currentStreak: 5, maxStreak: 10, lastCompletedTimestamp: threeDaysAgo.toISOString(), history: [threeDaysAgoStr] }
    );
    result = await checkAndDecayStreak(userId);
    state = readState(userId);
    assert("Test 5 - Streak Active (Protected)", result.currentStreak === 5, `Expected streak to remain 5, got ${result.currentStreak}`);
    assert("Test 5 - Both Shields Consumed", state.user.streakShields === 0, `Expected shields to decrease to 0, got ${state.user.streakShields}`);
    const lastCompletedFormatted5 = result.lastCompletedTimestamp.split("T")[0];
    assert("Test 5 - Last Completed Shifted to Yesterday", lastCompletedFormatted5 === yesterdayStr, `Expected last completed date ${yesterdayStr}, got ${lastCompletedFormatted5}`);

    // --- TEST 6: Missed 2 Days with 1 Shield (Insufficient Shields) ---
    console.log("\n--- Test 6: Missed 2 Days with 1 Shield (Insufficient Shields) ---");
    writeState(
      { id: userId, email: "test@example.com", streakShields: 1, coinsBalance: 100 },
      { userId, currentStreak: 5, maxStreak: 10, lastCompletedTimestamp: threeDaysAgo.toISOString(), history: [threeDaysAgoStr] }
    );
    result = await checkAndDecayStreak(userId);
    state = readState(userId);
    assert("Test 6 - Streak Decayed to 0", result.currentStreak === 0, `Expected streak to decay to 0, got ${result.currentStreak}`);
    assert("Test 6 - All Shields Lost", state.user.streakShields === 0, `Expected shields to reset to 0, got ${state.user.streakShields}`);

    // --- TEST 7: No previous completed date ---
    console.log("\n--- Test 7: New User (No Last Completed Timestamp) ---");
    writeState(
      { id: userId, email: "test@example.com", streakShields: 3, coinsBalance: 100 },
      { userId, currentStreak: 0, maxStreak: 0, lastCompletedTimestamp: "", history: [] }
    );
    result = await checkAndDecayStreak(userId);
    state = readState(userId);
    assert("Test 7 - Streak Remains 0", result.currentStreak === 0, `Expected streak to remain 0, got ${result.currentStreak}`);
    assert("Test 7 - Shields Untouched", state.user.streakShields === 3, `Expected shields to remain 3, got ${state.user.streakShields}`);

    console.log("\n------------------------------------------------");
    if (!failed) {
      console.log("🎉 SUCCESS: All 7 streak decay and shield consumption logic tests passed!");
    } else {
      console.error("❌ FAILURE: Some logic tests failed.");
    }
  } catch (error) {
    console.error("Test execution error:", error);
  } finally {
    restoreBackups();
    if (failed) {
      process.exit(1);
    }
  }
}

runTests();
