const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: w } = await supabase.from('wallets').select('*').limit(1);
  console.log('wallets:', w);
  const { data: s } = await supabase.from('shops').select('*').limit(1);
  console.log('shops:', s);
}
run();
