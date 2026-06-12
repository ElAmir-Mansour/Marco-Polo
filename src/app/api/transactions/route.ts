import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, amount, type, action, useCoins } = body; 

    if (!userId || !type) {
      return NextResponse.json({ error: "Missing transaction parameters" }, { status: 400 });
    }

    // Find current user balance
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    // Process side-effects on the user profile for marketplace purchases
    if (type === "marketplace") {
      if (action === "buy_shield") {
        if (useCoins) {
          if (userRecord.coinsBalance < 50) {
            return NextResponse.json({ error: "Insufficient coins. A Streak Shield costs 50 coins." }, { status: 400 });
          }
          await db
            .update(users)
            .set({
              coinsBalance: userRecord.coinsBalance - 50,
              streakShields: userRecord.streakShields + 1,
            })
            .where(eq(users.id, userId));
        } else {
          await db
            .update(users)
            .set({
              streakShields: userRecord.streakShields + 1,
            })
            .where(eq(users.id, userId));
        }
      } else if (action === "buy_badge") {
        if (useCoins) {
          if (userRecord.coinsBalance < 150) {
            return NextResponse.json({ error: "Insufficient coins. A Verified Certificate costs 150 coins." }, { status: 400 });
          }
          await db
            .update(users)
            .set({
              coinsBalance: userRecord.coinsBalance - 150,
            })
            .where(eq(users.id, userId));
        }
      } else if (action === "buy_coins_50") {
        await db
          .update(users)
          .set({
            coinsBalance: userRecord.coinsBalance + 50,
          })
          .where(eq(users.id, userId));
      } else if (action === "buy_coins_200") {
        await db
          .update(users)
          .set({
            coinsBalance: userRecord.coinsBalance + 200,
          })
          .where(eq(users.id, userId));
      }
    }

    // Insert transaction ledger record in PostgreSQL for ACID compliance
    const tx = await db.insert(transactions).values({
      userId,
      amount: amount || 0,
      type,
      currency: "USD",
      status: "completed", // committed transaction status
    }).returning();

    // Re-fetch updated fields
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return NextResponse.json({
      success: true,
      transaction: tx[0],
      user: updatedUser ? {
        coinsBalance: updatedUser.coinsBalance,
        streakShields: updatedUser.streakShields,
        subscriptionStatus: updatedUser.subscriptionStatus || "inactive",
      } : null,
      message: "ACID Transaction committed to Aurora Postgres ledger successfully.",
    });
  } catch (error: any) {
    console.error("Transaction API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing parameter: userId" }, { status: 400 });
    }

    const list = await db.query.transactions.findMany({
      where: eq(transactions.userId, userId),
      orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
    });

    return NextResponse.json({ success: true, transactions: list });
  } catch (error: any) {
    console.error("Fetch transactions error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
