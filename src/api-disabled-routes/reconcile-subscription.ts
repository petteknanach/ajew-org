import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia'
});

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

// Called by success.astro when the session_id is in the URL.
// Looks up the Stripe checkout session's billing email, finds the subscription
// that was stored under it, and copies/updates it to the user's auth email.
export async function POST({ request }) {
  try {
    const { sessionId, authEmail } = await request.json();

    if (!sessionId || !authEmail) {
      return new Response(JSON.stringify({ error: 'sessionId and authEmail required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const normalizedAuth = authEmail.toLowerCase();

    // Retrieve the Stripe checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const billingEmail = (session.customer_details?.email || session.customer_email || '').toLowerCase();

    if (!billingEmail) {
      return new Response(JSON.stringify({ error: 'No billing email in Stripe session' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (billingEmail === normalizedAuth) {
      // Emails match — nothing to reconcile
      return new Response(JSON.stringify({ ok: true, matched: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Look up subscription stored under billing email
    const { data: billingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('email', billingEmail)
      .single();

    if (!billingSub || billingSub.tier === 'free') {
      return new Response(JSON.stringify({ error: 'No paid subscription found for billing email' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Copy subscription to auth email (upsert so we don't overwrite a better tier)
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        email: normalizedAuth,
        tier: billingSub.tier,
        expiry: billingSub.expiry,
        username: billingSub.username,
        stripe_customer_id: billingSub.stripe_customer_id,
        stripe_subscription_id: billingSub.stripe_subscription_id,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (error) throw error;

    console.log(`✅ Reconciled: billing=${billingEmail} → auth=${normalizedAuth} (${billingSub.tier})`);

    return new Response(JSON.stringify({ ok: true, reconciled: true, tier: billingSub.tier }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('reconcile-subscription error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
