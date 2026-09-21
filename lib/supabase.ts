import { createClient } from '@supabase/supabase-js';

function getValidSupabaseUrl(url?: string): string {
  const fallback = 'https://rufnrfwghtgicecnzljj.supabase.co';
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback;
  
  // If user entered without protocol, prepend https://
  const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
    ? trimmed 
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return withProtocol;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function getValidKey(key: string | undefined, fallback: string): string {
  if (!key || typeof key !== 'string') return fallback;
  const trimmed = key.trim().replace(/^["']|["']$/g, '');
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return fallback;
  return trimmed;
}

const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseUrl = getValidSupabaseUrl(rawUrl);

const rawAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseAnonKey = getValidKey(rawAnonKey, 'sb_publishable_6eN_ZLbhV0u9zjm2Vy7w1Q_Fanjk_Jq');

const rawServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;
const supabaseServiceKey = getValidKey(rawServiceKey, 'sb_secret_EhqjXHXl6q60WG0V8rYWyg_0XTO-AHa');

// Public/Reader client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin/Writer client for server tasks bypassing RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

