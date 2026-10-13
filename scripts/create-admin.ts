/**
 * Creates or updates a platform_admin login for /admin. There is deliberately no
 * web route that grants this role.
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run db:admin
 *
 * Re-running for an existing admin resets the password and signs out every
 * session that admin already has. Tenant accounts are never promoted.
 */
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '../src/server/db';
import { hashPassword } from '../src/server/auth/password';
import { User } from '../src/server/models';
import { PasswordSchema } from '../src/lib/password-policy';
import { loadLocalEnv } from './lib/cli';

const Input = z.object({
  email: z.string().trim().toLowerCase().email('ADMIN_EMAIL must be a valid email address'),
  password: PasswordSchema.refine((p) => p.length >= 12, 'ADMIN_PASSWORD must be at least 12 characters'),
});

async function main() {
  loadLocalEnv();
  const parsed = Input.safeParse({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join('\n'));
  const { email, password } = parsed.data;

  await connectDB();
  const passwordHash = await hashPassword(password);
  const existing = await User.findOne({ email }).select('role').lean();

  if (existing && existing.role !== 'platform_admin') {
    throw new Error(`${email} is a ${existing.role} account. Use a separate email for the platform admin.`);
  }

  if (existing) {
    // The sessionVersion bump revokes any JWT issued before this reset.
    await User.updateOne(
      { _id: existing._id },
      { $set: { passwordHash, disabled: false }, $inc: { sessionVersion: 1 } },
    );
    console.log(`✓ Updated platform admin ${email}; existing sessions revoked.`);
  } else {
    await User.create({ email, passwordHash, role: 'platform_admin' });
    console.log(`✓ Created platform admin ${email}. Sign in at /auth/login.`);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
