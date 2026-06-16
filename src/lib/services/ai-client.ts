import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../env";

// Helper to get all API keys from the comma-separated env variable
const getGeminiKeys = (): string[] => {
  const rawKeys = env.GEMINI_API_KEY || "";
  return rawKeys
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
};

// Counter to perform round-robin rotation
let keyIndex = 0;

/**
 * Returns a configured Google Generative AI client instance with rotated API keys.
 * This dynamically switches API keys on subsequent calls to distribute requests 
 * and avoid rate limit (429) errors.
 */
export function getGoogleClient() {
  const keys = getGeminiKeys();
  if (keys.length === 0) {
    console.warn("⚠️ No GEMINI_API_KEY found. Using empty key or mock fallback.");
    return createGoogleGenerativeAI({ apiKey: "" });
  }

  // Get next API key using round-robin rotation
  const selectedKey = keys[keyIndex % keys.length];
  keyIndex++;

  return createGoogleGenerativeAI({
    apiKey: selectedKey,
  });
}
