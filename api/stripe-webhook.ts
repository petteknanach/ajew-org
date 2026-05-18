
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia'
});

const supabaseUrl = process.env.SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_KEY not set — webhook cannot write to DB');
}

const supabase = createClient(supabaseUrl, supabaseKey || '');


// Stripe webhook handler
export async function POST({ request }) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'No signature' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Prefer auth_email from metadata (set when user checks out while logged in)
        // so the subscription is stored under the same email as their login session.
        const billingEmail = session.customer_details?.email || session.customer_email;
        const customerEmail = session.metadata?.auth_email || billingEmail;

        if (!customerEmail) {
          console.log('No email in session:', session.id);
          break;
        }

        // Determine tier based on amount paid (line_items isn't on session by default)
        // $1 = basic/year, $5 = premium/month, $10 = super/month
        let tier = 'basic';
        let expiry: string | null = null;

        const amountTotal = session.amount_total || 0; // in cents
        if (amountTotal >= 1000) {
          tier = 'super';
          expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else if (amountTotal >= 500) {
          tier = 'premium';
          expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          tier = 'basic';
          expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        }

        // One-time donations (mode=payment with donation link) shouldn't change tier
        if (session.mode === 'payment' && amountTotal < 100) {
          console.log(`Donation received from ${customerEmail}, no tier change`);
          break;
        }

        // Extract username from metadata or default
        const username = session.metadata?.username || customerEmail.split('@')[0];

        // Upsert subscription in Supabase (only columns that exist in the table)
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            email: customerEmail.toLowerCase(),
            tier,
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });

        if (error) {
          console.error('Supabase upsert error:', error);
        } else {
          console.log(`✅ Subscribed ${customerEmail} to ${tier}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        
        // Get customer email
        const { data: customer } = await stripe.customers.retrieve(subscription.customer);
        const customerEmail = customer?.email;

        if (!customerEmail) break;

        let tier = 'basic';
        if (subscription.status === 'active') {
          const priceId = subscription.items.data[0]?.price.id;
          if (priceId === 'price_premium_id') tier = 'premium';
          else if (priceId === 'price_super_id') tier = 'super';
        } else {
          tier = 'free';
        }

        const expiry = subscription.current_period_end 
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        await supabase
          .from('subscriptions')
          .upsert({
            email: customerEmail.toLowerCase(),
            tier,
            expiry,
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });

        console.log(`🔄 Updated ${customerEmail} to ${tier}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        const { data: customer } = await stripe.customers.retrieve(subscription.customer);
        const customerEmail = customer?.email;

        if (!customerEmail) break;

        await supabase
          .from('subscriptions')
          .upsert({
            email: customerEmail.toLowerCase(),
            tier: 'free',
            expiry: null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'email' });

        console.log(`❌ Unsubscribed ${customerEmail}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
