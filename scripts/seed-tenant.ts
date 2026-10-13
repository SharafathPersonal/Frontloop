/**
 * Idempotent local seeder: one clinic tenant, its owner login, and a complete
 * knowledge base. Safe to re-run: existing records are reused, never duplicated.
 *
 *   npm run db:seed                 # create whatever is missing
 *   npm run db:seed -- --reset-kb   # also overwrite the KB with the baseline below
 *
 * Overrides: SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD, SEED_TENANT_SLUG,
 * SEED_PHONE_NUMBER_ID, SEED_DISPLAY_PHONE, SEED_WA_ACCESS_TOKEN (encrypted at rest).
 */
import mongoose from 'mongoose';
import { connectDB } from '../src/server/db';
import { getEnv } from '../src/server/env';
import { encrypt } from '../src/server/crypto';
import { hashPassword } from '../src/server/auth/password';
import { User, BusinessTenant, KnowledgeBase } from '../src/server/models';
import { hasFlag, loadLocalEnv, SEED_PHONE_NUMBER_ID, SEED_TENANT_SLUG } from './lib/cli';

const DEFAULT_PASSWORD = 'Password123!';

const KNOWLEDGE_BASE = {
  context: [
    'Al-Shifa Family Health Clinic is a family practice in Edappally, Kochi, serving families since 2012.',
    'Doctors: Dr. Rahul Menon (MBBS, MD, General Medicine) sees patients Monday to Saturday in both shifts.',
    'Dr. Priya Nair (MD, Pediatrics) is available Monday, Wednesday and Friday mornings only.',
    'Dr. Aisha Rahman (BDS, Dental) is available Tuesday, Thursday and Saturday evenings only.',
    'Walk-ins are welcome; booked appointments are seen first. Payment by cash, UPI, or card.',
    'In-house lab for blood tests, X-ray referrals to Lakeshore Diagnostics. Free parking behind the building.',
  ].join('\n'),
  faqs: [
    {
      question: 'What are the clinic timings and when is Dr. Rahul available?',
      answer:
        'We are open Monday to Saturday, 9:00 AM–1:00 PM and 4:30 PM–8:30 PM. Sunday closed. Dr. Rahul Menon (General Medicine) is available in both shifts on all working days.',
      enabled: true,
    },
    {
      question: 'What is the consultation fee?',
      answer:
        'General consultation is ₹500, pediatric checkup ₹600, and dental cleaning ₹1,200. A follow-up visit within 7 days with the same doctor is free.',
      enabled: true,
    },
    {
      question: 'How do I book a lab test?',
      answer:
        'Lab sample collection is 8:00 AM–12:00 PM, Monday to Saturday. Fasting tests need 10–12 hours of fasting. Share your preferred date and the test name and we will reserve a slot; most reports are ready the same evening.',
      enabled: true,
    },
    {
      question: 'Do you handle emergencies?',
      answer:
        'We are an outpatient clinic and cannot handle emergencies. For chest pain, breathing difficulty, heavy bleeding, or unconsciousness, call 108 or go to the nearest hospital emergency department immediately.',
      enabled: true,
    },
  ],
  services: [
    {
      name: 'General Consultation',
      description: 'Fever, infections, BP, diabetes review, and general health concerns with Dr. Rahul Menon.',
      priceMinor: 50_000,
      currency: 'INR',
      durationMin: 15,
    },
    {
      name: 'Pediatric Checkup',
      description: 'Child wellness visits, growth monitoring, and vaccination advice with Dr. Priya Nair.',
      priceMinor: 60_000,
      currency: 'INR',
      durationMin: 20,
    },
    {
      name: 'Dental Cleaning',
      description: 'Scaling and polishing with an oral health check by Dr. Aisha Rahman.',
      priceMinor: 120_000,
      currency: 'INR',
      durationMin: 45,
    },
  ],
  hours: {
    weekly: [0, 1, 2, 3, 4, 5, 6].map((day) =>
      day === 0
        ? { day, closed: true, slots: [] }
        : {
            day,
            closed: false,
            slots: [
              { open: '09:00', close: '13:00' },
              { open: '16:30', close: '20:30' },
            ],
          },
    ),
    exceptions: [],
  },
  bot: {
    persona: 'Warm, professional clinic receptionist answering in concise English and Manglish.',
    languages: ['en', 'ml'],
    fallbackReply: 'Thank you for contacting Al-Shifa Family Health Clinic! Our front desk will reply to you shortly.',
    handoffKeywords: ['human', 'staff', 'call me', 'emergency'],
    captureFields: ['name', 'requirement', 'preferred_time'] as const,
  },
};

