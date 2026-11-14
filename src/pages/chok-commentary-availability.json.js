import { commentaryAvailability } from '../lib/chok-commentary-availability.mjs';

// Astro prerenders this once per ordinary publication; no server process needed.
export const prerender = true;
export function GET() {
  return new Response(JSON.stringify(commentaryAvailability()), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
