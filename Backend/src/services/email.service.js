const nodemailer = require('nodemailer');

let transporter;
// The last delivery error per provider, surfaced (without secrets) on the
// admin email-status panel so a broken setup can be diagnosed from the app.
const lastErrors = {};

// Email can be sent through any of these, tried in this order. If one fails
// (bad key, unverified sender, quota) the next configured one is used.
//  1. BREVO_API_KEY  — Brevo HTTP API (https://brevo.com). Free 300/day and
//     delivers to ANY address once you verify a single sender email — no
//     domain needed. Recommended.
//  2. RESEND_API_KEY — Resend HTTP API. Without a verified domain Resend only
//     delivers to the account owner's own address.
//  3. EMAIL_HOST / EMAIL_USER / EMAIL_PASS — any SMTP server, e.g. Gmail with
//     an App Password (EMAIL_HOST=smtp.gmail.com, EMAIL_PORT=465).
function configuredProviders() {
  const list = [];
  if (process.env.BREVO_API_KEY) list.push('brevo');
  if (process.env.RESEND_API_KEY) list.push('resend');
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) list.push('smtp');
  return list;
}

function isEmailConfigured() {
  return configuredProviders().length > 0;
}

function getTransporter() {
  if (transporter) return transporter;
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

// "Campus Coin <hi@x.com>" -> { name: 'Campus Coin', email: 'hi@x.com' }
function parseAddress(value) {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
  if (match) return { name: match[1].replace(/^"|"$/g, '') || 'Campus Coin', email: match[2].trim() };
  return { name: 'Campus Coin', email: value.trim() };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const asList = (value) => (Array.isArray(value) ? value : value ? [value] : []);

async function sendWithBrevo({ to, bcc, subject, text, html, replyTo, attachments }) {
  const sender = parseAddress(process.env.BREVO_SENDER || fromAddress());
  const toList = asList(to);
  const bccList = asList(bcc);
  const body = {
    sender,
    // Brevo requires at least one "to"; bulk mail goes to the sender with
    // everyone else in BCC so recipients never see each other's address.
    to: (toList.length ? toList : [sender.email]).map((email) => ({ email })),
    subject,
    htmlContent: html,
    textContent: text,
  };
  if (bccList.length) body.bcc = bccList.map((email) => ({ email }));
  if (replyTo) body.replyTo = { email: replyTo };
  if (attachments?.length) body.attachment = attachments.map((a) => ({ name: a.filename, content: a.content.toString('base64') }));
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Brevo HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }
}

async function sendWithResend({ to, bcc, subject, text, html, replyTo, attachments }) {
  const from = fromAddress();
  const toList = asList(to);
  const body = { from, to: toList.length ? toList : [parseAddress(from).email], subject, text, html };
  if (asList(bcc).length) body.bcc = asList(bcc);
  if (replyTo) body.reply_to = replyTo;
  if (attachments?.length) body.attachments = attachments.map((a) => ({ filename: a.filename, content: a.content.toString('base64') }));
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }
}

async function sendWithSmtp({ to, bcc, subject, text, html, replyTo, attachments }) {
  const from = fromAddress();
  const toList = asList(to);
  const sender = parseAddress(from).email;
  await getTransporter().sendMail({
    from,
    // Bulk mail is BCC-only; address it to ourselves when that's a real address.
    to: toList.length ? toList : EMAIL_RE.test(sender) ? sender : undefined,
    bcc: asList(bcc),
    replyTo,
    subject,
    text,
    html,
    attachments: attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  });
}

const senders = { brevo: sendWithBrevo, resend: sendWithResend, smtp: sendWithSmtp };

/**
 * Sends one email, trying every configured provider in turn. Resolves
 * { sent: false } when no provider is configured, { sent: true, provider }
 * on success, and throws the last provider's error when all of them fail.
 */
