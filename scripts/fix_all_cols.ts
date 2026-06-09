
import { neon } from "@neondatabase/serverless";
async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ`;
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'`;
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`;
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS commitment_text TEXT`;
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS avoided_truth TEXT`;
  await sql`ALTER TABLE commitments ADD COLUMN IF NOT EXISTS forfeit_destination TEXT`;
  console.log("All columns added");
}
main().catch(console.error);
