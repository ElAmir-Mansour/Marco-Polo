# Silk Road (Marco Polo) Agent Guidelines & Knowledge Base

Welcome, Agent! You are working on **Silk Road**, a B2C AI-driven learning platform built for the **Devpost Hackathon: Hack the Zero Stack with Vercel v0 and AWS Databases**.

This document lists all system requirements, design systems, architectural guidelines, database schemas, and codebase rules. **You must update this file whenever a major architectural decision, feature, or database schema change is introduced.**

---

## 🗺️ Product Overview: Silk Road
*Silk Road* is an AI-powered, interactive learning platform that transforms the journey of learning software engineering into an epic trail across historic trade routes. Users ("Travelers") undergo AI skill assessments, unlock personalized learning paths represented as "Oases" on an interactive map, maintain survival streaks through daily coding challenges, and trade knowledge in the "Great Bazaar" developer community.

### Key Monetizable B2C Features (The "Caravan" Economy)
1. **Premium Expeditions (Roadmaps)**: AI-generated, mentor-certified premium learning tracks with step-by-step interactive code challenges and curated video/article resources.
2. **AI Caravan Master (Co-pilot)**: An AI chat co-pilot that acts as a historical guide, assisting developers when they get stuck on coding challenges. Paid users get unlimited queries, mock interview evaluations, and personalized code reviews.
3. **The Caravanserai Marketplace**: A marketplace where learners can purchase custom project boilerplates, hire verified human mentors for 1-on-1 sessions, and purchase premium certification badges.
4. **Survival Streaks & Gamification**: A subscription tier that gives players detailed role IQ profiles, customized daily challenges, and enables them to save their streak if they miss a day using "Streak Shields" bought with platform coins.
5. **v0 Oasis Component Generator (Conversion Optimized)**: A premium feature leveraging the Vercel v0 Platform API, allowing travelers to generate custom styled React + Tailwind CSS code boilerplates. Offers a **1-Time Free Trial** (saved in localStorage) to convert free users to premium Nomad Explorer tiers.
6. **Caravanserai Community Tipping**: Encourages peer-to-peer knowledge sharing. Users can tip 10 Caravan Coins directly to forum posts, executing ACID relational database ledger transactions via AWS Aurora.

---

## 🛠️ Technology Stack
* Next.js 14+ (App Router) with React & TypeScript
* Vercel for Frontend Deployment & Serverless Functions
* Tailwind CSS for styling (using Custom Theme: HSL Sand/Oasis Dark Mode)
* AWS RDS Aurora (PostgreSQL Serverless v2) + Drizzle ORM (for core relational models like Profiles, Roadmaps, Bookings, Transactions)
* AWS DynamoDB (for high-throughput, low-latency metrics like User Streaks, Daily Challenge Submissions, real-time activity logs)
* Vercel AI SDK + Gemini API or OpenAI API (for Roadmap Generation, AI Guide chat, and automated code evaluation)

---

## 🎨 Design System & Aesthetics
To win the **Best Design** track, the interface must be a stunning, responsive, and immersive portal. Follow these guidelines exactly:

### Theme & Harmonious Color Palette (Desert Midnight & Neon Gold)
* **Background (Midnight Oasis)**: `#070F19` (HSL `213, 56%, 6%`) - A deep dark blue/black.
* **Panels (Oasis Indigo)**: `#0D1B2A` (HSL `210, 53%, 11%`) - Dark slate blue with slight glassmorphic backdrop filters.
* **Primary Accent (Desert Gold)**: `#D4AF37` (HSL `45, 66%, 53%`) - Rich sand/gold for primary CTAs and active states.
* **Secondary Accent (Turquoise Spring)**: `#00A896` (HSL `174, 100%, 33%`) - Vibrant teal representing water/oasis.
* **Alerts & Streaks (Flame Orange)**: `#F26419` (HSL `21, 89%, 52%`) - Warm orange for streaks, warnings, and vital elements.
* **Text Primary**: `#F4F6F8` (Off-white)
* **Text Secondary**: `#8D99AE` (Cool muted grey)

### Typography
* **Headings**: `Cinzel` or `Playfair Display` (Google Fonts) for an epic, legendary feel.
* **Body & UI**: `Outfit` or `Inter` (Google Fonts) for clean, high-tech legibility.

### Animations & Hover States
* Card hovers should raise and have a golden glow outline (`box-shadow: 0 0 15px rgba(212, 175, 55, 0.15)`).
* Interactive nodes along the learning map must pulsate smoothly.
* Streaks (Canteens) should show water wave animations using CSS keyframes.

### UI/UX Ergonomics & Hackathon Showstoppers
* **Interactive Path Traversal**: Animate a tiny caravan/camel element traversing along the custom generated SVG bezier curve path when progressing between oases.
* **Survival Hydration sync**: Streaks water level canteen height must sync dynamically with the active streak count (e.g. 0 days = dry, 7+ days = glowing gold, full).
* **Confetti Dopamine Loops**: Trigger a non-blocking particle canvas confetti cascade on correct challenge checkouts using `canvas-confetti` package.
* **Adaptive Code Workspace & Sandbox Terminal**:
  - Run all coding scripts inside an isolated browser `Web Worker` thread with a 2-second timeout termination boundary to protect against infinite loops.
  - Parse user code using `acorn.parse()` to display syntax checkpoints before executing the script.
  - Display compilation logs in a simulated UNIX black console below the editor.
* **Mobile Compass Drawers**: Collapse the chat panel into a floating Compass badge that opens as an 80%-height bottom drawer on mobile viewports.