async function sendMail(message) {
  const providers = configuredProviders();
  if (!providers.length) return { sent: false };
  let lastError;
  for (const provider of providers) {
    try {
      await senders[provider](message);
      delete lastErrors[provider];
      return { sent: true, provider };
    } catch (err) {
      lastError = err;
      lastErrors[provider] = { message: String(err.message || err).slice(0, 300), at: new Date().toISOString() };
      console.error(`Email via ${provider} failed:`, err.message || err);
    }
  }
  throw lastError;
}

function emailStatus() {
  return {
    configured: isEmailConfigured(),
    providers: configuredProviders(),
    from: isEmailConfigured() ? process.env.BREVO_SENDER || fromAddress() : null,
    lastErrors: { ...lastErrors },
  };
}

// The frontend origin used to build links. CLIENT_URL may be a
// comma-separated list; the first entry is treated as the primary site.
function primaryClientUrl() {
  const first = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).find(Boolean);
  return (first || 'https://campuscointw7.vercel.app').replace(/\/+$/, '');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

// Shared branded wrapper so every email looks the same.
function layout({ heading, bodyHtml, cta, afterHtml = '' }) {
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(cta.href)}" style="display:inline-block;background:#1c8f53;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600">${escapeHtml(cta.label)}</a></p>`
    : '';
  return `
  <div style="background:#f3f7f4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;color:#1d3d2d;border:1px solid #e3ece6">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#1c8f53">Campus Coin</p>
      <p style="margin:0 0 20px;font-size:11px;letter-spacing:2px;color:#6b7280">YOUR CAMPUS · YOUR WALLET</p>
      <h2 style="margin:0 0 12px;font-size:20px">${escapeHtml(heading)}</h2>
      ${bodyHtml}
      ${button}
      ${afterHtml}
      <p style="margin:28px 0 0;color:#9ca3af;font-size:12px">You're receiving this because you have a Campus Coin account. Turn email notifications off anytime in Settings.<br/>Made by Team Flandek.</p>
    </div>
  </div>`;
}

// Sends both a 6-digit code (typed into the app) and a tokenized link that
// opens the reset page with the email and code already filled in.
async function sendPasswordResetCode(toEmail, code) {
  const resetLink = `${primaryClientUrl()}/forgot-password?email=${encodeURIComponent(toEmail)}&code=${encodeURIComponent(code)}`;

  if (!isEmailConfigured()) {
    console.warn(
      `Email is not configured (BREVO_API_KEY, RESEND_API_KEY or EMAIL_HOST/EMAIL_USER/EMAIL_PASS). Password reset code for ${toEmail}: ${code} — link: ${resetLink}`,
    );
    return { sent: false };
  }

  return sendMail({
    to: toEmail,
    subject: `${code} is your Campus Coin password reset code`,
    text:
      `We received a request to reset your Campus Coin password.\n\n` +
      `Your verification code is: ${code}\n\n` +
      `Or open this link to reset it directly:\n${resetLink}\n\n` +
      `This code expires in 15 minutes. If you did not request this, you can safely ignore this email.`,
    html: layout({
      heading: 'Reset your password',
      bodyHtml: `
        <p>We received a request to reset your Campus Coin password. Your verification code is:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0;color:#14532d">${escapeHtml(code)}</p>
        <p>Or reset it in one click:</p>`,
      cta: { href: resetLink, label: 'Reset my password' },
      afterHtml: '<p style="color:#6b7280;font-size:13px">This code expires in 15 minutes. If you did not request this, you can safely ignore this email.</p>',
    }),
  });
}

