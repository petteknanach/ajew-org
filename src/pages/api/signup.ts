import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co';
// Use service role key for admin operations
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5OTc5NTYsImV4cCI6MjA0OTU3Mzk1Nn0.N3k7nKJl7G1K8T5tMl9QwVZzVxG4j9XfJlD0Y1sKqJY';

const supabase = createClient(supabaseUrl, supabaseKey);

export const prerender = false;

// Signup - create free account
export async function POST({ request }) {
  try {
    const body = await request.json();
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
        username: username || name,
        name: name,
        tier: 'free',
        status: 'active',
        created_at: new Date().toISOString()
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
