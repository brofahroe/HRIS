import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getAuthedUser, getBearerToken } from '@/lib/apiAuth';

export async function POST(request: Request) {
  try {
    const authedUser = await getAuthedUser(getBearerToken(request));
    if (!authedUser) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key_for_build');
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const data = await resend.emails.send({
      from: 'HRIS System <noreply@hris-modern.example.com>',
      to: [to],
      subject: subject,
      html: html,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to send email' }, { status: 500 });
  }
}
