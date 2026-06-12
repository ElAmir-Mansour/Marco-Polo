require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

async function sendTest() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "eu-north-1";

  const client = new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  const command = new SendEmailCommand({
    Source: "xxamirxx00@gmail.com",
    Destination: {
      ToAddresses: ["xxamirxx00@gmail.com"]
    },
    Message: {
      Subject: { Data: "Test from Silk Road AWS SES", Charset: "UTF-8" },
      Body: {
        Html: { Data: "<h1>It Works!</h1><p>This is a test email sent from AWS SES.</p>", Charset: "UTF-8" }
      }
    }
  });

  try {
    const response = await client.send(command);
    console.log("SUCCESS! MessageId:", response.MessageId);
  } catch (err) {
    console.error("FAILED to send via SES:", err);
  }
}

sendTest();
