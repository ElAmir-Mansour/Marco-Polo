/**
 * Validates and exports environment variables
 */

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/silkroad",
  AWS_REGION: process.env.AWS_REGION || "us-east-1",
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  V0_API_KEY: process.env.V0_API_KEY || "",
};

// Check critical variables and warn in development
if (typeof window === "undefined") {
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ DATABASE_URL is not set. Using local development default.");
  }
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY is not set. AI functions will fall back to mock templates.");
  }
  if (!process.env.V0_API_KEY) {
    console.warn("⚠️ V0_API_KEY is not set. Component generation features will be disabled.");
  }
}
