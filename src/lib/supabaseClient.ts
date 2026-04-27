import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.PUBLIC_SUPABASE_URL || 'https://ekggvujbuusvgmrertgp.supabase.co';
const supabaseAnonKey = import.meta.env?.PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_q6XD_TD8KOQuphI30Gmi5Q_3PBAXQHo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);