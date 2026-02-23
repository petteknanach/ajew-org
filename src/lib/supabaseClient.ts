import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrZ2d2dWpidXVzdmdtcmVydGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NDY4MjUsImV4cCI6MjA1NTUyMjgyNX0.E4D1Z2eMaUDS2ddwSvZr8Ot8P-yi6fKZe7Zkv2r68g';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);