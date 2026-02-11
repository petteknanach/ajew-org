import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co'
const supabaseKey = 'PASTE_ANON_KEY_HERE' // Replace with anon key

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
