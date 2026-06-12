import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_SECRET = process.env.SESSION_SECRET || "silkroad-desert-caravan-secret-key-32chars";
const COOKIE_NAME = "silkroad_session";

export interface SessionData {
  userId: string;
  email: string;
  role: string;
}

export function encryptSession(data: SessionData): string {
  const text = JSON.stringify(data);
  // Using AES-256-GCM with a static IV for simple serverless stateless tokenization
  const key = Buffer.from(SESSION_SECRET.padEnd(32).slice(0, 32));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const tag = cipher.getAuthTag().toString("hex");
  
  // Return token: iv.hex_encrypted.tag
  return `${iv.toString("hex")}.${encrypted}.${tag}`;
}

export function decryptSession(token: string): SessionData | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], "hex");
    
    const key = Buffer.from(SESSION_SECRET.padEnd(32).slice(0, 32));
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    return JSON.parse(decrypted) as SessionData;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie) return null;
  return decryptSession(sessionCookie.value);
}

export async function setSession(data: SessionData) {
  const token = encryptSession(data);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
