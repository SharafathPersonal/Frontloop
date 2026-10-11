import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
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
