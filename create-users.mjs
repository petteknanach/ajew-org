import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5OTc5NTYsImV4cCI6MjA0OTU3Mzk1Nn0.N3k7nKJl7G1K8T5tMl9QwVZzVxG4j9XfJlD0Y1sKqJY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function create() {
  console.log('Creating Simcha (naanaach@gmail.com)...');
  const res1 = await supabase.auth.signUp({
    email: 'naanaach@gmail.com',
    password: 'ajewananachalways',
    options: { data: { display_name: 'Simcha' } }
  });
  console.log('Res1 Auth:', res1.data, res1.error?.message);

  console.log('Creating Pettek (petteknanach@gmail.com)...');
  const res2 = await supabase.auth.signUp({
    email: 'petteknanach@gmail.com',
    password: 'eliezer318',
    options: { data: { display_name: 'Pettek Nanach' } }
  });
  console.log('Res2 Auth:', res2.data, res2.error?.message);

  console.log('Upserting subscriptions table...');
  const { error: subErr1 } = await supabase.from('subscriptions').upsert({
    email: 'naanaach@gmail.com',
    username: 'Simcha',
    tier: 'super',
    status: 'active',
    expiry: '2030-12-31',
    updated_at: new Date().toISOString()
  });
  console.log('SubErr1:', subErr1?.message);

  const { error: subErr2 } = await supabase.from('subscriptions').upsert({
    email: 'petteknanach@gmail.com',
    username: 'Pettek Nanach',
    tier: 'super',
    status: 'active',
    expiry: '2030-12-31',
    updated_at: new Date().toISOString()
  });
  console.log('SubErr2:', subErr2?.message);
}

create().catch(console.error);
