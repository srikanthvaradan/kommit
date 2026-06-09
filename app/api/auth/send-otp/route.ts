import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });

  const sql = neon(process.env.DATABASE_URL!);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await sql`INSERT INTO users (email) VALUES (${email}) ON CONFLICT (email) DO NOTHING`;
  await sql`INSERT INTO otp_tokens (email, code, expires_at) VALUES (${email}, ${code}, ${expiresAt.toISOString()})`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to: email,
      subject: 'Your KOMMIT code',
      html: `<p>Your KOMMIT verification code is: <strong>${code}</strong></p><p>Expires in 10 minutes.</p>`
    }),
  });

  return NextResponse.json({ ok: true }); NextResponse.json({ ok: true });
}