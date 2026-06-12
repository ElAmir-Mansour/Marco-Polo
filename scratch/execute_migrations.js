require('dotenv').config({ path: '.env.local' });
const { Signer } = require('@aws-sdk/rds-signer');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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
  console.log("Generating IAM Token for migrations...");
  try {
    const token = await signer.getAuthToken();
    const encodedToken = encodeURIComponent(token);
    const connectionString = `postgres://postgres:${encodedToken}@database-1.cluster-c90gukcyk8i8.eu-north-1.rds.amazonaws.com:5432/postgres?sslmode=require`;

    const client = new Client({
      connectionString: connectionString
    });

    console.log("Connecting to database...");
    await client.connect();
    console.log("Connected successfully.");

    // Read the migration SQL file
    const sqlPath = path.join(__dirname, '../src/lib/db/migrations/0001_lyrical_blackheart.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found at: ${sqlPath}`);
    }

    const rawSql = fs.readFileSync(sqlPath, 'utf8');
    const statements = rawSql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute.`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      try {
        await client.query(stmt);
      } catch (err) {
        // If type/table already exists, we can log and skip it
        if (err.message.includes('already exists')) {
          console.warn(`[Warning] Statement ${i + 1} already exists, skipping.`);
        } else {
          throw err;
        }
      }
    }

    console.log("Success! All schema tables migrated successfully.");
    await client.end();
  } catch (err) {
    console.error("Migration execution failed:", err.message);
    process.exit(1);
  }
}

main();
