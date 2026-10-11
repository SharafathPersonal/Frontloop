// TODO(phase-2): verify Cashfree order and activate tenant subscription.
export async function POST() {
  return Response.json({ error: 'Checkout is being migrated.' }, { status: 501 });
}
