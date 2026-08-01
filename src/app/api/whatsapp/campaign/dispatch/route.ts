import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    {
      error: 'This un-gated campaign dispatch endpoint has been retired for security reasons. Please use the credit-gated /api/campaigns/send endpoint.',
    },
    { status: 410 }
  );
}
