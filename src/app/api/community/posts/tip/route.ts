import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const { postId, authorId, tipperId } = await request.json();

    if (!postId || !authorId || !tipperId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (sessionData.userId !== tipperId) {
      return NextResponse.json({ error: "Forbidden. You cannot execute transactions for other users." }, { status: 403 });
    }

    if (tipperId === authorId) {
      return NextResponse.json({ error: "🐫 You cannot tip your own scroll, traveler!" }, { status: 400 });
    }

    // Execute within a single relational transaction for ACID compliance (AWS Aurora)
    const result = await db.transaction(async (tx) => {
      // 1. Fetch tipper balance
      const tipper = await tx.query.users.findFirst({
        where: eq(users.id, tipperId),
      });

      if (!tipper) {
        throw new Error("Tipper profile not found.");
      }

      if (tipper.coinsBalance < 10) {
        throw new Error("Insufficient Caravan Coins. Refill your purse at the Great Bazaar!");
      }

      // 2. Fetch post author profile
      const author = await tx.query.users.findFirst({
        where: eq(users.id, authorId),
      });

      if (!author) {
        throw new Error("Author profile not found.");
      }

      // 3. Deduct 10 coins from tipper
      const updatedTipper = await tx
        .update(users)
        .set({ coinsBalance: tipper.coinsBalance - 10 })
        .where(eq(users.id, tipperId))
        .returning();

      // 4. Credit 10 coins to author
      await tx
        .update(users)
        .set({ coinsBalance: author.coinsBalance + 10 })
        .where(eq(users.id, authorId));

      // 5. Insert ledger record for the transaction
      const logEntry = await tx
        .insert(transactions)
        .values({
          userId: tipperId,
          amount: -10, // -10 coin debit
          type: "tip",
          status: "completed",
        })
        .returning();

      return {
        tipperBalance: updatedTipper[0].coinsBalance,
        logEntry: logEntry[0],
      };
    });

    return NextResponse.json({
      success: true,
      message: "Tipped 10 Caravan Coins successfully!",
      newBalance: result.tipperBalance,
    });
  } catch (error: any) {
    console.error("Tip post API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
