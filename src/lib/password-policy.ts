import { z } from 'zod';

/** Shown next to password fields; the schema below enforces the same rules. */
export const PASSWORD_RULES = 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.';

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(200, 'Password must be at most 200 characters.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/\d/, 'Password must include a number.');

/** First policy violation, or null. Lets forms show the same message the API would return. */
export function passwordProblem(password: string): string | null {
  const result = PasswordSchema.safeParse(password);
  return result.success ? null : result.error.issues[0].message;
}

export const OtpCodeSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code.');
