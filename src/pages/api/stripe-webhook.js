import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '')

const supabaseUrl = 'https://ekggvujbuusvgmrertgp.supabase.co'
const supabaseServiceKey = 'PASTE_SERVICE_ROLE_HERE' // Get from API page service_role

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request) {
  const sig = request.headers.get('stripe-signature')
  const body = await request.text()

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET') || '') // From Stripe dashboard
  } catch (err) {
    return new Response(`Webhook signature verification failed.`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_details?.email
    const customerId = session.customer

    if (email && customerId) {
      const { error } = await supabase
        .from('subscriptions')
        .upsert({
          email,
          stripe_customer_id: customerId,
          tier: 'basic', // Or map from price_id
          status: 'active',
          expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1yr
        })

      if (error) console.error('Upsert error:', error)
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
}