import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseKey = import.meta.env?.SUPABASE_SERVICE_ROLE_KEY || import.meta.env?.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo';

const supabase = createClient(supabaseUrl, supabaseKey);
const ADMIN_PASSWORD = 'NaNach2026!';

export const prerender = false;

// Get subscription status
export async function GET({ url }) {
  const email = url.searchParams.get('email');
  
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      subscribed: true,
      tier: data.tier || 'basic',
      expiry: data.expiry,
      username: data.username
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// Update subscription (admin with password)
export async function POST({ request }) {
  try {
    const body = await request.json();
    const { email, tier, expiry, username, name, adminPassword } = body;

    // Check admin password
    if (adminPassword !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Invalid admin password' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        email: email.toLowerCase(),
        tier: tier || 'free',
        expiry: expiry || '2027-12-31',
        username: username || name || email.split('@')[0],
        name: name,
        status: 'active',
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
