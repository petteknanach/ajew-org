import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

export const prerender = false;

// Admin endpoint to add subscription
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { email, name, tier, password } = body;

    // Simple admin password check
    if (password !== 'NaNach2026!') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!email || !name || !tier) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 'Content-Type' : 'application/json' }
      });
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        email: email.toLowerCase(),
        username: name,
        tier: tier,
        status: 'active',
        expiry: '2027-12-31',
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, email: email }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
