import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo';

const supabase = createClient(supabaseUrl, supabaseKey);

export const prerender = false;

export async function GET({ url }) {
  const room = url.searchParams.get('room') || 'general';
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room', room)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error && error.code !== 'PGRST116') throw error;
    
    return new Response(JSON.stringify(data || []), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  try {
    // 1. Get auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid Token' }), { status: 401 });
    }

    // 2. Parse body
    const body = await request.json();
    const { room, message } = body;
    if (!room || !message) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // 3. Check Subscription Tier (case-insensitive email lookup)
    const userEmail = (user.email || '').toLowerCase();
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('email', userEmail)
      .single();

    if (!sub || sub.tier === 'free') {
      return new Response(JSON.stringify({ error: 'Subscription required' }), { status: 403 });
    }

    // 3b. Store email lowercased for consistency
    const storedEmail = userEmail;

    // 4. Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room,
        username: user.user_metadata?.display_name || 'User',
        message: message.slice(0, 500),
        email: storedEmail
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
