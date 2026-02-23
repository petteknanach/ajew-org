import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  const { data: messages, error: err1 } = await supabase.from('messages').select('*').limit(1);
  console.log("Messages Error:", err1);
  const { data: subs, error: err2 } = await supabase.from('subscriptions').select('*').limit(1);
  console.log("Subscriptions Error:", err2);
  
  if (!err2 && subs && subs.length > 0) {
    console.log("Subscriptions Data:", Object.keys(subs[0]));
  }
}

inspectSchema();