async function sendWelcomeEmail(user) {
  if (!isEmailConfigured() || !user?.email) return { sent: false };
  const firstName = String(user.fullName || '').split(' ')[0] || 'there';
  const url = primaryClientUrl();
  return sendMail({
    to: user.email,
    subject: 'Welcome to Campus Coin 🎉',
    text:
      `Hi ${firstName},\n\nWelcome to Campus Coin — your student budget companion.\n\n` +
      `Here's how to get going:\n1. Set up your money profile (income, allowance and savings goal)\n` +
      `2. Log your first income or expense\n3. Add a budget for the categories you spend most on\n` +
      `4. Ask the AI assistant anything about your spending\n\nOpen your dashboard: ${url}/dashboard\n\n— Team Flandek`,
    html: layout({
      heading: `Welcome, ${firstName}!`,
      bodyHtml: `
        <p>Campus Coin helps you see where your allowance, gig income and scholarships go — no bank account needed.</p>
        <p style="margin:16px 0 6px;font-weight:600">Get started in four quick steps:</p>
        <ol style="padding-left:20px;line-height:1.7;margin:0">
          <li>Set up your money profile (income, allowance and savings goal)</li>
          <li>Log your first income or expense</li>
          <li>Add a budget for the categories you spend most on</li>
          <li>Ask the AI assistant anything about your spending</li>
        </ol>`,
      cta: { href: `${url}/dashboard`, label: 'Open my dashboard' },
    }),
  });
}

/**
 * Emails a copy of an in-app notification to one user, when they have email
 * notifications on. Never throws: in-app delivery must not depend on email.
 */
async function sendNotificationEmail(user, notification) {
  try {
    if (!isEmailConfigured() || !user?.email) return { sent: false };
    if (user.settings && user.settings.emailNotifications === false) return { sent: false };
    return await sendMail({
      to: user.email,
      subject: `Campus Coin: ${notification.title}`,
      text: `${notification.message}\n\nView it in Campus Coin: ${primaryClientUrl()}/notifications`,
      html: layout({
        heading: notification.title,
        bodyHtml: `<p style="line-height:1.6">${escapeHtml(notification.message)}</p>`,
        cta: { href: `${primaryClientUrl()}/notifications`, label: 'Open notifications' },
      }),
    });
  } catch (err) {
    console.error('Notification email failed:', err.message || err);
    return { sent: false, error: true };
  }
}

/**
 * Emails a published announcement to every opted-in student (BCC, in
 * chunks so no provider limit is hit). Never throws.
 */
async function sendAnnouncementEmails(recipients, announcement) {
  if (!isEmailConfigured() || !recipients.length) return { sent: 0 };
  let sent = 0;
  for (let i = 0; i < recipients.length; i += 45) {
    const chunk = recipients.slice(i, i + 45);
    try {
      await sendMail({
        bcc: chunk,
        subject: `Campus Coin: ${announcement.title}`,
        text: `${announcement.body}\n\n${primaryClientUrl()}/notifications`,
        html: layout({
          heading: announcement.title,
          bodyHtml: `<p style="line-height:1.6;white-space:pre-wrap">${escapeHtml(announcement.body)}</p>`,
          cta: { href: `${primaryClientUrl()}/notifications`, label: 'Open Campus Coin' },
        }),
      });
      sent += chunk.length;
    } catch (err) {
      console.error('Announcement email chunk failed:', err.message || err);
    }
  }
  return { sent };
}

/**
 * Emails SUPPORT_EMAIL (or EMAIL_USER / the sender) when someone uses the
 * Help page contact form. The message is always stored for the admin inbox.
 */
