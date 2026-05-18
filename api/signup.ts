
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo';

const supabase = createClient(supabaseUrl, supabaseKey);


// Signup - create free account
export async function POST({ request }) {
  try {
    const body = parsedBody;
    const { email, name, username } = body;

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Email and name required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return new Response(JSON.stringify({ 
        success: true, 
        user: existing,
        message: 'Welcome back!' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create new subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        email: email.toLowerCase(),
        tier: 'free'
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ 
      success: true, 
      user: data,
      message: 'Account created! Please subscribe to access chat.' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
