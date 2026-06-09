import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('kommit_session')?.value;
  
  if (token) {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`DELETE FROM user_sessions WHERE token = ${token}`;
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('kommit_session', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/'
  });

  return response;
}
