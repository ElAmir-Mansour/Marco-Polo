# 🧭 Silk Road: Full-Stack Project Documentation & Architecture Map

Welcome to the definitive architecture documentation for **Silk Road** (formerly Marcopolo). This document maps all modules, schemas, styling tokens, and API routes designed for the B2C interactive platform deployed on **Vercel** and powered by **AWS Databases** (RDS Aurora PostgreSQL + DynamoDB) and **Vercel AI SDK (Gemini)**.

---

## 🏛️ Codebase Directory Map

All source code files are organized under the following standard path layouts:

```
/Users/elamir/Desktop/Marco_Polo/
├── src/
    │   ├── app/                    # Next.js App Router (Pages & API Handlers)
    │   │   ├── api/
    │   │   │   ├── bookings/       # POST/GET Human Mentor schedule session
    │   │   │   ├── chat/           # POST Stream text to Caravan Master Chat
    │   │   │   ├── community/posts/# POST Create forum posts & run NLP sentiment checking
    │   │   │   ├── onboarding/     # POST Conversational survey logs & roadmaps
    │   │   │   ├── progress/       # GET Fetch user active progress node & streaks
    │   │   │   │   ├── complete/   # POST Validate coding solutions & increment streak
    │   │   │   │   └── review/     # POST Evaluate user code complexity with AI
    │   │   │   ├── resources/summary/ # POST Read resource content & write 30-sec summaries
    │   │   │   └── transactions/   # POST/GET Relational Ledger ACID transactions
    │   │   ├── dashboard/          # Map trail oases view, sandbox, and AI chatbot
    │   │   ├── marketplace/        # B2C purchases (shields, certificates, mentors)
    │   │   ├── onboarding/         # Conversational onboarding questionnaire UI
│   │   ├── globals.css         # Custom theme configuration & micro-anims CSS
│   │   └── layout.tsx          # Font loads & document wrapper
│   ├── components/
│   │   ├── chat/
│   │   │   └── CaravanMasterChat.tsx  # Floating Caravan Master chat panel
│   │   └── dashboard/
│   │       └── ExpeditionDashboard.tsx # Interactive map canvas & sandbox
│   ├── lib/
│   │   ├── aws/
│   │   │   └── dynamodb.ts     # NoSQL streaks, progress, & logs client
│   │   ├── db/
│   │   │   ├── index.ts        # Relational PostgreSQL pool client config
│   │   │   └── schema.ts       # Drizzle schemas (users, bookings, transactions)
│   │   ├── services/
│   │   │   └── ai-roadmap.ts   # Vercel AI SDK (Gemini) custom roadmap generator
│   │   └── env.ts              # Runtime validated environment configuration
├── drizzle.config.ts           # Drizzle migration paths configuration
├── next.config.ts              # Workspace Turbopack configuration
└── package.json                # Project dependencies map
```

---

## 🎨 Design Tokens & Custom CSS System

