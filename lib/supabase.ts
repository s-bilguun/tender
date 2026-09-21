import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rufnrfwghtgicecnzljj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_6eN_ZLbhV0u9zjm2Vy7w1Q_Fanjk_Jq';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_EhqjXHXl6q60WG0V8rYWyg_0XTO-AHa';

// Public client for browser / read queries
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend sync / writing tenders bypassing RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
