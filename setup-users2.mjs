import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAccounts() {
  const usersToCreate = [
    {
      email: 'naanaach@gmail.com',
      password: 'ajewananachalways',
      name: 'Simcha',
      tier: 'super'
    },
    {
      email: 'petteknanach@gmail.com',
      password: 'eliezer318',
      name: 'Pettek Nanach',
      tier: 'super'
    }
  ];

  for (const u of usersToCreate) {
    // 2. Add Subscription (without expiry for now, depending on the schema)
    console.log(`Granting '${u.tier}' subscription to ${u.email}...`);
    const { error: subError } = await supabase.from('subscriptions').upsert({
      email: u.email,
      tier: u.tier,
      username: u.name
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
