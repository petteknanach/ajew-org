import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDQxMDgsImV4cCI6MjA4NjM4MDEwOH0.BYxzLgjFhoLRY5kwQymbj33HG8OeB4iwiPPtUbdAr4E'

const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET() {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('*')

  if (error) console.error('Supabase error:', error)
  
  return new Response(JSON.stringify(subscriptions || []), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
