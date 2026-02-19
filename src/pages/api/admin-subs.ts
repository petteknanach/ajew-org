import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5OTc5NTYsImV4cCI6MjA0OTU3Mzk1Nn0.N3k7nKJl7G1K8T5tMl9QwVZzVxG4j9XfJlD0Y1sKqJY';

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
