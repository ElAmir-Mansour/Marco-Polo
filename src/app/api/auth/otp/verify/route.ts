import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificationTokens, users } from "@/lib/db/schema";
import { setSession } from "@/lib/session";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanToken = token.trim();

    // 1. Find the token details
    const tokenRecord = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.email, normalizedEmail),
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: "No active verification requests found. Please request a new code." },
        { status: 404 }
      );
    }

    // 2. Check if expired
    if (Date.now() > tokenRecord.expiresAt.getTime()) {
      await db.delete(verificationTokens).where(eq(verificationTokens.email, normalizedEmail));
      return NextResponse.json(
        { error: "Verification code expired. Please request a new code." },
        { status: 400 }
      );
    }

    // 3. Check attempts
    if (tokenRecord.attempts >= 3) {
      await db.delete(verificationTokens).where(eq(verificationTokens.email, normalizedEmail));
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // 4. Verify code
    if (tokenRecord.token !== cleanToken) {
      // Increment attempts
      await db
        .update(verificationTokens)
        .set({ attempts: tokenRecord.attempts + 1 })
        .where(eq(verificationTokens.email, normalizedEmail));

      return NextResponse.json(
        { error: `Invalid verification code. Attempts remaining: ${2 - tokenRecord.attempts}` },
        { status: 400 }
      );
    }

    // 5. Code is correct! Clean up token record
    await db.delete(verificationTokens).where(eq(verificationTokens.email, normalizedEmail));

    // 6. Find or create user
    let userRecord = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    let isNewUser = false;
    if (!userRecord) {
      isNewUser = true;
      const newUserId = "usr_" + Math.random().toString(36).substring(2, 11);
      
      await db.insert(users).values({
        id: newUserId,
        email: normalizedEmail,
        role: "traveler",
        coinsBalance: 100, // Gift 100 coins to kickstart their caravan
        streakShields: 0,
      });

      userRecord = await db.query.users.findFirst({
        where: eq(users.email, normalizedEmail),
      });
    }

    if (!userRecord) {
      return NextResponse.json(
        { error: "Failed to establish user account. Please try again." },
        { status: 500 }
      );
    }

    // 7. Establish secure session
    await setSession({
      userId: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        coinsBalance: userRecord.coinsBalance,
        streakShields: userRecord.streakShields,
      },
      isNewUser,
      message: "Authentication successful.",
    });
  } catch (error: any) {
    console.error("Error in OTP verify route:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
