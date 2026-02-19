import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co';
// Using anon key - this should be in public env
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM5OTc5NTYsImV4cCI6MjA0OTU3Mzk1Nn0.N3k7nKJl7G1K8T5tMl9QwVZzVxG4j9XfJlD0Y1sKqJY';

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
    // Return empty array on error - fallback will handle it
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { room, username, message, email } = body;

    if (!room || !message || !username) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert({
        room,
        username: username.slice(0, 20),
        message: message.slice(0, 500),
        email: (email || '').toLowerCase().slice(0, 100)
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