async function main() {
  loadLocalEnv();
  const env = getEnv();

  const email = (process.env.SEED_OWNER_EMAIL ?? 'owner@example.com').toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD ?? DEFAULT_PASSWORD;
  if (env.NODE_ENV === 'production' && password === DEFAULT_PASSWORD) {
    throw new Error('Refusing to seed the default password in production. Set SEED_OWNER_PASSWORD.');
  }

  await connectDB();

  let user = await User.findOne({ email });
  let tenant = await BusinessTenant.findOne({ slug: SEED_TENANT_SLUG });

  if (user?.tenantId && tenant && !user.tenantId.equals(tenant._id)) {
    throw new Error(`${email} already belongs to a different tenant (${user.tenantId}). Use SEED_OWNER_EMAIL.`);
  }

  // A phone number can only route to one tenant (partial unique index), so check
  // up front so a re-run reports a clear conflict instead of an E11000.
  const numberHolder = await BusinessTenant.findOne({
    'whatsapp.phoneNumberId': SEED_PHONE_NUMBER_ID,
    ...(tenant ? { _id: { $ne: tenant._id } } : {}),
  }).select('slug');
  if (numberHolder) {
    throw new Error(`phone_number_id ${SEED_PHONE_NUMBER_ID} is already bound to tenant "${numberHolder.slug}".`);
  }

  const userId = user?._id ?? new mongoose.Types.ObjectId();
  const created: string[] = [];

  const accessToken = process.env.SEED_WA_ACCESS_TOKEN;

  if (!tenant) {
    tenant = await BusinessTenant.create({
      name: 'Al-Shifa Family Health Clinic',
      slug: SEED_TENANT_SLUG,
      category: 'clinic',
      ownerId: userId,
      timezone: 'Asia/Kolkata',
      botEnabled: true,
      whatsapp: {
        phoneNumberId: SEED_PHONE_NUMBER_ID,
        displayPhoneNumber: process.env.SEED_DISPLAY_PHONE ?? '+91 98765 43210',
        ...(accessToken
          ? { accessTokenEnc: encrypt(accessToken), status: 'connected', connectedAt: new Date() }
          : { status: 'disconnected' }),
      },
      subscription: {
        plan: 'starter',
        status: 'active',
        replyQuota: 1000,
        repliesUsed: 0,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    created.push('tenant');
  } else if (accessToken) {
    tenant = await BusinessTenant.findOneAndUpdate(
      { _id: tenant._id },
      {
        $set: {
          'whatsapp.accessTokenEnc': encrypt(accessToken),
          'whatsapp.status': 'connected',
          'whatsapp.connectedAt': new Date(),
        },
      },
      { returnDocument: 'after' },
    ).orFail();
    created.push('WhatsApp token');
  }

  if (!user) {
    user = await User.create({
      _id: userId,
      email,
      passwordHash: await hashPassword(password),
      name: 'Clinic Owner',
      role: 'owner',
      tenantId: tenant._id,
    });
    created.push('owner');
  } else if (!user.tenantId) {
    await User.updateOne({ _id: user._id }, { $set: { tenantId: tenant._id } });
  }

  if (!tenant.ownerId.equals(user._id)) {
    await BusinessTenant.updateOne({ _id: tenant._id }, { $set: { ownerId: user._id } });
  }

  const kbExists = await KnowledgeBase.exists({ tenantId: tenant._id });
  if (!kbExists || hasFlag('--reset-kb')) {
    await KnowledgeBase.findOneAndUpdate(
      { tenantId: tenant._id },
      { $set: KNOWLEDGE_BASE, $inc: { version: 1 }, $setOnInsert: { tenantId: tenant._id } },
      { upsert: true, runValidators: true },
    );
    created.push(kbExists ? 'knowledge base (reset)' : 'knowledge base');
  }

  const passwordNote = created.includes('owner')
    ? process.env.SEED_OWNER_PASSWORD
      ? '(from SEED_OWNER_PASSWORD)'
      : password
    : '(unchanged, existing account)';

  console.log(created.length ? `Seeded: ${created.join(', ')}` : 'Already seeded, nothing to do.');
  console.log(`
  Login            http://localhost:3000/auth/login
  Email            ${email}
  Password         ${passwordNote}
  Tenant ID        ${tenant._id}
  Tenant slug      ${tenant.slug}
  phone_number_id  ${tenant.whatsapp?.phoneNumberId}
  WhatsApp token   ${tenant.whatsapp?.status === 'connected' ? 'stored (encrypted)' : 'none; set SEED_WA_ACCESS_TOKEN to send real replies'}
`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
