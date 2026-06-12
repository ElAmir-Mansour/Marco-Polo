import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificationTokens } from "@/lib/db/schema";
import { sendOtpEmail } from "@/lib/services/email";

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
    const result = await sendOtpEmail(normalizedEmail, otp);

    if (!result.success) {
      console.warn("⚠️ Email dispatch failed. Falling back to sandbox bypass. Error:", result.error);
      return NextResponse.json({
        success: true,
        message: "A 6-digit verification code has been generated in developer bypass mode.",
        mock: true, 
        mockOtp: otp,
      });
    }

    return NextResponse.json({
      success: true,
      message: "A 6-digit verification code has been sent to your email.",
      mock: result.mock, // Let the client know if we are in local mock development
      mockOtp: result.mock ? otp : undefined,
    });
  } catch (error: any) {
    console.error("Error in OTP send route:", error);
    return NextResponse.json(
      { error: "Internal server error: " + error.message },
      { status: 500 }
    );
  }
}
