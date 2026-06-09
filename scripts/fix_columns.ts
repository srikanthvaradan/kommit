
import { neon } from "@neondatabase/serverless";
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS stake_amount INTEGER DEFAULT 500`;
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS avoided_truth TEXT`;
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS forfeit_destination TEXT`;
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS followed_through BOOLEAN DEFAULT FALSE`;
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS checkin_due TIMESTAMPTZ`;
  console.log("Columns added");
}
main().catch(console.error);
