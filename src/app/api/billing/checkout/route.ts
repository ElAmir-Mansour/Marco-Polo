import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, transactions } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { stripe, STRIPE_PRICING } from "@/lib/stripe";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in first." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required." },
        { status: 400 }
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

    // FALLBACK: Mock Billing Simulation if Stripe is not initialized or MOCK_BILLING is enabled
    const isMock = !stripe || process.env.MOCK_BILLING === "true";

    if (isMock) {
      console.log(`[Billing Fallback] Simulating checkout for ${priceId}...`);

      const txId = "tx_" + Math.random().toString(36).substring(2, 11);

      if (priceId === STRIPE_PRICING.nomadMonthly) {
        // Upgrade to active Nomad subscriber
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await db
          .update(users)
          .set({
            subscriptionStatus: "active",
            stripeSubscriptionId: "sub_mock_" + Math.random().toString(36).substring(2, 9),
            subscriptionEndsAt: nextMonth,
            streakShields: userRecord.streakShields + 2, // Grant 2 shields
          })
          .where(eq(users.id, userRecord.id));

        await db.insert(transactions).values({
          userId: userRecord.id,
          amount: 1500, // $15.00
          type: "subscription",
          status: "completed",
        });
      } else if (priceId === "coins_50" || priceId === STRIPE_PRICING.coins50) {
        await db
          .update(users)
          .set({
            coinsBalance: userRecord.coinsBalance + 50,
          })
          .where(eq(users.id, userRecord.id));

        await db.insert(transactions).values({
          userId: userRecord.id,
          amount: 200, // $2.00
          type: "marketplace",
          status: "completed",
        });
      } else if (priceId === "coins_200" || priceId === STRIPE_PRICING.coins200) {
        await db
          .update(users)
          .set({
            coinsBalance: userRecord.coinsBalance + 200,
          })
          .where(eq(users.id, userRecord.id));

        await db.insert(transactions).values({
          userId: userRecord.id,
          amount: 800, // $8.00
          type: "marketplace",
          status: "completed",
        });
      } else {
        return NextResponse.json(
          { error: "Invalid price identifier." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        url: `${origin}/marketplace?success=true&mock=true`,
        mock: true,
      });
    }

    // Real Stripe Integration
    // Determine the billing mode
    const isSubscription = priceId === STRIPE_PRICING.nomadMonthly;
    const mode = isSubscription ? "subscription" : "payment";

    // Setup checkout options
    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${origin}/marketplace?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/marketplace?canceled=true`,
      customer_email: userRecord.email,
      metadata: {
        userId: userRecord.id,
        priceId: priceId,
      },
    };

    // If it's a subscription and customer already exists, bind it
    if (isSubscription && userRecord.stripeCustomerId) {
      delete checkoutParams.customer_email;
      checkoutParams.customer = userRecord.stripeCustomerId;
    }

    const stripeSession = await stripe!.checkout.sessions.create(checkoutParams);

    return NextResponse.json({
      url: stripeSession.url,
      mock: false,
    });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment process: " + error.message },
      { status: 500 }
    );
  }
}
