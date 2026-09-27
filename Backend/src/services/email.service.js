const nodemailer = require('nodemailer');

let transporter;

// Lazily builds (and caches) the SMTP transporter from env config. Returns
// null when email isn't configured so callers can fail gracefully instead of
// crashing a request that merely wanted to send a notification.
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
}

// A code (rather than a clickable link) sidesteps link-based delivery
// problems entirely — broken deep links, mismatched CLIENT_URL, corporate
// email link-rewriting — since the user just reads six digits and types
// them into the app themselves.
async function sendPasswordResetCode(toEmail, code) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn(
      `Email is not configured (EMAIL_HOST/EMAIL_USER/EMAIL_PASS). Password reset code for ${toEmail}: ${code}`,
    );
    return { sent: false };
  }

  await mailer.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Your CampusCoin password reset code',
    text: `We received a request to reset your CampusCoin password. Your verification code is:\n\n${code}\n\nThis code expires in 15 minutes. If you did not request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your CampusCoin password. Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p><p>This code expires in 15 minutes. If you did not request this, you can safely ignore this email.</p>`,
  });
  return { sent: true };
}

module.exports = { sendPasswordResetCode };
