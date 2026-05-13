import { createClient } from '@supabase/supabase-js';

export const prerender = false;

// Static Stripe payment link — we append ?prefilled_email= so Stripe pre-fills
// the billing email with the user's auth email, preventing the mismatch where
// the webhook stores the subscription under a different email than the session.
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/00w5kD89Ld3Y9F1fsUfUQ03';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export async function GET({ request }) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    let authEmail: string | null = null;
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      authEmail = user?.email?.toLowerCase() || null;
    }

    const url = authEmail
      ? `${STRIPE_PAYMENT_LINK}?prefilled_email=${encodeURIComponent(authEmail)}`
      : STRIPE_PAYMENT_LINK;

    return new Response(JSON.stringify({ url }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ url: STRIPE_PAYMENT_LINK }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
