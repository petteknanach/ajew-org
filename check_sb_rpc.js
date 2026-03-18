import { createClient } from '@supabase/supabase-js';
const url = 'https://ekggvujbuusvgmrertgp.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgwNDEwOCwiZXhwIjoyMDg2MzgwMTA4fQ.OchcZ7itnXwkkCnzcWjbCU-CzGUIXdtG4IMq8GzWYLc';

async function check() {
  const res = await fetch(url + '/rest/v1/', { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }});
  const data = await res.json();
  const paths = Object.keys(data.paths).filter(p => p.startsWith('/rpc/'));
  console.log('RPCs:', paths);
}
check();
