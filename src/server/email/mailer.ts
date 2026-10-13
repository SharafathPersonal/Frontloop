import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { getEnv, requireEnv } from '../env';

// Reused across invocations on a warm serverless instance (and across HMR in dev).
const g = globalThis as unknown as { __mailer?: Transporter };

/** Fails closed: throws when any SMTP variable is missing, so no code path silently skips an email. */
function getTransport(): Transporter {
  if (g.__mailer) return g.__mailer;
  const port = getEnv().SMTP_PORT;
  g.__mailer = nodemailer.createTransport({
    host: requireEnv('SMTP_HOST'),
    port,
    secure: port === 465, // implicit TLS; other ports must upgrade with STARTTLS
    requireTLS: port !== 465,
    auth: { user: requireEnv('SMTP_USER'), pass: requireEnv('SMTP_PASS') },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return g.__mailer;
}

/** True when every SMTP variable is present; lets routes return 503 before doing any work. */
export function isEmailConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export type EmailMessage = { to: string; subject: string; text: string; html: string };

export async function sendEmail(message: EmailMessage): Promise<void> {
  await getTransport().sendMail({ from: getEnv().EMAIL_FROM, ...message });
}
