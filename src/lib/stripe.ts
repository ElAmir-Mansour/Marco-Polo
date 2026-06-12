import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

// Initialize Stripe Client
export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-02-preview" as any, // Standard stable API version
    })
  : null;

// Pricing IDs (Replace with your actual Stripe price IDs in production)
export const STRIPE_PRICING = {
  nomadMonthly: process.env.STRIPE_NOMAD_PRICE_ID || "price_nomad_monthly_15",
  coins50: process.env.STRIPE_COINS_50_PRICE_ID || "price_coins_50_2",
  coins200: process.env.STRIPE_COINS_200_PRICE_ID || "price_coins_200_8",
};
