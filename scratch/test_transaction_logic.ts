import fs from "fs";
import path from "path";

// Force mock database for isolated local testing
(globalThis as any).useMock = true;
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;

import { POST } from "../src/app/api/transactions/route";

const dbPath = path.join(process.cwd(), "in-memory-db.json");

// Backup original database
let dbBackup: string | null = null;
if (fs.existsSync(dbPath)) {
  dbBackup = fs.readFileSync(dbPath, "utf8");
}

function restoreBackup() {
  if (dbBackup !== null) {
    fs.writeFileSync(dbPath, dbBackup, "utf8");
  }
  console.log("\n🧹 Backup of in-memory database restored successfully.");
}

function writeUserState(userRecord: any) {
  const dbData = dbBackup ? JSON.parse(dbBackup) : { users: [], transactions: [] };
  dbData.users = dbData.users.filter((u: any) => u.id !== userRecord.id);
  dbData.users.push(userRecord);
  fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), "utf8");
}

function readUserState(userId: string) {
  const dbData = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  return dbData.users.find((u: any) => u.id === userId);
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
    console.log("🚀 Starting Microtransaction and Coins Ledger API Tests...\n");

    const userId = "test_tx_user";

    // --- TEST 1: Buy Shield with 150 Coins (Success) ---
    console.log("--- Test 1: Buy Shield with 150 Coins (Success) ---");
    writeUserState({
      id: userId,
      email: "tx@example.com",
      coinsBalance: 150,
      streakShields: 2,
    });

    let req = new Request("http://localhost/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        userId,
        amount: 0,
        type: "marketplace",
        action: "buy_shield",
        useCoins: true,
      }),
    });

    let res = await POST(req);
    let data = await res.json();
    let updatedUser = readUserState(userId);

    assert("Test 1 - Status OK", res.status === 200, `Expected status 200, got ${res.status}`);
    assert("Test 1 - Coins Deducted", updatedUser.coinsBalance === 100, `Expected balance 100, got ${updatedUser.coinsBalance}`);
    assert("Test 1 - Shield Added", updatedUser.streakShields === 3, `Expected shields 3, got ${updatedUser.streakShields}`);

    // --- TEST 2: Buy Shield with Insufficient Coins (Failure) ---
    console.log("\n--- Test 2: Buy Shield with Insufficient Coins (Failure) ---");
    writeUserState({
      id: userId,
      email: "tx@example.com",
      coinsBalance: 30,
      streakShields: 1,
    });

    req = new Request("http://localhost/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        userId,
        amount: 0,
        type: "marketplace",
        action: "buy_shield",
        useCoins: true,
      }),
    });

    res = await POST(req);
    data = await res.json();
    updatedUser = readUserState(userId);

    assert("Test 2 - Status Bad Request", res.status === 400, `Expected status 400, got ${res.status}`);
    assert("Test 2 - Error Message Correct", data.error && data.error.includes("Insufficient coins"), `Expected error 'Insufficient coins', got '${data.error}'`);
    assert("Test 2 - Coins Unchanged", updatedUser.coinsBalance === 30, `Expected balance 30, got ${updatedUser.coinsBalance}`);
    assert("Test 2 - Shield Unchanged", updatedUser.streakShields === 1, `Expected shields 1, got ${updatedUser.streakShields}`);

    // --- TEST 3: Buy Badge Certificate with 200 Coins (Success) ---
    console.log("\n--- Test 3: Buy Badge Certificate with 200 Coins (Success) ---");
    writeUserState({
      id: userId,
      email: "tx@example.com",
      coinsBalance: 200,
      streakShields: 0,
    });

    req = new Request("http://localhost/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        userId,
        amount: 0,
        type: "marketplace",
        action: "buy_badge",
        useCoins: true,
      }),
    });

    res = await POST(req);
    data = await res.json();
    updatedUser = readUserState(userId);

    assert("Test 3 - Status OK", res.status === 200, `Expected status 200, got ${res.status}`);
    assert("Test 3 - Coins Deducted", updatedUser.coinsBalance === 50, `Expected balance 50, got ${updatedUser.coinsBalance}`);

    // --- TEST 4: Buy Badge Certificate with Insufficient Coins (Failure) ---
    console.log("\n--- Test 4: Buy Badge Certificate with Insufficient Coins (Failure) ---");
    writeUserState({
      id: userId,
      email: "tx@example.com",
      coinsBalance: 100,
      streakShields: 0,
    });

    req = new Request("http://localhost/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        userId,
        amount: 0,
        type: "marketplace",
        action: "buy_badge",
        useCoins: true,
      }),
    });

    res = await POST(req);
    data = await res.json();
    updatedUser = readUserState(userId);

    assert("Test 4 - Status Bad Request", res.status === 400, `Expected status 400, got ${res.status}`);
    assert("Test 4 - Coins Unchanged", updatedUser.coinsBalance === 100, `Expected balance 100, got ${updatedUser.coinsBalance}`);

    // --- TEST 5: Purchase 50 Coins Pack ---
    console.log("\n--- Test 5: Purchase 50 Coins Pack ---");
    writeUserState({
      id: userId,
      email: "tx@example.com",
      coinsBalance: 100,
      streakShields: 0,
    });

    req = new Request("http://localhost/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        userId,
        amount: 4.99,
        type: "marketplace",
        action: "buy_coins_50",
      }),
    });

    res = await POST(req);
    data = await res.json();
    updatedUser = readUserState(userId);

    assert("Test 5 - Status OK", res.status === 200, `Expected status 200, got ${res.status}`);
    assert("Test 5 - Coins Credited", updatedUser.coinsBalance === 150, `Expected balance 150, got ${updatedUser.coinsBalance}`);

    // --- TEST 6: Purchase 200 Coins Pack ---
    console.log("\n--- Test 6: Purchase 200 Coins Pack ---");
    writeUserState({
      id: userId,
      email: "tx@example.com",
      coinsBalance: 10,
      streakShields: 0,
    });

    req = new Request("http://localhost/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        userId,
        amount: 14.99,
        type: "marketplace",
        action: "buy_coins_200",
      }),
    });

    res = await POST(req);
    data = await res.json();
    updatedUser = readUserState(userId);

    assert("Test 6 - Status OK", res.status === 200, `Expected status 200, got ${res.status}`);
    assert("Test 6 - Coins Credited", updatedUser.coinsBalance === 210, `Expected balance 210, got ${updatedUser.coinsBalance}`);

    console.log("\n------------------------------------------------");
    if (!failed) {
      console.log("🎉 SUCCESS: All 6 transaction API logic tests passed!");
    } else {
      console.error("❌ FAILURE: Some transaction tests failed.");
    }
  } catch (error) {
    console.error("Test execution error:", error);
  } finally {
    restoreBackup();
    if (failed) {
      process.exit(1);
    }
  }
}

runTests();
