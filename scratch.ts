import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  const { data: shops } = await supabase.from('shops').select('*').limit(1);
  if (!shops || shops.length === 0) {
    console.log('No shops found');
    return;
  }
  const shop = shops[0];
  console.log('Shop ID:', shop.id);
  
  const { data: subs, error } = await supabase.from('push_subscriptions').select('*').eq('shop_id', shop.id);
  if (error) {
    console.error('Error fetching subs:', error);
    return;
  }
  
  console.log('Subs count:', subs?.length);
  console.log('Subs:', subs);

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('Missing VAPID keys');
    return;
  }

  webpush.setVapidDetails(
    'mailto:support@trueattendly.online',
    vapidPublicKey,
    vapidPrivateKey
  );

  for (const sub of subs || []) {
    try {
      console.log('Sending to', sub.endpoint);
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
          }
        },
        JSON.stringify({ title: 'Test', body: 'Test' })
      );
      console.log('Sent successfully');
    } catch (e: any) {
      console.error('Error sending:', e.statusCode, e.body, e.message);
    }
  }
}

test();
