import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const body = await request.json();
    const { userId, amount, type, action, useCoins } = body; 

    if (!userId || !type) {
      return NextResponse.json({ error: "Missing transaction parameters" }, { status: 400 });
    }

    // Enforce session check to prevent BOLA/IDOR
    if (sessionData.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. You cannot execute transactions for other users." }, { status: 403 });
    }

    // Find current user balance
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userRecord) {
      return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

    // Block client-initiated coin additions
    if (action === "buy_coins_50" || action === "buy_coins_200" || action === "buy_coins_500") {
      return NextResponse.json({ error: "Forbidden. Coin additions must be initiated via Stripe checkout." }, { status: 403 });
    }

    // Process side-effects on the user profile for marketplace purchases
    if (type === "marketplace") {
      if (action === "buy_shield") {
        if (!useCoins) {
          return NextResponse.json({ error: "Forbidden. Real-money purchases must go through Stripe Checkout." }, { status: 400 });
        }
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
      } else if (action === "buy_badge") {
        if (!useCoins) {
          return NextResponse.json({ error: "Forbidden." }, { status: 400 });
        }
        if (userRecord.coinsBalance < 150) {
          return NextResponse.json({ error: "Insufficient coins. A Verified Certificate costs 150 coins." }, { status: 400 });
        }
        await db
          .update(users)
          .set({
            coinsBalance: userRecord.coinsBalance - 150,
          })
          .where(eq(users.id, userId));
      } else if (action === "book_mentor") {
        if (!useCoins) {
          return NextResponse.json({ error: "Forbidden." }, { status: 400 });
        }
        const coinsCost = Math.round(amount / 10);
        if (userRecord.coinsBalance < coinsCost) {
          return NextResponse.json({ error: `Insufficient coins. This session costs ${coinsCost} coins.` }, { status: 400 });
        }
        await db
          .update(users)
          .set({
            coinsBalance: userRecord.coinsBalance - coinsCost,
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
      status: "completed",
    }).returning();

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
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing parameter: userId" }, { status: 400 });
    }

    if (sessionData.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. You cannot view transactions for other users." }, { status: 403 });
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
