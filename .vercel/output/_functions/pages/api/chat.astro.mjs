import { createClient } from '@supabase/supabase-js';
export { renderers } from '../../renderers.mjs';

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo", "PUBLIC_SUPABASE_URL": "https://ekggvujbuusvgmrertgp.supabase.co", "SITE": "https://ajew.org", "SSR": true};
const supabaseUrl = Object.assign(__vite_import_meta_env__, { OS: process.env.OS, PUBLIC: process.env.PUBLIC })?.PUBLIC_SUPABASE_URL || "https://ekggvujbuusvgmrertgp.supabase.co";
const supabaseKey = Object.assign(__vite_import_meta_env__, { OS: process.env.OS, PUBLIC: process.env.PUBLIC })?.PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo";
const supabase = createClient(supabaseUrl, supabaseKey);
const prerender = false;
async function GET({ url }) {
  const room = url.searchParams.get("room") || "general";
  try {
    const { data, error } = await supabase.from("messages").select("*").eq("room", room).order("created_at", { ascending: false }).limit(100);
    if (error && error.code !== "PGRST116") throw error;
    return new Response(JSON.stringify(data || []), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
async function POST({ request }) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401 });
    }
    const body = await request.json();
    const { room, message } = body;
    if (!room || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    const { data: sub } = await supabase.from("subscriptions").select("tier").eq("email", user.email).single();
    if (!sub || sub.tier === "free") {
      return new Response(JSON.stringify({ error: "Subscription required" }), { status: 403 });
    }
    const { data, error } = await supabase.from("messages").insert({
      room,
      username: user.user_metadata?.display_name || "User",
      message: message.slice(0, 500),
      email: user.email
    }).select().single();
    if (error) throw error;
    return new Response(JSON.stringify(data), {
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
