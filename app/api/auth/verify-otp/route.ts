import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  const { email, code } = await req.json();
  const sql = neon(process.env.DATABASE_URL!);

  const tokens = await sql`
    SELECT * FROM otp_tokens 
    WHERE email = ${email} AND code = ${code} AND used = false AND expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1
  `;

  if (!tokens.length) return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 });

  await sql`UPDATE otp_tokens SET used = true WHERE id = ${tokens[0].id}`;

  const user = await sql`SELECT id FROM users WHERE email = ${email}`;
  const userId = user[0].id;

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await sql`INSERT INTO user_sessions (user_id, token, expires_at) VALUES (${userId}, ${token}, ${expiresAt.toISOString()})`;

  const response = NextResponse.json({ ok: true });
  response.cookies.set('kommit_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/'
  });

  return response;
}