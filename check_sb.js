import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://ekggvujbuusvgmrertgp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDgwNDEwOCwiZXhwIjoyMDg2MzgwMTA4fQ.OchcZ7itnXwkkCnzcWjbCU-CzGUIXdtG4IMq8GzWYLc');
async function check() {
  const t1 = await sb.from('books').select('*').limit(1);
  console.log('books error:', t1.error);
}
check();
