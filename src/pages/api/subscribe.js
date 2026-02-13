import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDQxMDgsImV4cCI6MjA4NjM4MDEwOH0.BYxzLgjFhoLRY5kwQymbj33HG8OeB4iwiPPtUbdAr4E'

const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST({ request }) {
  try {
    const { email, username } = await request.json()
    
    if (!email || !username) {
      return new Response(JSON.stringify({ error: 'Email and username required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        { 
          email, 
          username,
          tier: 'free',
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
