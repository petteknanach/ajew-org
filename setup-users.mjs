import { createClient } from '@supabase/supabase-js';

// Requires SERVICE_ROLE key to bypass RLS and create users directly
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'YOUR_NEW_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_NEW_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupAccounts() {
  console.log('--- Setting up Admin Accounts ---');
  
  if (supabaseUrl === 'YOUR_NEW_SUPABASE_URL') {
    console.error('ERROR: You must set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file before running this script.');
    console.error('The old Supabase project (ekggvujbuusvgmrertgp) was deleted/404, which is why the previous bots failed.');
    process.exit(1);
  }

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
    console.log(`\nCreating user: ${u.email}...`);
    
    // 1. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { display_name: u.name }
    });

    if (authError) {
      console.error(`Failed to create auth user for ${u.email}:`, authError.message);
      // We continue to upsert subscription anyway in case they already exist
    } else {
      console.log(`Successfully created auth user for ${u.email}`);
    }

    // 2. Add Subscription
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
