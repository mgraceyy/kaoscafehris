import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.error("[email] RESEND_API_KEY is not set — skipping email send");
    return;
  }

  const { error } = await resend.emails.send({
    from: "KAOS HRIS <kaoshris@xn--kaoscaf-hya.com>",
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    console.error("[email] Failed to send email:", error);
  }
}
