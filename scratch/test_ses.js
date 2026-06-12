require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });
const { SESClient, ListIdentitiesCommand } = require("@aws-sdk/client-ses");

async function checkRegion(region) {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  const client = new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  try {
    const response = await client.send(new ListIdentitiesCommand({}));
    if (response.Identities && response.Identities.length > 0) {
      console.log(`Region ${region}: SUCCESS - Verified Identities:`, response.Identities);
      return true;
    } else {
      console.log(`Region ${region}: No verified identities.`);
    }
  } catch (err) {
    console.error(`Region ${region}: FAILED -`, err.message);
  }
  return false;
}

async function checkAll() {
  const regions = ["eu-north-1", "us-east-1", "us-west-2", "eu-west-1", "eu-central-1"];
  for (const r of regions) {
    await checkRegion(r);
  }
}

checkAll();
