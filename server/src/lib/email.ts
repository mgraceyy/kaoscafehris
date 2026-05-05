import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("[email] EMAIL_USER or EMAIL_PASS is not set — skipping email send");
    return;
  }
  try {
    await transporter.sendMail({
      from: `"HRIS" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    console.error("[email] Failed to send email:", err);
  }
}
