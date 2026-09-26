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

async function sendPasswordResetEmail(toEmail, resetUrl) {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn(
      `Email is not configured (EMAIL_HOST/EMAIL_USER/EMAIL_PASS). Password reset link for ${toEmail}: ${resetUrl}`,
    );
    return { sent: false };
  }

  await mailer.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Reset your CampusCoin password',
    text: `We received a request to reset your CampusCoin password. Use the link below within the next hour:\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<p>We received a request to reset your CampusCoin password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
  });
  return { sent: true };
}

module.exports = { sendPasswordResetEmail };
