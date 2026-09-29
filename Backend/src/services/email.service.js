const nodemailer = require('nodemailer');

let transporter;

// Two ways to send email, checked in this order:
//  1. RESEND_API_KEY — Resend's HTTP API (https://resend.com). Works from any
//     serverless host because it's a plain HTTPS request.
//  2. EMAIL_HOST / EMAIL_USER / EMAIL_PASS — any SMTP server, e.g. Gmail with
//     an App Password (EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=465).
function isEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY ||
      (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS),
  );
}

// Lazily builds (and caches) the SMTP transporter from env config. Returns
// null when SMTP isn't configured.
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  const port = Number(process.env.EMAIL_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    // Fail fast on a serverless function instead of hanging until the
    // platform kills the request.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

function fromAddress() {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER || 'Campus Coin <onboarding@resend.dev>';
}

async function sendMail({ to, subject, text, html }) {
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromAddress(), to: [to], subject, text, html }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Resend HTTP ${response.status}: ${body.slice(0, 300)}`);
    }
    return { sent: true };
  }

  const mailer = getTransporter();
  if (!mailer) return { sent: false };
  await mailer.sendMail({ from: fromAddress(), to, subject, text, html });
  return { sent: true };
}

// The frontend origin used to build the one-click reset link. CLIENT_URL may
// be a comma-separated list; the first entry is treated as the primary site.
function primaryClientUrl() {
  const first = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).find(Boolean);
  return (first || 'https://campuscointw7.vercel.app').replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Sends both a 6-digit code (typed into the app) and a tokenized link that
// opens the reset page with the email and code already filled in.
async function sendPasswordResetCode(toEmail, code) {
  const resetLink = `${primaryClientUrl()}/forgot-password?email=${encodeURIComponent(toEmail)}&code=${encodeURIComponent(code)}`;

  if (!isEmailConfigured()) {
    console.warn(
      `Email is not configured (RESEND_API_KEY or EMAIL_HOST/EMAIL_USER/EMAIL_PASS). Password reset code for ${toEmail}: ${code} — link: ${resetLink}`,
    );
    return { sent: false };
  }

  return sendMail({
    to: toEmail,
    subject: 'Your Campus Coin password reset code',
    text:
      `We received a request to reset your Campus Coin password.\n\n` +
      `Your verification code is: ${code}\n\n` +
      `Or open this link to reset it directly:\n${resetLink}\n\n` +
      `This code expires in 15 minutes. If you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1d3d2d">
        <h2 style="margin:0 0 12px;color:#1c8f53">Campus Coin</h2>
        <p>We received a request to reset your Campus Coin password. Your verification code is:</p>
        <p style="font-size:30px;font-weight:700;letter-spacing:6px;margin:16px 0">${escapeHtml(code)}</p>
        <p>Or reset it in one click:</p>
        <p><a href="${escapeHtml(resetLink)}" style="display:inline-block;background:#1c8f53;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">Reset my password</a></p>
        <p style="color:#6b7280;font-size:13px">This code expires in 15 minutes. If you did not request this, you can safely ignore this email.</p>
      </div>`,
  });
}

/**
 * Emails SUPPORT_EMAIL (or EMAIL_FROM / EMAIL_USER) when someone uses the
 * Help page contact form. Silently skipped when email isn't configured —
 * the message is still stored for the admin Support inbox.
 */
async function notifyAdminsOfSupportMessage(msg) {
  const to = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
  if (!isEmailConfigured() || !to) return { sent: false };
  return sendMail({
    to,
    subject: `Campus Coin support: ${msg.topic} — ${msg.name}`,
    text: `From: ${msg.name} <${msg.email}>\nTopic: ${msg.topic}\n\n${msg.message}\n\nReply directly to ${msg.email}, or open the admin Support inbox.`,
    html: `<p><strong>From:</strong> ${escapeHtml(msg.name)} &lt;${escapeHtml(msg.email)}&gt;<br/><strong>Topic:</strong> ${escapeHtml(msg.topic)}</p><p style="white-space:pre-wrap">${escapeHtml(msg.message)}</p><p style="color:#6b7280;font-size:13px">Reply directly to ${escapeHtml(msg.email)}, or open the admin Support inbox.</p>`,
  });
}

module.exports = { sendPasswordResetCode, isEmailConfigured, notifyAdminsOfSupportMessage };
