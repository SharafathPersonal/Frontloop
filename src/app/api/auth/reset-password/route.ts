// TODO(phase-2): verify sha256(token) + expiry, set new hash, $inc sessionVersion.
export async function POST() {
  return Response.json({ error: 'Password reset is not available yet. Please contact support.' }, { status: 501 });
}
