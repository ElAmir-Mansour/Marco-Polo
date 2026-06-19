# 🎬 Winning Demo Video Recording & Script Guide

This guide outlines the recording setup, chronological video structure, screen walkthrough sequence, and design highlights to help record a winning 3-minute demo video for the **H0: Hack the Zero Stack with Vercel v0 and AWS Databases** hackathon.

---

## 🎙️ 1. Screen Recording & Audio Setup

* **Recording Software**: Use **OBS Studio** (free, offline), **Loom** (fast sharing), or **Camtasia/Screenflow** (supports zoom-ins).
* **Resolution**: Record in **1080p (16:9 ratio)**. Avoid recording on an ultra-wide monitor, as text will become unreadable on standard players.
* **Audio Quality**: Use a dedicated headset or external microphone. Record in a quiet room to eliminate echo and background noise.
* **Tactile Sounds**: Keep your computer system audio enabled so the browser's Web Audio synthesizer (windscapes, compiler chimes, and coin sound effects) is recorded.

---

## ⏱️ 2. Chronological 3-Minute Video Structure

Judges do not watch past 3 minutes. Keep the pacing tight and energetic:

| Time | Segment | Visual Action | Voiceover Focus |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:20** | **1. The Hook & The Problem** | Start on the Landing Page. Click **Focus System Map** to show 3D WebGL stars, then click **Start Onboarding Trail**. | State the problem in a single sentence: static tutorials are boring, and developers are overloaded with disjointed tools. Introducing Silk Road. |
| **0:20 - 0:50** | **2. Diagnostic Onboarding** | Enter `judge@devpost.com` and use bypass code `123456` to log in instantly. Complete the onboarding questionnaire and show the SVG timed **Radar Chart** + **Bell Curve**. | "Travelers start with an adaptive AI onboarding questionnaire and a timed diagnostic test. Scores are plotted on SVG charts, automatically skipping basic oases for advanced users." |
| **0:50 - 1:40** | **3. The Map & Code Sandbox** | Show the SVG Bezier curves map. Click a node, open **AI Summary**. Scroll to the sandbox, write bad code (trigger thud sound), open the Caravan Master chat drawer for a hint, then paste correct code (confetti + chime sound + canteen wave level rise). | "Routes are drawn using dynamic SVG Bezier paths. Travelers code inside a synced scroll sandbox. Scripts run in isolated Web Workers, and the Caravan Master chat streams conceptual hints." |
| **1:40 - 2:30** | **4. Marketplace, Tips & v0** | Go to Marketplace, buy a shield. Go to Forum, click **Tip 10 Coins** (trigger coin chime sound). Open the v0 Generator, show async loading, and load code into editor. | "Travelers purchase shields or book mentors in the Bazaar. Forums encourage tipping, executing secure ACID ledger transactions in AWS PostgreSQL. We poll v0 asynchronously to bypass serverless timeouts." |
| **2:30 - 3:00** | **5. Architecture & Closing** | Show the Mermaid Application Architecture Diagram in the README.md file. | "We partitioned our stack: AWS RDS Aurora PostgreSQL for transactional ledger integrity, AWS DynamoDB for fast gamified streaks telemetry, and Vercel with Gemini to orchestrate the journey. Thank you!" |

---

## 🐫 3. Click-by-Click Recording Playbook

Follow this sequence to ensure a smooth, error-free recording session:

1. **Pre-load data**:
   - Clear your browser local storage (`localStorage.clear()`) so onboarding and the spotlight walkthrough tour start fresh.
   - Have a working JavaScript snippet ready in your clipboard to solve the first challenge quickly.

2. **Start recording**:
   - Start on `/` (landing page). Ensure the audio is unmuted in the header settings.
   - Click the **Focus System Map** button.
   - Click **Start Journey** to navigate to `/onboarding`.

3. **Demonstrate Login & Onboarding**:
   - Type `judge@devpost.com` and click **Start**.
   - Input the bypass code `123456`.
   - Select "Web Developer", "Intermediate", type "Next.js", and click Submit.
   - Click through the diagnostic questions, show the Radar Chart results, and click **Begin Expedition**.

4. **Demonstrate Map Trail & Sandbox**:
   - Click the first highlighted Oasis node. Tap **AI Summary** to generate the micro-summary.
   - Click **Open Sandbox** to scroll down.
   - Type invalid code and hit Run (Wooden thud sound plays).
   - Click the floating compass chat button, slide up the chat drawer, and show Marco Polo's hint.
   - Paste the correct solution, hit Run (C-Major chime plays, confetti explodes, and the Canteen Widget water wave rises).

5. **Demonstrate Bazaar & Community Forum**:
   - Navigate to `/marketplace`. Buy a **Streak Shield**.
   - Open the **Forum** inside the dashboard. Click **Tip 10 Coins** on a post (coin resonance sound plays).
   - Open the v0 modal, click **Activate Free Trial**, show the async loading wheel, and click **Load Into Sandbox**.

6. **Show Architecture Diagram**:
   - Navigate to your repository README.md, scroll to the Mermaid Diagram, and finish with a strong closing pitch.

---

## 💡 4. Top Pitch Presentation Tips

* **No Slide Intros**: Do not waste time on logo screens, slides, or introductions. Start showing the live app from the first second.
* **Emphasize Database Rationale**: Explain *why* the database choices are intentional. AWS Aurora PostgreSQL guarantees ACID transactions for tipping and coin ledgers, while AWS DynamoDB handles low-latency, high-frequency writes for user streaks and progress telemetry.
* **Aesthetics Matter**: Highlight the custom theme (Desert Midnight `#070F19` and Neon Gold `#D4AF37`), the Web Audio engine, and the responsive layouts.
