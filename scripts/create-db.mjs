// Creates the database named in DATABASE_URL if it doesn't exist yet, by
// connecting to the server's default "postgres" database. Local setup only;
// hosted providers create the database for you.
//
//   node --env-file=.env scripts/create-db.mjs

import pg from "pg";

const url = new URL(process.env.DATABASE_URL ?? "");
const name = decodeURIComponent(url.pathname.slice(1));

if (!name || !/^[A-Za-z0-9_]+$/.test(name)) {
  console.error(`Expected a simple database name in DATABASE_URL, got "${name}"`);
  process.exit(1);
}

url.pathname = "/postgres";
const client = new pg.Client({ connectionString: url.toString() });

await client.connect();
try {
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
  if (rowCount) {
    console.log(`Database "${name}" already exists.`);
  } else {
    await client.query(`CREATE DATABASE "${name}"`);
    console.log(`Created database "${name}".`);
  }
} finally {
  await client.end();
}
