import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { env } from "../env";

const google = createGoogleGenerativeAI({
  apiKey: env.GEMINI_API_KEY,
});

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
  resources: {
    title: string;
    url: string;
    type: "video" | "article" | "documentation";
  }[];
  challenge: {
    question: string;
    boilerplate: string;
    solutionPattern: string; // regex pattern to validate the submission
  };
}

export interface GeneratedRoadmap {
  title: string;
  description: string;
  nodes: RoadmapNode[];
}

// Prompt template to generate roadmap
const ROADMAP_PROMPT = (role: string, level: string, interests: string[], surveyAnswers: string) => `
You are an expert curriculum builder and historical guide. Create a personalized learning path called a "Roadmap" for a user learning software engineering. 
The user is aiming to become a ${role} (${level} level). Their specific interests are: ${interests.join(", ")}. 
Here is additional survey context about their background:
${surveyAnswers}

Format the response as a single, valid JSON object with the following keys:
- "title": A creative title for the journey reflecting a historical trade route theme (e.g., "The Silk Route of frontend discovery", "The Spices of Node.js and AWS DBs").
- "description": An inspirational description matching the theme.
- "nodes": An array of learning steps (at least 4 steps) with keys:
  - "id": unique lowercase string (e.g., "node-1", "node-2")
  - "title": a themed title (e.g., "Oasis of React State")
  - "description": detailed outline of what to learn
  - "difficulty": "beginner", "intermediate", or "advanced"
  - "order": integer index starting from 1
  - "resources": list of 2 helpful public links (use real placeholders like "https://react.dev", "https://developer.mozilla.org" if not sure, but make the titles descriptive)
  - "challenge": a small coding challenge for this node, containing:
    - "question": text prompt of what JavaScript/TypeScript function to write
    - "boilerplate": starter code structure
    - "solutionPattern": a simple string keyword or regex pattern to search for in their correct submission (e.g., "map" or "filter" or "reduce")

Return ONLY the raw JSON string without any markdown formatting or backticks.
`;

export async function generatePersonalizedRoadmap(
  role: string,
  level: string,
  interests: string[],
  surveyAnswers: string
): Promise<GeneratedRoadmap> {
  if (!env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY missing. Returning mock roadmap.");
    return getMockRoadmap(role, level);
  }

  try {
    const { text } = await generateText({
      model: google("gemini-2.5-flash"),
      prompt: ROADMAP_PROMPT(role, level, interests, surveyAnswers),
      temperature: 0.2,
    });

    // Clean JSON response (strip markdown blocks if returned)
    const cleanedText = text
      .trim()
      .replace(/^```json/i, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    return JSON.parse(cleanedText) as GeneratedRoadmap;
  } catch (error) {
    console.error("AI Roadmap generation error, returning mock roadmap:", error);
    return getMockRoadmap(role, level);
  }
}

function getMockRoadmap(role: string, level: string): GeneratedRoadmap {
  return {
    title: `The Desert Caravan of ${role} Mastery`,
    description: `A customized learning path generated to take you from a ${level} level to an industry-ready engineering expert along the Silk Road.`,
    nodes: [
      {
        id: "node-1",
        title: "Oasis of Foundations",
        description: "Understand the core building blocks: syntax, loops, scope, and primitive types.",
        difficulty: "beginner",
        order: 1,
        resources: [
          {
            title: "MDN Web Docs: JavaScript basics",
            url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/JavaScript_basics",
            type: "documentation",
          },
          {
            title: "JS Basics crash course video",
            url: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
            type: "video",
          },
        ],
        challenge: {
          question: "Write a function 'sum(a, b)' that returns the sum of two numbers.",
          boilerplate: "function sum(a, b) {\n  // Write code here\n}",
          solutionPattern: "return\\s+a\\s*\\+\\s*b",
        },
      },
      {
        id: "node-2",
        title: "Caravanserai of Advanced Logic",
        description: "Master arrays, objects, map/filter methods, and basic asynchronous promises.",
        difficulty: "intermediate",
        order: 2,
        resources: [
          {
            title: "JavaScript Array Methods guide",
            url: "https://javascript.info/array-methods",
            type: "article",
          },
          {
            title: "Promises & Async/Await tutorial",
            url: "https://javascript.info/async",
            type: "documentation",
          },
        ],
        challenge: {
          question: "Write a function 'doubleArray(arr)' that returns a new array with all elements doubled.",
          boilerplate: "function doubleArray(arr) {\n  // Write code here\n}",
          solutionPattern: "map|for",
        },
      },
      {
        id: "node-3",
        title: "The Dunes of Backend Architecture",
        description: "Learn Node.js, routing, express servers, and relational schema database queries.",
        difficulty: "intermediate",
        order: 3,
        resources: [
          {
            title: "Node.js official guides",
            url: "https://nodejs.org/en/docs/guides",
            type: "documentation",
          },
        ],
        challenge: {
          question: "Create a route handler syntax placeholder returning a valid status code 200.",
          boilerplate: "function handleRequest(req, res) {\n  // Write code here\n}",
          solutionPattern: "status|send",
        },
      },
      {
        id: "node-4",
        title: "The Great Bazaar of Global Scaling",
        description: "Configure AWS DynamoDB, handle database transaction ledgers, and optimize Next.js rendering.",
        difficulty: "advanced",
        order: 4,
        resources: [
          {
            title: "AWS DynamoDB core concepts",
            url: "https://aws.amazon.com/dynamodb",
            type: "documentation",
          },
        ],
        challenge: {
          question: "Demonstrate checking query results with a simple condition 'results.length > 0'.",
          boilerplate: "function verifyResults(results) {\n  // Write code here\n}",
          solutionPattern: "length|if",
        },
      },
    ],
  };
}
