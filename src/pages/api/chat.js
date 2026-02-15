import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDQxMDgsImV4cCI6MjA4NjM4MDEwOH0.BYxzLgjFhoLRY5kwQymbj33HG8OeB4iwiPPtbdAr4E'

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET({ url }) {
  const room = url.searchParams.get('room') || 'general'
  const limit = parseInt(url.searchParams.get('limit') || '50')
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room', room)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify({ messages: data || [] }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function POST({ request }) {
  try {
    const body = await request.json()
    const { room, message, user_id, user_name } = body
    
    if (!message || !message.trim()) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Insert the message
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        room: room || 'general',
        user_id: user_id || 'guest',
        user_name: user_name || 'Guest',
        message: message.trim()
      })
      .select()
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({ success: true, message: data[0] }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
