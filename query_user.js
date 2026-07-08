require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.auth.signInWithPassword({ email: 'test@example.com', password: 'password123' }).then(() => {
  supabase.auth.getUser().then(({ data }) => console.log(JSON.stringify(data.user?.user_metadata, null, 2)));
});