async function notifyAdminsOfSupportMessage(msg, adminEmails = []) {
  if (!isEmailConfigured()) return { sent: false };
  const valid = (v) => typeof v === 'string' && EMAIL_RE.test(v.trim());
  // SUPPORT_EMAIL wins; otherwise every active admin; otherwise the sender.
  const recipients = valid(process.env.SUPPORT_EMAIL)
    ? [process.env.SUPPORT_EMAIL.trim()]
    : adminEmails.filter(valid).length
      ? adminEmails.filter(valid)
      : [process.env.EMAIL_USER, parseAddress(fromAddress()).email].filter(valid).slice(0, 1);
  if (!recipients.length) return { sent: false };
  const to = recipients.length === 1 ? recipients[0] : undefined;
  const bcc = recipients.length > 1 ? recipients : undefined;
  return sendMail({
    to,
    bcc,
    replyTo: msg.email,
    subject: `Campus Coin support: ${msg.topic} — ${msg.name}`,
    text: `From: ${msg.name} <${msg.email}>\nTopic: ${msg.topic}\n\n${msg.message}\n\nReply from the admin Support inbox: ${primaryClientUrl()}/admin/support`,
    html: layout({
      heading: `New support message: ${msg.topic}`,
      bodyHtml: `<p><strong>From:</strong> ${escapeHtml(msg.name)} &lt;${escapeHtml(msg.email)}&gt;</p><p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(msg.message)}</p>`,
      cta: { href: `${primaryClientUrl()}/admin/support`, label: 'Reply in the Support inbox' },
    }),
  });
}

/** Emails the student when an admin replies to their support conversation. Never throws. */
async function sendSupportReplyEmail(toEmail, name, replyText, signedIn) {
  try {
    if (!isEmailConfigured() || !toEmail) return { sent: false };
    const link = signedIn ? `${primaryClientUrl()}/support#my-messages` : `${primaryClientUrl()}/help`;
    return await sendMail({
      to: toEmail,
      subject: 'Campus Coin support replied to your message',
      text: `Hi ${name || 'there'},\n\nOur support team replied:\n\n${replyText}\n\n${signedIn ? `See the whole conversation: ${link}` : 'You can reply to this email or send another message from the Help page.'}`,
      html: layout({
        heading: 'Support replied to your message',
        bodyHtml: `<p>Hi ${escapeHtml(name || 'there')}, our support team replied:</p><blockquote style="margin:12px 0;padding:12px 16px;background:#f0f7f3;border-left:4px solid #1c8f53;border-radius:8px;white-space:pre-wrap">${escapeHtml(replyText)}</blockquote>`,
        cta: { href: link, label: signedIn ? 'View conversation' : 'Open Help centre' },
      }),
    });
  } catch (err) {
    console.error('Support reply email failed:', err.message || err);
    return { sent: false, error: true };
  }
}

/** Emails a monthly report PDF (to the student, or someone they chose). */
async function sendReportEmail({ to, fromName, month, pdf, toSelf }) {
  const [year, mon] = month.split('-').map(Number);
  const label = new Date(Date.UTC(year, mon - 1, 1)).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const intro = toSelf
    ? `Here is your Campus Coin report for ${label}.`
    : `${fromName} shared their Campus Coin spending report for ${label} with you.`;
  return sendMail({
    to,
    subject: `Campus Coin report — ${label}`,
    text: `${intro}\n\nThe PDF is attached.`,
    html: layout({
      heading: `Monthly report: ${label}`,
      bodyHtml: `<p>${escapeHtml(intro)}</p><p>The full report (income, spending by category, daily and weekly totals and every transaction) is attached as a PDF.</p>`,
      cta: toSelf ? { href: `${primaryClientUrl()}/reports`, label: 'Open Reports' } : undefined,
    }),
    attachments: [{ filename: `CampusCoin-Report-${month}.pdf`, content: pdf, contentType: 'application/pdf' }],
  });
}

async function sendTestEmail(toEmail) {
  return sendMail({
    to: toEmail,
    subject: 'Campus Coin test email ✅',
    text: 'If you can read this, email delivery from Campus Coin is working.',
    html: layout({ heading: 'Email is working ✅', bodyHtml: '<p>If you can read this, email delivery from Campus Coin is set up correctly.</p>' }),
  });
}

module.exports = {
  sendMail,
  sendPasswordResetCode,
  sendWelcomeEmail,
  sendNotificationEmail,
  sendAnnouncementEmails,
  sendSupportReplyEmail,
  sendTestEmail,
  sendReportEmail,
  isEmailConfigured,
  emailStatus,
  notifyAdminsOfSupportMessage,
  primaryClientUrl,
};
