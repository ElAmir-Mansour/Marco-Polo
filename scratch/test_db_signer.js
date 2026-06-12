require('dotenv').config({ path: '.env.local' });
const { Signer } = require('@aws-sdk/rds-signer');
const { Client } = require('pg');

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
  console.log("Generating IAM Token using elamir access keys...");
  try {
    const token = await signer.getAuthToken();
    console.log("Generated Token successfully.");
    
    const encodedToken = encodeURIComponent(token);
    const connectionString = `postgres://postgres:${encodedToken}@database-1.cluster-c90gukcyk8i8.eu-north-1.rds.amazonaws.com:5432/postgres?sslmode=require`;

    const client = new Client({
      connectionString: connectionString
    });

    console.log("Connecting to RDS...");
    await client.connect();
    console.log("Success! Connected to RDS PostgreSQL with IAM Auth.");
    const res = await client.query('SELECT NOW()');
    console.log("Current Time:", res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("Connection Failed:", err.message);
    process.exit(1);
  }
}

main();
