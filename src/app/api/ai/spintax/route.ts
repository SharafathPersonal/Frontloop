import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'The Spintax Generation API is retired. Please use /api/ai/polish for high-velocity templates.' },
    { status: 410 }
  );
}
