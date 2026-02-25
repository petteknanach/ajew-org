import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function testAuth() {
  const { data: user1, error: err1 } = await supabase.auth.signInWithPassword({
    email: 'naanaach@gmail.com',
    password: 'ajewananachalways'
  });
  console.log('User1 Login:', err1 ? err1.message : 'Success');

  const { data: user2, error: err2 } = await supabase.auth.signInWithPassword({
    email: 'petteknanach@gmail.com',
    password: 'eliezer318'
  });
  console.log('User2 Login:', err2 ? err2.message : 'Success');
}

testAuth().catch(console.error);
