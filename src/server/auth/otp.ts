import 'server-only';
import { randomInt } from 'crypto';
import { connectDB } from '../db';
import { decrypt, encrypt, hashOtp, hexDigestsEqual } from '../crypto';
import { sendEmail } from '../email/mailer';
import { otpEmail } from '../email/templates';
import { OtpToken, type OtpPurpose } from '../models/OtpToken';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export type IssueOtpResult = { ok: true } | { ok: false; reason: 'cooldown'; retryAfterSeconds: number };

/**
 * Issues a fresh 6-digit code for (email, purpose), replacing any previous one,
 * and emails it. Fails closed: if the email cannot be sent the code is deleted
 * and the error propagates, so no unusable code lingers.
 *
 * The cooldown is enforced atomically by the upsert filter: while the current
 * code is younger than the cooldown the filter misses, the upsert collides with
 * the unique (email, purpose) index, and the request is refused.
 */
export async function generateAndSendOtp(input: {
  email: string;
  purpose: OtpPurpose;
  payload?: unknown;
}): Promise<IssueOtpResult> {
  const { email, purpose } = input;
  const code = randomInt(100000, 1000000).toString();
  const hashedCode = hashOtp(code, email, purpose);
  const now = Date.now();

  await connectDB();
  try {
    await OtpToken.updateOne(
      { email, purpose, issuedAt: { $lte: new Date(now - OTP_RESEND_COOLDOWN_SECONDS * 1000) } },
      {
        $set: {
          hashedCode,
          attempts: 0,
          issuedAt: new Date(now),
          expiresAt: new Date(now + OTP_TTL_MINUTES * 60 * 1000),
          ...(input.payload === undefined ? {} : { payloadEnc: encrypt(JSON.stringify(input.payload)) }),
        },
        ...(input.payload === undefined ? { $unset: { payloadEnc: '' } } : {}),
      },
      { upsert: true },
    );
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    const current = await OtpToken.findOne({ email, purpose }).select('issuedAt').lean();
    const elapsed = current ? (now - current.issuedAt.getTime()) / 1000 : OTP_RESEND_COOLDOWN_SECONDS;
    return { ok: false, reason: 'cooldown', retryAfterSeconds: Math.max(1, Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - elapsed)) };
  }

  try {
    await sendEmail(otpEmail(email, purpose, code, OTP_TTL_MINUTES));
  } catch (err) {
    await OtpToken.deleteOne({ email, purpose, hashedCode });
    throw err;
  }
  return { ok: true };
}

export type VerifyOtpResult<T> = { ok: true; payload: T | undefined } | { ok: false };

/**
 * Single-use, attempt-limited verification.
 *  1. Atomically spend one attempt on a live, unlocked token (so concurrent
 *     guesses can never exceed OTP_MAX_ATTEMPTS in total).
 *  2. Compare keyed hashes in constant time.
 *  3. On a match, consume the token with a delete conditioned on the same hash:
 *     of two concurrent correct submissions only one succeeds.
 * A token that reaches the attempt limit is deleted; the user must request a new code.
 * Failures are indistinguishable to the caller (wrong, expired, locked, missing).
 */
export async function verifyOtp<T = unknown>(input: {
  email: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<VerifyOtpResult<T>> {
  const { email, purpose, code } = input;
  await connectDB();

  const token = await OtpToken.findOneAndUpdate(
    { email, purpose, expiresAt: { $gt: new Date() }, attempts: { $lt: OTP_MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  ).lean();
  if (!token) return { ok: false };

  if (!hexDigestsEqual(hashOtp(code, email, purpose), token.hashedCode)) {
    if (token.attempts >= OTP_MAX_ATTEMPTS) await OtpToken.deleteOne({ _id: token._id });
    return { ok: false };
  }

  const consumed = await OtpToken.findOneAndDelete({ _id: token._id, hashedCode: token.hashedCode }).lean();
  if (!consumed) return { ok: false };

  return { ok: true, payload: consumed.payloadEnc ? (JSON.parse(decrypt(consumed.payloadEnc)) as T) : undefined };
}
