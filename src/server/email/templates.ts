import 'server-only';
import type { EmailMessage } from './mailer';

export type OtpEmailPurpose = 'register' | 'reset_password';

const COPY: Record<OtpEmailPurpose, { subject: string; heading: string; intro: string }> = {
  register: {
    subject: 'Your FrontLoop verification code',
    heading: 'Verify your email',
    intro: 'Use this code to finish creating your FrontLoop workspace.',
  },
  reset_password: {
    subject: 'Your FrontLoop password reset code',
    heading: 'Reset your password',
    intro: 'Use this code to set a new password for your FrontLoop account.',
  },
};

/**
 * Plain-text and table-based HTML versions; inline styles only, so the email
 * renders in Gmail, Outlook and mobile clients. No user-supplied content is
 * interpolated, so nothing here needs HTML escaping.
 */
export function otpEmail(to: string, purpose: OtpEmailPurpose, code: string, ttlMinutes: number): EmailMessage {
  const { subject, heading, intro } = COPY[purpose];
  const disclaimer =
    'If you did not request this, ignore this email. Your account stays safe and no changes will be made. ' +
    'FrontLoop will never ask you to share this code.';

  const text = [
    heading,
    '',
    intro,
    '',
    `Your code: ${code}`,
    '',
    `This code expires in ${ttlMinutes} minutes.`,
    '',
    disclaimer,
    '',
    'FrontLoop | frontloop.online',
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F8FAFC;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;">
            <tr>
              <td style="padding:32px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                <p style="margin:0 0 24px;font-size:18px;font-weight:800;letter-spacing:-0.5px;color:#047857;">FrontLoop</p>
                <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;">${heading}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">${intro}</p>
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#64748B;">Your code</p>
                <p style="margin:0 0 24px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:#0F172A;">${code}</p>
                <p style="margin:0 0 24px;font-size:14px;color:#0F172A;">This code expires in <strong>${ttlMinutes} minutes</strong>.</p>
                <p style="margin:0;padding-top:16px;border-top:1px solid #E2E8F0;font-size:12px;line-height:1.6;color:#64748B;">${disclaimer}</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#64748B;">FrontLoop | frontloop.online</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to, subject, text, html };
}
