import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseKey = import.meta.env?.SUPABASE_SERVICE_KEY;

export const prerender = false;

// Admin-only: Add subscription manually (uses service key)
export async function POST({ request }: { request: Request }) {
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
        expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
