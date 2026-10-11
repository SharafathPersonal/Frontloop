// TODO(phase-2): signature-verified Cashfree webhook → BusinessTenant.subscription updates.
export async function POST() {
  return Response.json({ error: 'Payment webhook is being migrated.' }, { status: 501 });
}
