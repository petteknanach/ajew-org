
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;


// Admin-only: Add subscription manually (uses service key)
export async function POST({ request }: APIContext) {
  if (!supabaseKey) {
    return new Response(JSON.stringify({ error: 'Service key not configured' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { email, tier } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        email: email.toLowerCase(),
        tier: tier || 'basic',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (error) {
      return new Response(JSON.stringify({ error: error.message, details: error }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, email: email.toLowerCase(), tier: tier || 'basic' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
