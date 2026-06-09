
import { neon } from "@neondatabase/serverless";
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)`;
  console.log("user_id column added");
}
main().catch(console.error);
