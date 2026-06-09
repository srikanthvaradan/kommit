import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('kommit_session')?.value;
  if (!token) return NextResponse.json({ user: null });

  const sql = neon(process.env.DATABASE_URL!);
  const sessions = await sql`
    SELECT u.id, u.email FROM user_sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > NOW()
  `;

  if (!sessions.length) return NextResponse.json({ user: null });
  return NextResponse.json({ user: sessions[0] });
}