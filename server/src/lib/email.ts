export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}) {
  if (!process.env.BREVO_API_KEY) {
    console.error("[email] BREVO_API_KEY is not set — skipping email send");
    return;
  }

  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to]).map(
    (email) => ({ email })
  );

  const body: Record<string, unknown> = {
    sender: { name: "KAOS HRIS", email: process.env.BREVO_SENDER_EMAIL },
    to: recipients,
    subject: opts.subject,
    htmlContent: opts.html,
  };

  if (opts.replyTo) {
    body.replyTo = { email: opts.replyTo };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => res.statusText);
    console.error("[email] Failed to send email:", error);
  }
}
