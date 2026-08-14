import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields (to, subject, html)' });
  }

  // Read SMTP settings from server environment variables
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = Number(process.env.SMTP_PORT) || 465;
  const smtpEmail = process.env.SMTP_EMAIL || 'editorial@tjasf.com';
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpUser = process.env.SMTP_USER || (smtpHost.includes('resend.com') ? 'resend' : smtpEmail);

  if (!smtpPassword) {
    return res.status(500).json({ error: 'SMTP server password/API key not configured in environment variables (SMTP_PASSWORD)' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    await transporter.sendMail({
      from: `"TJASF Editorial Office" <${smtpEmail}>`,
      to,
      subject,
      html,
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('SMTP Mail error:', err);
    return res.status(500).json({ error: err.message || 'Failed to send email' });
  }
}
