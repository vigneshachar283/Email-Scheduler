import nodemailer, { Transporter } from "nodemailer";

const transporterCache = new Map<string, Transporter>();

export function getTransporter(sender: {
  id: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}): Transporter {
  const cached = transporterCache.get(sender.id);
  if (cached) return cached;

  const transporter = nodemailer.createTransport({
    host: sender.smtpHost,
    port: sender.smtpPort,
    secure: false, // Ethereal uses STARTTLS on 587
    auth: {
      user: sender.smtpUser,
      pass: sender.smtpPass,
    },
  });

  transporterCache.set(sender.id, transporter);
  return transporter;
}

export async function sendEmail(params: {
  sender: { id: string; smtpHost: string; smtpPort: number; smtpUser: string; smtpPass: string; email: string; name: string };
  to: string;
  subject: string;
  body: string;
}) {
  const transporter = getTransporter(params.sender);

  const info = await transporter.sendMail({
    from: `"${params.sender.name}" <${params.sender.email}>`,
    to: params.to,
    subject: params.subject,
    text: params.body,
    html: `<p>${params.body.replace(/\n/g, "<br/>")}</p>`,
  });

  
  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

  return { messageId: info.messageId, previewUrl };
}
