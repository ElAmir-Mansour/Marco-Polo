import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { stripe } from "@/lib/stripe";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in first." },
        { status: 401 }
      );
    }

    const origin = request.headers.get("origin") || "http://localhost:3000";

    // Find the user record
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, sessionData.userId),
    });

    if (!userRecord) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    const isMock = !stripe || process.env.MOCK_BILLING === "true" || !userRecord.stripeCustomerId;

    if (isMock) {
      console.log(`[Billing Portal Fallback] Simulating billing portal for user ${userRecord.id}...`);
      
      // If we are simulation cancelling a subscription in mock mode
      const { cancelMock } = await request.json().catch(() => ({ cancelMock: false }));
      
      if (cancelMock) {
        await db
          .update(users)
          .set({
            subscriptionStatus: "canceled",
            subscriptionEndsAt: new Date(), // Expires immediately for demo clarity
          })
          .where(eq(users.id, userRecord.id));

        return NextResponse.json({
          url: `${origin}/marketplace?portal_success=canceled`,
          mock: true,
        });
      }

      return NextResponse.json({
        url: `${origin}/marketplace?portal_success=opened`,
        mock: true,
      });
    }

    // Real Stripe Billing Portal Session
    const portalSession = await stripe!.billingPortal.sessions.create({
      customer: userRecord.stripeCustomerId!,
      return_url: `${origin}/marketplace`,
    });

    return NextResponse.json({
      url: portalSession.url,
      mock: false,
    });
  } catch (error: any) {
    console.error("Error creating billing portal session:", error);
    return NextResponse.json(
      { error: "Failed to open subscription manager: " + error.message },
      { status: 500 }
    );
  }
}