---

## 🗄️ Database & Schema Design
To keep our application highly scalable, we partition data between RDS Aurora PostgreSQL (relational) and DynamoDB (NoSQL).

### Aurora PostgreSQL (managed via Drizzle ORM)
* **Users & Profiles**: `id`, `email`, `role`, `createdAt`, `experienceLevel`, `targetRole`.
* **Mentorship**: `id`, `mentorId`, `menteeId`, `status`, `scheduledAt`, `feedback`.
* **Payments & Ledger**: `id`, `userId`, `amount`, `currency`, `status`, `type` (subscription, marketplace, tips).
* **Roadmaps (Meta-data)**: `id`, `title`, `description`, `difficulty`, `isPremium`, `createdBy`.

### DynamoDB (High-Performance Logging)
* **Streaks**: Primary Key: `userId` (String). Attributes: `currentStreak` (Number), `maxStreak` (Number), `lastCompletedTimestamp` (String), `history` (List of dates).
* **UserProgressNode**: Primary Key: `userId_roadmapId` (String). Attributes: `completedSteps` (List of nodeIds), `currentActiveNode` (String), `lastAccessedTimestamp` (String).
* **DailyChallengeLogs**: Primary Key: `challengeId_userId` (String). Attributes: `codeSubmitted` (String), `isCorrect` (Boolean), `feedbackText` (String).

---

## 🤖 Code & Architectural Rules
1. **Directory Structure**:
   ```
   src/
   ├── app/             # Next.js App Router Pages
   ├── components/      # Reusable UI Components
   │   ├── ui/          # Core atoms (buttons, inputs, glassmorphic cards)
   │   ├── map/         # Interactive SVG/Canvas roadmap components
   │   └── chat/        # AI Caravan Master interface
   ├── lib/             # Shared utilities (db client, AI SDK setup)
   │   ├── db/          # Drizzle configuration and schema files
   │   └── aws/         # DynamoDB / AWS Clients
   └── types/           # Shared TypeScript interfaces
   ```
2. **State Management**: Use React Server Components (RSC) for data fetching where possible, and client-side states (Zustand or standard React hooks) for interactive features like the map and chat.
3. **Clean Code**: Keep functions pure and small. Extract business logic into service files (e.g. `src/lib/services/roadmap.ts`) instead of putting them directly inside API route handlers.
4. **Environment Variables**: Use `.env.local` for local secrets. **NEVER** push this file to git. Ensure variables are loaded in `src/lib/env.ts` with runtime validation.
5. **Serverless Function Duration Limits**: Overwrite default serverless timeouts for heavy AI/generative APIs by exporting `maxDuration` (e.g. `export const maxDuration = 60;` for Gemini roadmap creation, `export const maxDuration = 300;` for v0 generation).
6. **Asynchronous Generative UI**: Heavy blocking SDK integrations (such as v0 generation, taking >100 seconds) must use an asynchronous creation mode (`responseMode: "async"` and `chatPrivacy: "unlisted"`). The client initiates generation, receives a live URL, and polls a status status-checker GET route (`GET /api/v0/generate?chatId=...`) every 4 seconds to query completion.

---

## 🎬 Devpost Submission & Demo Video Guidelines

To maximize our chances of winning the **Hack the Zero Stack with Vercel v0 and AWS Databases** hackathon, we must ensure our demo video and project description strictly adhere to these criteria:

### ⏱️ Demo Video Structure (Max 3 Minutes)
1. **The Problem (~20s)** 🎯: State who the app is for, the pain it solves in a single punchy sentence. Do not waste time on logos/intros.
2. **The App in Action (~90s)** 💻: Show the application fully running. Click buttons, solve challenges, interact with the AI Caravan Master, and show live data updates. Do NOT show slides or mockups.
3. **Database Choice & Rationale (~30s)** 🗄️:
   - **AWS RDS Aurora (PostgreSQL via Drizzle ORM)**: Relational integrity is required for profiles, user onboarding status, community forum posts, transactions, and mentorship bookings.
   - **AWS DynamoDB**: High-throughput, low-latency key-value writes for gamified metrics (survival streaks, challenge logs, user progress nodes).
   - Emphasize *why* these decisions are intentional architectural choices.
4. **The "So What" (~20s)** 🚀: Who uses this? Why would they pay/rely on it? Scale potential.

### 📌 Video Content Requirements
- [ ] Clear statement of the problem and target audience.
- [ ] Live footage of the working application (no slides/wireframes).
- [ ] Explicit explanation of the AWS Database(s) used and why they fit the architecture.
- [ ] Video must be set to **Public** (YouTube/Vimeo/Youku) before submitting.

### ✍️ Submission Description Guidelines
- **No AI-generated text**: Write the project description in a genuine, human voice. Describe what we built, the engineering choices, and our journey.
- **Check audio**: Ensure clear and audible sound/voiceover. (AI Voiceover via ElevenLabs/Descript is acceptable).
- **Submit early**: Do not wait until the last minute due to processing times on YouTube.

---

## 🚀 Step-by-Step Task Checklist for Current Phase
Refer to [task.md](file:///Users/elamir/.gemini/antigravity-ide/brain/3bbd80f2-6d73-434e-95a3-bd219978ced6/task.md) and [implementation_plan.md](file:///Users/elamir/.gemini/antigravity-ide/brain/3bbd80f2-6d73-434e-95a3-bd219978ced6/implementation_plan.md) in the app brain directory for the active sprint plan.