Styling is configured using **Tailwind CSS v4** tokens declared inside [globals.css](file:///Users/elamir/Desktop/Marco_Polo/src/app/globals.css):

### Color Tokens
- **Background (`--color-midnight`)**: `#070F19` — A dark deep-space blue representing desert midnight.
- **Panels (`--color-indigo-oasis`)**: `#0D1B2A` — Slated dark blue with a `backdrop-blur-md` glassmorphic look.
- **Primary Accent (`--color-gold-sand`)**: `#D4AF37` — A premium metallic gold for headers, active oases, and CTAs.
- **Secondary Accent (`--color-teal-spring`)**: `#00A896` — A vibrant turquoise representing refreshing water spring.
- **Alerts & Streaks (`--color-orange-flame`)**: `#F26419` — Warm flame orange for survival streak badges and alerts.

### CSS Keyframe Animations
1. **Oasis Pulse (`.oasis-pulse`)**: Pulsates turquoise shadows to highlight active learning nodes:
   ```css
   @keyframes pulsate {
     0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 168, 150, 0.7); }
     70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(0, 168, 150, 0); }
     100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 168, 150, 0); }
   }
   ```
2. **Survival Canteen Wave (`.water-wave`)**: Renders rotating water wave elements to represent current hydration levels:
   ```css
   @keyframes wave {
     0% { transform: translate(-50%, -70%) rotate(0deg); }
     100% { transform: translate(-50%, -70%) rotate(360deg); }
   }
   ```

---

## 🗄️ Relational & NoSQL Database Schema Architecture

### AWS Aurora PostgreSQL (via Drizzle ORM)
Handles critical payment ledgers, mentor schedules, and accounts:
- **`users`**: Registers travelers, experience ranks, target destinations.
- **`mentors`**: Registers expert caravanners, specialization keywords, hourly pricing (in cents), reviews.
- **`bookings`**: Schedules interactive hours, booking states (pending, verified), and video connection rooms.
- **`transactions`**: Ledger recording B2C checkouts (subscriptions, marketplace coins, streak shield purchases).
- **`roadmaps`**: Meta information on available learning paths.

### AWS DynamoDB (via AWS SDK Client)
Logs high-frequency progression logs:
- **`UserStreaks`**: Keeps current streaks (canteen levels), peak streaks, and completion histories list.
- **`UserProgress`**: Tracks completed node IDs list, active nodes, and serialized learning materials.
- **`DailyChallengeLogs`**: Audit logging of code submissions, accuracy, and feedback context.

> [!TIP]
> **Local Memory Fallback**: If AWS or Postgres credentials are not set locally in `.env.local`, the application falls back gracefully to in-memory mock repositories (`src/lib/aws/dynamodb.ts` & `src/lib/db/index.ts`) allowing rapid local testing without server credentials.

---

## 🤖 AI Custom Prompting & Stream Services

### 1. Curriculum Trail Generation ([ai-roadmap.ts](file:///Users/elamir/Desktop/Marco_Polo/src/lib/services/ai-roadmap.ts))
Instructs the Google Generative AI (Gemini model `gemini-2.5-flash`) via **Vercel AI SDK** to generate structured JSON oases:
```typescript
const ROADMAP_PROMPT = (role, level, interests, answers) => `
You are an expert curriculum builder and historical guide. Create a personalized learning path called a "Roadmap" for a user learning software engineering. 
The user is aiming to become a ${role} (${level} level). Their specific interests are: ${interests.join(", ")}. 
...
Return a valid JSON object containing title, description, and list of nodes.
`;
```

### 2. Dialogue Tutoring Co-Pilot ([route.ts](file:///Users/elamir/Desktop/Marco_Polo/src/app/api/chat/route.ts))
The "AI Caravan Master" streams response text using `streamText` to guide travelers stuck in sand coding challenges:
```typescript
const SYSTEM_PROMPT = (role, level, nodeTitle) => `
You are the "AI Caravan Master", a legendary software engineer.
...
CRITICAL BEHAVIORAL RULE:
- NEVER give the user the direct source code solution to their challenges.
- Always guide them with conceptual explanations, pseudo-code hints, or syntax callouts.
`;
```

---

## 🧪 Testing and Verification Suite

### Automated Compilation check
The project undergoes strict typescript checks and compilation tasks using:
```bash
npm run build
```
Which compiles pages, routes, and validates types with Turbopack.

### Logic Assertions Verification
Unit tests are written to verify the date-dependent user streak calculation algorithm. You can execute them by running:
```bash
node /Users/elamir/.gemini/antigravity-ide/scratch/test_streak.js
```
The suite verifies:
1. First daily coding completion triggers +1 streak.
2. Duplicate completions on the same day maintain the streak without double-counting.
3. Completion on consecutive days increments the streak.
4. Gaps greater than 1 day reset the streak back to 1.

---

## 🐫 Phase 2 Interactive Sandbox & Motion Upgrades

We upgraded the learning trail interface and sandbox compiling engines to professional software engineering standards:

### 1. SVG Bezier Trail & Bobbing Caravan
- Map trails are drawn using SVG Cubic Bezier paths connecting coordinates dynamically generated based on active nodes index sizes.
- Traversed segments render in a refreshing turquoise-to-gold gradient stroke (`#00A896` to `#D4AF37`), leaving unreached segments show dotted gold tracks.
- A custom-bobbing Camel Caravan SVG container sits at the active node coordinates, moving smoothly on transitions.

### 2. Canteen Streak Hydration Sync
- Canteen water waves height scales dynamically (10% to 100%) to match the user's active streak count.
- At 7+ days, the canteen gains a glowing gold panel shadow and rapid waves.

### 3. Confetti Dopamine Cascades
- Solver checkpoints trigger canvas-confetti particle explosions in thematic colors.

### 4. Acorn AST Parser & Isolated Web Worker execution
- Placed code checks inside an AST parser using `acorn` to verify syntactic structural correctness.
- Code runs inside an isolated browser `Web Worker` container matching expected assertion test cases (e.g. `sum(2,3) === 5`).
- Workers enforce a strict `2000ms` execution timeout barrier protecting tab threads from freeze loops.

### 5. UNIX Sandbox Terminal Console
- Sandbox evaluation results print dynamically to a styled black terminal console, providing compile steps feedback.

### 6. Mobile Layout Compass Drawer
- Responsive layouts collapse sidebar chat panels into floating message triggers, which open bottom-sheet drawers covering 80% screen height when clicked.

---

## 🐫 Phase 3 B2C AI Companion & Forums Upgrade

We upgraded the application with premium interactive B2C AI features and an integrated community forum:

### 1. Conversational Adaptive Onboarding
- Replaced static onboarding forms with an interactive, step-by-step chat experience at `/onboarding`.
- Users chat with the AI caravan master, who evaluates background experience, goals, and interests.
- State is serialized and saved to PostgreSQL step-by-step, allowing recovery on refreshes.

### 2. Real-Time Agentic Code Reviewer
- Runs static syntax checks, regex checks, worker container assertions, and triggers the AI Reviewer (`/api/progress/review`).
- Provides feedback on Big O performance complexity, code readability, styling mistakes, and security concerns directly below the console.

### 3. NLP Frustration Detector & Community Forum
- Enabled the Caravanserai Community Board inside the dashboard, letting users post software questions.
- A built-in NLP keyword filter scans for high-frustration phrases. When detected, the user is flagged as `frustrated`.
- Flagging triggers a personalized **Caravan Guide Intervention Banner** offering path simplification or 1-on-1 mentor booking discounts.

### 4. AI-Generated Micro-Learning Summaries
- Allows users to request instant 30-second bulleted summaries of study resources directly from the learning path oases, using Gemini to read and extract key concepts.

### 5. Spotlight Walkthrough Tour & Server Onboarding Deduplication
- **Dynamic SVG Mask Spotlight**: Replaced standard CSS highlights with a viewport-relative fullscreen SVG mask (`fill-rule="evenodd"`) that dims and blurs background elements while leaving the targeted panel perfectly clear and bright.
- **Responsive Viewport Trackers**: Tracked highlighted elements using custom resize and scroll handlers throttled with `requestAnimationFrame`. Automatically scroll target panels (like the SVG trail map and sandbox) into view.
- **Smart Tooltip Alignment**: Position tour card guides dynamically relative to the highlighted rectangles, including bounds check padding to prevent off-screen clipping.
- **Onboarding Cleanup Filter**: Implemented a server-side cleanup filter in `/api/onboarding` that removes consecutive duplicate assistant welcome messages from active chat logs.

---

## 🐫 Phase 5 Skill IQ & Role IQ Assessment Center

We built a diagnostic test system matching the Pluralsight specification to measure and plot student capabilities:

### 1. Relational Assessment Ledger
- Designed the `assessments` schema table mapping scores (0 - 300), percentiles, and dynamic sub-skill levels.
- Proxied all database commands to write and sync diagnostic results directly into `in-memory-db.json` when offline.

### 2. Timed Assessment Test Runner
- Implemented a timed test screen matching JavaScript, React UI, PostgreSQL databases, and System Design tracks.
- Uses a circular SVG progress countdown clock ticking down from 15 seconds. If the user times out, it automatically registers the question and transitions.

### 3. High-Fidelity SVG Charts
- **Role IQ Radar Chart**: Draws a responsive, zero-dependency SVG spider radar chart plotting traveler strengths. Connector nodes bounce and pulse with a teal border glow.
- **Bell Curve Score Graph**: Draws a normal distribution curve showing global users distribution, with the traveler's score plotted on the curve with a glowing gold marker.
- **Horizontal sub-skills profiles**: Bar charts monitoring syntax, logic, concepts, and speed.

### 4. Dynamic Learning Path Optimization
- Once completed, the scoring route evaluates the performance. If they score above average, it connects to their active learning trail (DynamoDB UserProgress) and auto-completes/skips basic foundational oases nodes, letting them leap straight to advanced segments.

---

## 🐫 Phase 6 Comprehensive UI/UX Overhaul & Enhancements

We implemented a full-scale user interface and experience overhaul to elevate the platform to a B2C premium product standard:

### 1. Scroll-Synced JavaScript Sandbox Gutter
- Designed a zero-dependency double-column editor container in [ExpeditionDashboard.tsx](file:///Users/elamir/Desktop/Marco_Polo/src/components/dashboard/ExpeditionDashboard.tsx).
- Automatically maps textarea vertical scroll positioning (`scrollTop`) into React state, shifting a left-aligned line-numbers gutter in perfect unison.
- Enforced unified line-height (`leading-5`, `20px`) and vertical padding (`py-4`) metrics to prevent line alignment drift.

### 2. macOS Window Header & Retro CRT Sandbox Console
- Prepend red, yellow, and green window dots to Sandbox Terminal header, giving it a macOS/UNIX command line feel.
- Infused retro CRT monitor scanlines to console backgrounds through the `.terminal-overlay` linear-gradient rules inside [globals.css](file:///Users/elamir/Desktop/Marco_Polo/src/app/globals.css#L134-L149).
- Color-coded compile/syntax steps dynamically, prepending lines with standard CLI shell prompts (`$>`).

### 3. Dialogue Speech Balloon Chat Advisor & Glass Pebbles
- Overhauled conversational logs in [CaravanMasterChat.tsx](file:///Users/elamir/Desktop/Marco_Polo/src/components/chat/CaravanMasterChat.tsx) with rounded speech balloons containing custom micro-directional triangle pointers (`.speech-pointer-left` and `.speech-pointer-right`).
- Designed round avatar wrappers with rotating compass icons for the Caravan Master and custom initials circles for travelers.
- Styled query recommendation chips to persist at all times when not loading, rendered as glass-pebble buttons.

### 4. Learning Path Locks & Resource Type Icons
- Replaced plain index numbering with `Lock` symbols on locked map oases nodes, cleaning up the visual trail progression.
- Prepend study cards with Play, BookOpen, and FileText Lucide icons based on study types (video, article, docs).
- Overhauled Caravanserai Community Forum boards with custom author initials avatar circles and distress accents (thick flame-orange left border triggers).

### 5. Client-Side Synthesized Audio Engine & Ambient Windscapes
- Developed a high-fidelity client-side audio synthesizer service in [audio.ts](file:///Users/elamir/Desktop/Marco_Polo/src/lib/services/audio.ts) utilizing the Web Audio API.
- Generates looping ambient windscapes using lowpass-filtered white noise buffer sources modulated by a slow-frequency LFO, layered with resonant whistle filters representing desert wind howling.
- Integrates zero-latency tactile sound effects:
  - Oases Node Click: Metallic coin resonance using high-frequency oscillator combinations.
  - Compile Success: Spacer C-Major bell chime arpeggio routed through feedback DelayNodes.
  - Compile Failure: Heavy wooden thud generated via pitch-decay sweep and lowpass noise burst.
  - Chat Dialogue Rustle: Paper rustle sweep via bandpass-filtered noise bursts.
- Added an interactive speaker mute toggle in the main dashboard header, syncing mute preferences to `localStorage`.
