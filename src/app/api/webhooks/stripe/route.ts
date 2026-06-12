import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, transactions } from "@/lib/db/schema";
import { stripe, STRIPE_PRICING } from "@/lib/stripe";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe integration is disabled." },
      { status: 400 }
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      // In local development without webhook secret, we skip signature checks for ease of mock testing
      event = JSON.parse(payload) as Stripe.Event;
    }
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const priceId = session.metadata?.priceId;

        if (!userId) {
          console.warn("[Stripe Webhook] No userId found in session metadata.");
          break;
        }

        // Save Customer ID on user record
        const customerId = session.customer as string;
        if (customerId) {
          await db
            .update(users)
            .set({ stripeCustomerId: customerId })
            .where(eq(users.id, userId));
        }

        // Record Ledger transaction
        const amountTotal = session.amount_total || 0;
        await db.insert(transactions).values({
          userId: userId,
          amount: amountTotal,
          type: session.mode === "subscription" ? "subscription" : "marketplace",
          status: "completed",
        });

        // If it's a one-off coin purchase checkout, credit the user coins
        if (session.mode === "payment") {
          const userRecord = await db.query.users.findFirst({
            where: eq(users.id, userId),
          });
          if (userRecord) {
            let coinsToCredit = 0;
            if (priceId === STRIPE_PRICING.coins50) coinsToCredit = 50;
            else if (priceId === STRIPE_PRICING.coins200) coinsToCredit = 200;

            if (coinsToCredit > 0) {
              await db
                .update(users)
                .set({ coinsBalance: userRecord.coinsBalance + coinsToCredit })
                .where(eq(users.id, userId));
              console.log(`[Stripe Webhook] Credited user ${userId} with ${coinsToCredit} coins.`);
            }
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const userRecord = await db.query.users.findFirst({
          where: eq(users.stripeCustomerId, customerId),
        });

        if (!userRecord) {
          console.warn(`[Stripe Webhook] No user found with stripeCustomerId: ${customerId}`);
          break;
        }

        const endsAt = new Date(subscription.current_period_end * 1000);
        const prevStatus = userRecord.subscriptionStatus;
        const nextStatus = subscription.status;

        // Update database
        await db
          .update(users)
          .set({
            subscriptionStatus: nextStatus,
            stripeSubscriptionId: subscription.id,
            subscriptionEndsAt: endsAt,
            // If user has upgraded from normal/inactive to active subscription, grant their 2 monthly shields
            streakShields:
              prevStatus !== "active" && nextStatus === "active"
                ? userRecord.streakShields + 2
                : userRecord.streakShields,
          })
          .where(eq(users.id, userRecord.id));

        console.log(`[Stripe Webhook] Synced subscription ${subscription.id} (Status: ${nextStatus}) for user ${userRecord.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;

        // Find user by customer ID
        const userRecord = await db.query.users.findFirst({
          where: eq(users.stripeCustomerId, customerId),
        });

        if (userRecord) {
          await db
            .update(users)
            .set({
              subscriptionStatus: "canceled",
            })
            .where(eq(users.id, userRecord.id));
          console.log(`[Stripe Webhook] Terminated subscription for user ${userRecord.id}`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Error executing Stripe webhook task:", error);
    return NextResponse.json(
      { error: "Webhook handler failed: " + error.message },
      { status: 500 }
    );
  }
}
