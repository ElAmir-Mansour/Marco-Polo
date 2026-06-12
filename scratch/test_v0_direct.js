const { v0 } = require('v0-sdk');
require('dotenv').config({ path: '.env.local' });

async function main() {
  console.log("Creating new chat with direct file inspection...");
  try {
    let client;
    if (typeof v0 === 'function') {
      client = new v0({ apiKey: process.env.V0_API_KEY });
    } else {
      client = v0;
    }

    const chat = await client.chats.create({
      message: 'Create a simple landing page button in Tailwind CSS with a desert oasis gold theme',
      system: 'You are an expert React developer who writes pristine clean code',
    });

    console.log("Chat created successfully!");
    console.log("ID:", chat.id);
    console.log("Web URL:", chat.webUrl);
    console.log("Text (description):", chat.text);
    console.log("latestVersion structure:", chat.latestVersion ? Object.keys(chat.latestVersion) : 'none');
    
    if (chat.latestVersion) {
      console.log("latestVersion.status:", chat.latestVersion.status);
      console.log("latestVersion.files keys:", chat.latestVersion.files ? Object.keys(chat.latestVersion.files) : 'none');
      if (chat.latestVersion.files) {
        console.log("Files generated in chat:");
        for (const [filename, fileObj] of Object.entries(chat.latestVersion.files)) {
          console.log(`- ${filename} (type: ${typeof fileObj}, keys: ${fileObj ? Object.keys(fileObj) : 'none'})`);
          if (fileObj && fileObj.content) {
            console.log("  Content preview:", fileObj.content.substring(0, 300) + "...");
          }
        }
      }
    }
  } catch (err) {
    console.error("v0 API Direct Test Failed:", err);
  }
}

main();
