// TODO(phase-1): replaced by /api/whatsapp/webhook (HMAC-verified ingest → after() reply pipeline).
// This path will re-export that handler so the Meta App callback URL keeps working.
const notImplemented = () =>
  Response.json({ error: 'WhatsApp webhook is being migrated.' }, { status: 501 });

export const GET = notImplemented;
export const POST = notImplemented;
