import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getEnv } from './env';

const VERSION = 'v1';

const key = () => Buffer.from(getEnv().TOKEN_ENC_KEY, 'base64');

/** AES-256-GCM. Output: `v1.<iv>.<authTag>.<ciphertext>` (base64 segments). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), ciphertext].map((p) => (typeof p === 'string' ? p : p.toString('base64'))).join('.');
}

export function decrypt(blob: string): string {
  const [version, iv, tag, ciphertext] = blob.split('.');
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error('Malformed encrypted payload');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

/**
 * Constant-time string equality for shared secrets (verify tokens, bearer tokens).
 * Both sides are hashed first so unequal lengths don't short-circuit.
 */
export function safeEqual(a: string | null | undefined, b: string): boolean {
  if (a == null) return false;
  const digest = (v: string) => createHash('sha256').update(v, 'utf8').digest();
  return timingSafeEqual(digest(a), digest(b));
}

/**
 * Validates Meta x-hub-signature-256 header using timing-safe comparison.
 */
export function verifyMetaSignature(
  rawBody: string | Buffer,
  signatureHeader: string | null | undefined,
  appSecret: string,
): boolean {
  if (!signatureHeader || !appSecret) return false;
  const prefix = 'sha256=';
  if (!signatureHeader.startsWith(prefix)) return false;

  const signatureHex = signatureHeader.slice(prefix.length).trim();
  const expectedSignatureHex = createHmac('sha256', appSecret)
    .update(typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody)
    .digest('hex');

  const sigBuffer = Buffer.from(signatureHex, 'hex');
  const expectedBuffer = Buffer.from(expectedSignatureHex, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Validates Cashfree webhook signature using timing-safe comparison.
 * Cashfree computes base64(hmacSha256(rawTimestamp + rawBody, secretKey)).
 */
export function verifyCashfreeSignature(
  rawBody: string,
  timestampHeader: string | null | undefined,
  signatureHeader: string | null | undefined,
  secretKey: string,
): boolean {
  if (!signatureHeader || !timestampHeader || !secretKey) return false;

  const payloadToSign = `${timestampHeader}${rawBody}`;
  const expectedSignatureBase64 = createHmac('sha256', secretKey)
    .update(payloadToSign, 'utf8')
    .digest('base64');

  const sigBuffer = Buffer.from(signatureHeader.trim(), 'base64');
  const expectedBuffer = Buffer.from(expectedSignatureBase64, 'base64');

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Keyed hash for one-time codes. A 6-digit code has only 10^6 values, so an
 * unkeyed hash would be reversible by brute force from a database leak; the key
 * (derived from AUTH_SECRET) makes stored hashes useless without the secret.
 * Email and purpose are bound in, so a code issued for one flow cannot be replayed in another.
 */
export function hashOtp(code: string, email: string, purpose: string): string {
  const key = createHash('sha256').update(`frontloop:otp:${getEnv().AUTH_SECRET}`, 'utf8').digest();
  return createHmac('sha256', key).update(`${purpose}:${email}:${code}`, 'utf8').digest('hex');
}

/** Constant-time comparison of two equal-format hex digests. */
export function hexDigestsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}
