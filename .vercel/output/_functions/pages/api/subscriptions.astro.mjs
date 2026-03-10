import { createClient } from '@supabase/supabase-js';
export { renderers } from '../../renderers.mjs';

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo", "PUBLIC_SUPABASE_URL": "https://ekggvujbuusvgmrertgp.supabase.co", "SITE": "https://ajew.org", "SSR": true};
const supabaseUrl = Object.assign(__vite_import_meta_env__, { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_rp7ehqQtetDxnO-3GcyIJg_uQttixrE", OS: process.env.OS, PUBLIC: process.env.PUBLIC })?.PUBLIC_SUPABASE_URL || "https://ekggvujbuusvgmrertgp.supabase.co";
const supabaseKey = "sb_secret_rp7ehqQtetDxnO-3GcyIJg_uQttixrE";
const supabase = createClient(supabaseUrl, supabaseKey);
const ADMIN_PASSWORD = "NaNach2026!";
const prerender = false;
async function GET({ url }) {
  const email = url.searchParams.get("email");
  if (!email) {
    return new Response(JSON.stringify({ error: "Email required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const { data, error } = await supabase.from("subscriptions").select("*").eq("email", email.toLowerCase()).single();
    if (error || !data) {
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      subscribed: true,
      tier: data.tier || "basic",
      expiry: data.expiry,
      username: data.username
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
async function POST({ request }) {
  try {
    const body = await request.json();
    const { email, tier, expiry, username, name, adminPassword } = body;
    if (adminPassword !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Invalid admin password" }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { error } = await supabase.from("subscriptions").upsert({
      email: email.toLowerCase(),
      tier: tier || "free",
      expiry: expiry || "2027-12-31",
      username: username || name || email.split("@")[0],
      name,
      status: "active",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }, { onConflict: "email" });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, email }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
