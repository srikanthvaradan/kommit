import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('kommit_session')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = neon(process.env.DATABASE_URL!);

  const sessions = await sql`
    SELECT u.id FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > NOW()
  `;

  if (!sessions.length) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = sessions[0].id;

  const commitments = await sql`
    SELECT 
      id,
      commitment_text,
      avoided_truth,
      stake_amount,
      forfeit_destination,
      due_date as checkin_due,
      CASE WHEN status = 'completed' THEN true ELSE false END as followed_through,
      created_at
    FROM commitments
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ commitments });
}
