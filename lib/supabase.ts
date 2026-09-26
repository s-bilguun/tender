import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseAnonKey = (
  process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
).trim();
const hasValidSupabaseUrl = Boolean(
  supabaseUrl && !/^your[-_ ]/i.test(supabaseUrl),
);
const hasPublicConfig = Boolean(
  hasValidSupabaseUrl && supabaseAnonKey && !/^your[-_ ]/i.test(supabaseAnonKey),
);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (serviceRoleKey && serviceRoleKey === supabaseAnonKey) {
  throw new Error('The Supabase service-role key must be a private service credential, not the public anon key.');
}

// Public client: subject to Supabase RLS policies. Keeping an unavailable proxy
// at build time lets Next compile before deploy secrets are injected; any actual
// query fails loudly and is handled by the calling route's normal error path.
export const supabase = hasPublicConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as ReturnType<typeof createClient>, {
      get() {
        throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      },
    });

// Server-only writer. Missing private credentials disable persistence instead of
// silently falling back to a public key and pretending privileged writes work.
export const supabaseAdmin = hasValidSupabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey)
  : null;
