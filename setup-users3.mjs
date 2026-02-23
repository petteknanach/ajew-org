import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAccounts() {
  const usersToCreate = [
    { email: 'naanaach@gmail.com', tier: 'super' },
    { email: 'petteknanach@gmail.com', tier: 'super' }
  ];

  for (const u of usersToCreate) {
    console.log(`Granting '${u.tier}' subscription to ${u.email}...`);
    const { error: subError } = await supabase.from('subscriptions').upsert({
      email: u.email,
      tier: u.tier
    }, { onConflict: 'email' });

    if (subError) {
      console.error(`Failed to grant subscription for ${u.email}:`, subError.message);
    } else {
      console.log(`Successfully granted '${u.tier}' subscription to ${u.email}`);
    }
  }

  console.log('\n--- Setup Complete ---');
}

setupAccounts();
