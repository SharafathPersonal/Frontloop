import 'server-only';
import bcrypt from 'bcryptjs';

const COST = 12;

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST);

export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

// Same cost as real hashes, so a login for an unknown email takes as long as a
// wrong password for a real one (no user enumeration via timing). Computed once
// per instance; the value itself is irrelevant — nothing can match it.
let dummyHash: Promise<string> | null = null;

/** Compare against the user's hash, or a dummy of equal cost when no user exists. */
export async function verifyPasswordOrDummy(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (hash) return verifyPassword(plain, hash);
  dummyHash ??= bcrypt.hash('dummy-password-for-timing-equalisation', COST);
  await verifyPassword(plain, await dummyHash);
  return false;
}
