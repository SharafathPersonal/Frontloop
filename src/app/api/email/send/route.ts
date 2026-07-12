import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123');

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const cookieStore = await cookies();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userClient = createServerClient<any>(
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await req.json();
  const { campaign, targetTags, targetEmails } = payload as {
    campaign: { title: string; subject: string; html_body: string };
    targetTags?: string[];
    targetEmails?: string[];
  };

  if (!campaign?.title?.trim() || !campaign?.subject?.trim() || !campaign?.html_body?.trim()) {
    return NextResponse.json({ ok: false, error: 'Missing required campaign fields.' }, { status: 400 });
  }
  if ((!targetTags || targetTags.length === 0) && (!targetEmails || targetEmails.length === 0)) {
    return NextResponse.json({ ok: false, error: 'No target audience selected (tags or custom emails required).' }, { status: 400 });
  }

  // Fetch shop details to personalize the email sender profile
  const { data: shop } = await userClient
    .from('shops')
    .select('shop_name')
    .eq('id', user.id)
    .maybeSingle();
    
  const shopName = shop?.shop_name || 'Our Shop';
  const shopOwnerEmail = user.email;

  // Resolve recipient emails from customers_master
  const { data: contacts, error: contactsError } = await userClient
    .from('customers_master')
    .select('customer_name, email, tags')
    .eq('shop_id', user.id);

  if (contactsError) {
    return NextResponse.json({ ok: false, error: 'Failed to load contacts.' }, { status: 500 });
  }

  const targetTagsLower = (targetTags || []).map(t => t.toLowerCase().trim());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recipients = (contacts ?? []).filter((c: any) => {
    const tags: string[] = Array.isArray(c.tags) ? c.tags : [];
    return tags.some((t: string) => targetTagsLower.includes(t.toLowerCase().trim()));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }).filter((c: any) => c.email && c.email.trim().length > 0)
    .map(c => ({ email: c.email.toLowerCase().trim() }));

  // Add CSV/Custom emails and deduplicate
  if (targetEmails && targetEmails.length > 0) {
    const customRecipients = targetEmails
      .filter(e => e && e.trim().length > 0)
      .map(e => ({ email: e.toLowerCase().trim() }));
    recipients = [...recipients, ...customRecipients];
  }

  // Remove duplicates by email
  const uniqueEmails = new Set();
  recipients = recipients.filter(c => {
    if (uniqueEmails.has(c.email)) return false;
    uniqueEmails.add(c.email);
    return true;
  });

  if (recipients.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No valid email addresses found for the selected audience.' },
      { status: 400 },
    );
  }

  // Wallet / credit check
  const { data: configData } = await userClient
    .from('system_settings')
    .select('value')
    .eq('key', 'email_credit_cost')
    .maybeSingle();
    
  const emailCreditCost = configData?.value ? Number(configData.value) : 0.5;

  const { data: walletRow } = await userClient
    .from('wallets')
    .select('credits_remaining')
    .eq('shop_id', user.id)
    .maybeSingle();

  const creditsAvailable = walletRow?.credits_remaining ?? 0;
  const requiredCredits = recipients.length * emailCreditCost;
  
  if (creditsAvailable < requiredCredits) {
    return NextResponse.json(
      { ok: false, error: `Insufficient credits. Need ${requiredCredits.toFixed(2)}, have ${Number(creditsAvailable).toFixed(2)}.` },
      { status: 402 },
    );
  }

  // Insert campaign record
  const { data: newCampaign, error: insertError } = await userClient
    .from('email_campaigns')
    .insert({
      shop_id: user.id,
      title: campaign.title,
      subject: campaign.subject,
      html_body: campaign.html_body,
      status: 'processing',
      total_recipients: recipients.length,
      total_sent: 0,
      total_failed: 0,
      target_tags: targetTags || [],
    })
    .select()
    .single();

  if (insertError || !newCampaign) {
    return NextResponse.json({ ok: false, error: 'Failed to create email campaign record.' }, { status: 500 });
  }

  const campaignId: string = newCampaign.id;
  const shopId = user.id;
  const recipientsSnapshot = [...recipients];
  const htmlSnapshot = campaign.html_body;
  const subjectSnapshot = campaign.subject;
  const creditCostSnapshot = emailCreditCost;
  const shopNameSnapshot = shopName;
  const replyToSnapshot = shopOwnerEmail;

  // Background dispatch
  waitUntil(
    (async () => {
      let successCount = 0;
      let failedCount = 0;

      for (const recipient of recipientsSnapshot) {
        try {
          // Deduct credit
          const { error: deductError } = await adminClient.rpc('deduct_credits', {
            p_shop_id: shopId,
            p_amount: creditCostSnapshot,
          });
          if (deductError) throw new Error(`Credit deduction failed: ${deductError.message}`);

          const envEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
          const rawEmail = envEmail.match(/<(.+)>/)?.[1] || envEmail.replace(/["']/g, "");

          const { error: resendError } = await resend.emails.send({
            from: `${shopNameSnapshot} <${rawEmail}>`,
            replyTo: replyToSnapshot,
            to: recipient.email,
            subject: subjectSnapshot,
            html: htmlSnapshot,
          });

          if (resendError) {
            throw new Error(`Resend API Error: ${resendError.message}`);
          }

          successCount++;

          await adminClient.rpc('increment_campaign_sent', {
            campaign_row_id: campaignId,
            quantity: 1,
          });
          await adminClient.rpc('increment_campaign_metric', {
            campaign_row_id: campaignId,
            metric_name: 'delivered',
            quantity: 1,
          });

        } catch {
          failedCount++;
          await adminClient.rpc('increment_campaign_metric', {
            campaign_row_id: campaignId,
            metric_name: 'failed',
            quantity: 1,
          });
        }
      }

      const finalStatus = successCount > 0 ? 'completed' : 'failed';
      await adminClient
        .from('email_campaigns')
        .update({ status: finalStatus, total_failed: failedCount })
        .eq('id', campaignId);
    })(),
  );

  return NextResponse.json(
    { ok: true, data: { campaign_id: campaignId, total_recipients: recipients.length } },
    { status: 202 },
  );
}
