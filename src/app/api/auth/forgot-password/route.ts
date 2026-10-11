// TODO(phase-2): hashed single-use token in a TTL collection + Resend email.
export async function POST() {
  return Response.json({ error: 'Password reset is not available yet. Please contact support.' }, { status: 501 });
}
