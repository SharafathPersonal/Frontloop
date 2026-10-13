// TODO(phase-2): WhatsApp Embedded Signup: exchange code, read waba_id/phone_number_id from the
// session event, subscribe app to the WABA, register the number, store encrypt(token) on the tenant.
// Also implement real data deletion for the `signed_request` callback.
const notImplemented = () =>
  Response.json({ error: 'WhatsApp connection is being migrated.' }, { status: 501 });

export const GET = notImplemented;
export const POST = notImplemented;
