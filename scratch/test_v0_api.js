const { v0 } = require('v0-sdk');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log("Initializing v0 API...");
  console.log("V0_API_KEY present:", !!process.env.V0_API_KEY);
  try {
    // If v0 is a class/constructor:
    let client;
    if (typeof v0 === 'function') {
      console.log("v0 is a class/function. Creating instance...");
      client = new v0({ apiKey: process.env.V0_API_KEY });
    } else {
      console.log("v0 is an object. Using directly...", typeof v0);
      client = v0;
    }

    console.log("Creating chat request to generate a simple component...");
    const chat = await client.chats.create({
      message: 'Create a simple landing page button in Tailwind CSS with an oasis sand color theme',
      system: 'You are an expert React developer who writes pristine clean code',
    });

    console.log("Chat created successfully!");
    console.log("Web URL:", chat.webUrl);
    console.log("ID:", chat.id);
    console.log("Full chat object structure:", Object.keys(chat));
  } catch (err) {
    console.error("v0 API Test Failed:", err);
  }
}

main();
