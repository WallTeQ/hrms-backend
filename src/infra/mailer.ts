import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.mailtrap.io";
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER || "";
const pass = process.env.SMTP_PASS || "";
const from = process.env.FROM_EMAIL || `no-reply@${process.env.APP_DOMAIN || "example.com"}`;

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // true for 465, false for other ports
  auth: user ? { user, pass } : undefined,
});

export async function sendOtpEmail(email: string, otp: string) {
  const subject = "Your signup verification code";
  const text = `Your verification code is: ${otp}. It will expire in 5 minutes.`;
  const html = `<p>Your verification code is: <strong>${otp}</strong>.</p><p>It will expire in 5 minutes.</p>`;

  return transporter.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });
}

export default transporter;