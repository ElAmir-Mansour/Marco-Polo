const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:%40Aamazon41414@database-1.cluster-c90gukcyk8i8.eu-north-1.rds.amazonaws.com:5432/postgres?sslmode=require'
});

async function main() {
  console.log("Connecting to RDS...");
  try {
    await client.connect();
    console.log("Success! Connected to RDS PostgreSQL.");
    const res = await client.query('SELECT * FROM mentors LIMIT 5');
    console.log("Mentors in DB:", res.rows);
    await client.end();
  } catch (err) {
    console.error("Connection Failed:", err.message);
    process.exit(1);
  }
}

main();
