const { v0 } = require('v0-sdk');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const chatId = 'k7NqZ9e';
  console.log(`Fetching chat details for ${chatId}...`);
  try {
    let client;
    if (typeof v0 === 'function') {
      client = new v0({ apiKey: process.env.V0_API_KEY });
    } else {
      client = v0;
    }

    const chat = await client.chats.getById({ chatId });
    console.log("Success!");
    console.log("Chat Keys:", Object.keys(chat));
    console.log("Status:", chat.status);
    console.log("latestVersion structure:", chat.latestVersion ? Object.keys(chat.latestVersion) : 'none');
    if (chat.latestVersion) {
      console.log("latestVersion.status:", chat.latestVersion.status);
      console.log("latestVersion.files keys:", chat.latestVersion.files ? Object.keys(chat.latestVersion.files) : 'none');
      if (chat.latestVersion.files) {
        console.log("Files generated in chat:");
        for (const [filename, fileObj] of Object.entries(chat.latestVersion.files)) {
          console.log(`- ${filename} (type: ${typeof fileObj}, keys: ${fileObj ? Object.keys(fileObj) : 'none'})`);
          if (fileObj && fileObj.content) {
            console.log("  Content preview:", fileObj.content.substring(0, 200) + "...");
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch chat:", err);
  }
}

main();
