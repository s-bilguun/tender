// Read-only verification. Never print keys or request headers.
const { createClient } = require('@supabase/supabase-js');
function isServiceKey(key) {
  if (key.startsWith('sb_secret_')) return true;
  try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'service_role'; }
  catch { return false; }
}
async function verify() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Supabase URL or service key is missing.');
  if (!isServiceKey(key)) throw new Error('The supplied key is not a Supabase service-role or secret key.');
  const client = createClient(url, key, { global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
  const { error } = await client.storage.listBuckets();
  if (error) throw new Error(`Supabase verification failed (HTTP ${error.status || 'unknown'}). Check the project URL and service-role key.`);
  console.log('Supabase service credentials verified.');
}
module.exports = { isServiceKey };
if (require.main === module) verify().catch((error) => { console.error(error.message); process.exitCode = 1; });
