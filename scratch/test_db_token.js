require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const rawToken = process.env.RDS_TOKEN || '';

// Remove potential leading/trailing whitespace or host prefix if the token was copied with it
const token = rawToken.includes('?') ? rawToken.substring(rawToken.indexOf('?') + 1) : rawToken;

const encodedToken = encodeURIComponent(token);
const connectionString = `postgres://postgres:${encodedToken}@database-1.cluster-c90gukcyk8i8.eu-north-1.rds.amazonaws.com:5432/postgres?sslmode=require`;

const client = new Client({
  connectionString: connectionString
});

async function main() {
  console.log("Connecting using IAM Token...");
  try {
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
