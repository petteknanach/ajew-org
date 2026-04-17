import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo';

const supabase = createClient(supabaseUrl, supabaseKey);

export const prerender = false;

// Comments reuse the `messages` table with room="teaching:<teachingId>"
// This avoids a schema migration and lets "Share to chat" simply repost into room="general".

function roomForTeaching(teachingId: string): string {
  return `teaching:${teachingId}`;
}

export async function GET({ url }) {
  const teachingId = url.searchParams.get('teaching');
  if (!teachingId) {
    return new Response(JSON.stringify({ error: 'Missing teaching param' }), { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('id, username, email, message, created_at')
      .eq('room', roomForTeaching(teachingId))
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
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid Token' }), { status: 401 });
    }

    const body = await request.json();
    const { teachingId, teachingTitle, message, shareToChat } = body;
    if (!teachingId || !message) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }

    const userEmail = (user.email || '').toLowerCase();
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('tier')
      .eq('email', userEmail)
      .single();

    if (!sub || sub.tier === 'free') {
      return new Response(JSON.stringify({ error: 'Subscription required to comment' }), { status: 403 });
    }

    const trimmed = String(message).slice(0, 1000);
    const username = user.user_metadata?.display_name || userEmail.split('@')[0] || 'User';

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room: roomForTeaching(teachingId),
        username,
        message: trimmed,
        email: userEmail
      })
      .select()
      .single();

    if (error) throw error;

    // Optional: mirror to chat room "general" with a teaching-reference prefix
    if (shareToChat) {
      const refTitle = (teachingTitle || teachingId).toString().slice(0, 80);
      const mirrored = `💬 On "${refTitle}": ${trimmed}`.slice(0, 500);
      await supabase.from('messages').insert({
        room: 'general',
        username,
        message: mirrored,
        email: userEmail
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
