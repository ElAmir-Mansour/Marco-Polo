import { pgTable, text, timestamp, integer, pgEnum, boolean, decimal, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["traveler", "mentor", "admin"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "completed", "cancelled"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["subscription", "marketplace", "tip"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);

// 1. Users & Profiles
export const users = pgTable("users", {
  id: text("id").primaryKey(), // NextAuth/Clerk ID or UUID
  email: text("email").notNull().unique(),
  role: roleEnum("role").default("traveler").notNull(),
  experienceLevel: text("experience_level"), // beginner, intermediate, advanced
  targetRole: text("target_role"), // frontend, backend, fullstack, devops, ai
  onboardingChatState: text("onboarding_chat_state"), // JSON string representing intermediate onboarding chat context
  currentStatus: text("current_status").default("normal").notNull(), // normal, frustrated
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"), // trialing, active, past_due, canceled
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  coinsBalance: integer("coins_balance").default(0).notNull(),
  streakShields: integer("streak_shields").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Mentorship Profile details
export const mentors = pgTable("mentors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  specialization: text("specialization").notNull(), // e.g. "React, Node.js, AWS"
  hourlyRate: integer("hourly_rate").notNull(), // in USD cents
  rating: decimal("rating", { precision: 2, scale: 1 }).default("5.0"),
  bio: text("bio"),
});

// 3. Mentorship Bookings
export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  mentorId: uuid("mentor_id").references(() => mentors.id, { onDelete: "cascade" }).notNull(),
  menteeId: text("mentee_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  feedback: text("feedback"),
  meetingLink: text("meeting_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Payments Ledger
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: integer("amount").notNull(), // in cents (e.g. 1000 = $10.00)
  currency: text("currency").default("USD").notNull(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Roadmaps Metadata
export const roadmaps = pgTable("roadmaps", {
  id: text("id").primaryKey(), // e.g., "frontend-roadmap"
  title: text("title").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(), // beginner, intermediate, advanced
  isPremium: boolean("is_premium").default(false).notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Developer Forum posts
export const forumPosts = pgTable("forum_posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  authorEmail: text("author_email").notNull(),
  content: text("content").notNull(),
  sentiment: text("sentiment").default("neutral").notNull(), // positive, neutral, frustrated
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Diagnostic Skill assessments
export const assessments = pgTable("assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  trackId: text("track_id").notNull(), // e.g. "javascript", "postgresql", "react", "system_design"
  score: integer("score").notNull(), // 0 - 300 scale
  percentile: integer("percentile").notNull(), // 0 - 99 percentile
  subSkills: text("sub_skills").notNull(), // JSON string: { syntax, logic, concepts, optimization }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Verification Tokens for OTP passwordless auth
export const verificationTokens = pgTable("verification_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  token: text("token").notNull(), // Hashed 6-digit OTP code or plain during mock
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

