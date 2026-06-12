require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const { Signer } = require('@aws-sdk/rds-signer');

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

const pool = new Pool({
  host: 'database-1.cluster-c90gukcyk8i8.eu-north-1.rds.amazonaws.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: async () => {
    console.log("Pool is requesting a new IAM Auth token...");
    const token = await signer.getAuthToken();
    return token;
  },
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  try {
    console.log("Querying using Pool...");
    const res = await pool.query('SELECT NOW()');
    console.log("Pool Query Success, Time:", res.rows[0]);
    
    console.log("Querying second time...");
    const res2 = await pool.query('SELECT NOW()');
    console.log("Pool Query 2 Success, Time:", res2.rows[0]);

    await pool.end();
  } catch (err) {
    console.error("Pool Connection Failed:", err.message);
    process.exit(1);
  }
}

main();
