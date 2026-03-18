import { createClient } from '@supabase/supabase-js';
const url = 'https://ekggvujbuusvgmrertgp.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgwNDEwOCwiZXhwIjoyMDg2MzgwMTA4fQ.OchcZ7itnXwkkCnzcWjbCU-CzGUIXdtG4IMq8GzWYLc';
const sb = createClient(url, key);

async function check() {
  // Let's try to query an arbitrary table to see if service_role works
  const { data, error } = await sb.from('subscriptions').select('*').limit(1);
  console.log('subs:', data, error);
}
check();
