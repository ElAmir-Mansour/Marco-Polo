require('dotenv').config({ path: '.env.local' });
const { Signer } = require('@aws-sdk/rds-signer');
const { execSync } = require('child_process');

const signer = new Signer({
  hostname: 'database-1.cluster-c90gukcyk8i8.eu-north-1.rds.amazonaws.com',
  port: 5432,
  username: 'postgres',
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function main() {
  console.log("Generating IAM Token for Schema Migration...");
  try {
    const token = await signer.getAuthToken();
    const encodedToken = encodeURIComponent(token);
    const connectionString = `postgres://postgres:${encodedToken}@database-1.cluster-c90gukcyk8i8.eu-north-1.rds.amazonaws.com:5432/postgres?sslmode=require`;

    console.log("Executing drizzle-kit push against AWS RDS Database...");
    execSync('echo "yes" | npx drizzle-kit push', {
      env: {
        ...process.env,
        DATABASE_URL: connectionString
      },
      stdio: 'inherit'
    });
    console.log("Success! Schema migrated successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

main();
