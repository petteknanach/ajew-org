import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDQxMDgsImV4cCI6MjA4NjM4MDEwOH0.BYxzLgjFhoLRY5kwQymbj33HG8OeB4iwiPPtbdAr4E'

const supabase = createClient(supabaseUrl, supabaseKey)

// GET /api/chats - list all chat rooms
export async function GET({ url }) {
  const path = url.pathname || ''
  
  // List all chat rooms
  if (path === '/api/chats' || path.endsWith('/api/chats')) {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    return new Response(JSON.stringify({ rooms: data || [] }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Get messages for a room
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

export async function POST({ request, url }) {
  const path = url.pathname || ''
  
  // Create a new chat room
  if (path === '/api/chats' || path.endsWith('/api/chats')) {
    try {
      const body = await request.json()
      const { title, description, created_by } = body
      
      if (!title || !title.trim()) {
        return new Response(JSON.stringify({ error: 'Title is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      // Generate a slug from title
      const slug = title.trim().toLowerCase().replace(/[^a-z0-9א-ת]/g, '-').replace(/-+/g, '-')
      
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          title: title.trim(),
          slug: slug,
          description: description || '',
          created_by: created_by || 'anonymous',
          active: true
        })
        .select()
      
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return new Response(JSON.stringify({ success: true, room: data[0] }), {
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
  
  // Send a message (existing endpoint)
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
