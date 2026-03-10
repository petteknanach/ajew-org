import { createClient } from '@supabase/supabase-js';
export { renderers } from '../../renderers.mjs';

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo", "PUBLIC_SUPABASE_URL": "https://ekggvujbuusvgmrertgp.supabase.co", "SITE": "https://ajew.org", "SSR": true};
const supabaseUrl = Object.assign(__vite_import_meta_env__, { SUPABASE_SERVICE_ROLE_KEY: "sb_secret_rp7ehqQtetDxnO-3GcyIJg_uQttixrE", OS: process.env.OS, PUBLIC: process.env.PUBLIC })?.PUBLIC_SUPABASE_URL || "https://ekggvujbuusvgmrertgp.supabase.co";
const supabaseKey = "sb_secret_rp7ehqQtetDxnO-3GcyIJg_uQttixrE";
const supabase = createClient(supabaseUrl, supabaseKey);
const prerender = false;
async function POST({ request }) {
  try {
    const body = await request.json();
    const { email, name, username } = body;
    if (!email || !name) {
      return new Response(JSON.stringify({ error: "Email and name required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { data: existing } = await supabase.from("subscriptions").select("*").eq("email", email.toLowerCase()).single();
    if (existing) {
      return new Response(JSON.stringify({
        success: true,
        user: existing,
        message: "Welcome back!"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const { data, error } = await supabase.from("subscriptions").insert({
      email: email.toLowerCase(),
      tier: "free"
    }).select().single();
    if (error) throw error;
    return new Response(JSON.stringify({
      success: true,
      user: data,
      message: "Account created! Please subscribe to access chat."
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
