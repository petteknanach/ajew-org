import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminAuth = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

async function setSubscriptions() {
  console.log('Upserting subscriptions table using service role...');
  const { error: subErr1 } = await adminAuth.from('subscriptions').upsert({
    email: 'naanaach@gmail.com',
    tier: 'super'
  }, { onConflict: 'email' });
  console.log('SubErr1:', subErr1 ? subErr1.message : 'Success');

  const { error: subErr2 } = await adminAuth.from('subscriptions').upsert({
    email: 'petteknanach@gmail.com',
    tier: 'super'
  }, { onConflict: 'email' });
  console.log('SubErr2:', subErr2 ? subErr2.message : 'Success');
}

setSubscriptions().catch(console.error);
