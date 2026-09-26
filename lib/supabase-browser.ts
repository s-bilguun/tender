import { createClient } from '@supabase/supabase-js';

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const supabaseBrowser = url && anonKey
  ? createClient(url, anonKey)
  : null;
