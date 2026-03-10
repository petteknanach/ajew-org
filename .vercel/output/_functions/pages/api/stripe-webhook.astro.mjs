import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
export { renderers } from '../../renderers.mjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia"
});
const supabaseUrl = process.env.SUPABASE_URL || "https://ekggvujbuusvgmrertgp.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
const prerender = false;
async function POST({ request }) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "No signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
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
    console.error("Webhook signature verification failed:", err.message);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email || session.customer_email;
        if (!customerEmail) {
          console.log("No email in session:", session.id);
          break;
        }
        let tier = "basic";
        let expiry = null;
        const priceId = session.price_id;
        if (priceId === "price_premium_id") {
          tier = "premium";
          expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
        } else if (priceId === "price_super_id") {
          tier = "super";
          expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
        } else {
          expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString();
        }
        const username = session.metadata?.username || customerEmail.split("@")[0];
        const { error } = await supabase.from("subscriptions").upsert({
          email: customerEmail.toLowerCase(),
          tier,
          expiry,
          username,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }, { onConflict: "email" });
        if (error) {
          console.error("Supabase upsert error:", error);
        } else {
          console.log(`✅ Subscribed ${customerEmail} to ${tier}`);
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const { data: customer } = await stripe.customers.retrieve(subscription.customer);
        const customerEmail = customer?.email;
        if (!customerEmail) break;
        let tier = "basic";
        if (subscription.status === "active") {
          const priceId = subscription.items.data[0]?.price.id;
          if (priceId === "price_premium_id") tier = "premium";
          else if (priceId === "price_super_id") tier = "super";
        } else {
          tier = "free";
        }
        const expiry = subscription.current_period_end ? new Date(subscription.current_period_end * 1e3).toISOString() : null;
        await supabase.from("subscriptions").upsert({
          email: customerEmail.toLowerCase(),
          tier,
          expiry,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }, { onConflict: "email" });
        console.log(`🔄 Updated ${customerEmail} to ${tier}`);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const { data: customer } = await stripe.customers.retrieve(subscription.customer);
        const customerEmail = customer?.email;
        if (!customerEmail) break;
        await supabase.from("subscriptions").upsert({
          email: customerEmail.toLowerCase(),
          tier: "free",
          expiry: null,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }, { onConflict: "email" });
        console.log(`❌ Unsubscribed ${customerEmail}`);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
