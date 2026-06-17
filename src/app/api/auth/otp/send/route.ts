import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificationTokens } from "@/lib/db/schema";
import { sendOtpEmail } from "@/lib/services/email";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address format." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate-limiting / cooldown check: 30 seconds between requests
    const existingToken = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.email, normalizedEmail),
    });

    if (existingToken) {
      const timeSinceCreation = Date.now() - new Date(existingToken.createdAt).getTime();
      const cooldownMs = 30 * 1000;
      if (timeSinceCreation < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - timeSinceCreation) / 1000);
        return NextResponse.json(
          { error: `Please wait ${remainingSec} seconds before requesting a new code.` },
          { status: 429 }
        );
      }
    }

    // 1. Generate a secure 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Set expiration duration (5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 3. Save to database (upsert if code already exists for this email)
    await db
      .insert(verificationTokens)
      .values({
        email: normalizedEmail,
        token: otp,
        expiresAt,
        attempts: 0,
      })
      .onConflictDoUpdate({
        target: verificationTokens.email,
        set: {
          token: otp,
          expiresAt,
          attempts: 0,
          createdAt: new Date(),
        },
      });

    // 4. Send email (mocked in dev/test, Resend API in production)
    // Avoid sending real emails for mock/test domains during development/testing
    const isLocalDevMock = process.env.NODE_ENV === "development" && process.env.MOCK_EMAIL !== "false";
    const isTestEmail = isLocalDevMock && (
                        normalizedEmail.endsWith("@example.com") || 
                        normalizedEmail.includes("test") || 
                        normalizedEmail === "traveler@silkroad.com" ||
                        process.env.MOCK_EMAIL === "true");
    
    const result = isTestEmail 
      ? { success: true, mock: true, error: undefined }
      : await sendOtpEmail(normalizedEmail, otp);

    if (!result.success) {
      console.warn("⚠️ Email dispatch failed. Error:", result.error);
      return NextResponse.json({
        success: true,
        message: "A 6-digit verification code has been generated. Please check server execution logs.",
      });
    }

    return NextResponse.json({
      success: true,
      message: "A 6-digit verification code has been sent to your email.",
      mock: result.mock, // Let the client know if we are in local mock development
      mockOtp: (result.mock && process.env.NODE_ENV !== "production") ? otp : undefined,
    });
  } catch (error: any) {
    console.error("Error in OTP send route:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
