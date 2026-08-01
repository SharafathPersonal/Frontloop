import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch { /* noop */ }
        },
      },
    },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const requestedMerchantId = searchParams.get('merchantId');
    if (requestedMerchantId && requestedMerchantId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized: Cannot export leads belonging to another merchant' }, { status: 403 });
    }
    const merchantId = user.id;

    // 1. Fetch leads for this merchant
    // (We export all available leads or unexported logic can be handled via frontend state if needed)
    const { data: leads, error: fetchError } = await supabase
      .from('customers_master')
      .select('id, whatsapp_number, customer_name, created_at')
      .eq('shop_id', merchantId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      return NextResponse.json({ error: 'Database fetch error' }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return new NextResponse(null, { status: 204 });
    }

    // 2. Generate the VCF payload
    let vcfContent = '';
    let counter = 1;

    for (const contact of leads) {
      const name = contact.customer_name && contact.customer_name !== 'Unknown' 
        ? contact.customer_name 
        : `Customer ${counter}`;
      
      const phone = contact.whatsapp_number.includes('@') 
        ? contact.whatsapp_number.split('@')[0] 
        : contact.whatsapp_number;
        
      vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTEL;TYPE=CELL:${phone}\nEND:VCARD\n`;
      counter++;
    }

    // 4. Return the VCF file with immediate download headers
    return new NextResponse(vcfContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard',
        'Content-Disposition': 'attachment; filename="new_leads.vcf"'
      }
    });

  } catch (err) {
    console.error('[EXPORT_VCF_ERROR]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
