import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get('admin_session');
    const adminSecret = process.env.ADMIN_SECURE_TOKEN;

    if (!adminSession?.value || !adminSecret || adminSession.value !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pricing_tiers, settings } = await req.json();

    if (!Array.isArray(pricing_tiers)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Missing service role key' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Upsert tiers
    // We map to match the table struct, ignoring per_message_rate as it is generated
    const upsertData = pricing_tiers.map(t => ({
      id: t.id,
      amount_inr: t.amount_inr,
      credit_count: t.credit_count,
      updated_at: new Date().toISOString()
    }));

    const { error: upsertError } = await supabaseAdmin
      .from('pricing_tiers')
      .upsert(upsertData, { onConflict: 'id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    if (settings) {
      const settingsUpsert = [
        { key: 'whatsapp_credit_cost', value: Number(settings.whatsapp_credit_cost), updated_at: new Date().toISOString() },
        { key: 'email_credit_cost', value: Number(settings.email_credit_cost), updated_at: new Date().toISOString() }
      ];
      const { error: settingsError } = await supabaseAdmin
        .from('system_settings')
        .upsert(settingsUpsert, { onConflict: 'key' });
        
      if (settingsError) {
        return NextResponse.json({ error: settingsError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
