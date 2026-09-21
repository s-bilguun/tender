import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://rufnrfwghtgicecnzljj.supabase.co';

const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_6eN_ZLbhV0u9zjm2Vy7w1Q_Fanjk_Jq';

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  'sb_secret_EhqjXHXl6q60WG0V8rYWyg_0XTO-AHa';

// Public/Reader client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin/Writer client for server tasks bypassing RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
