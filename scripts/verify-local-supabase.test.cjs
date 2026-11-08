const assert = require('assert/strict');
const { isServiceKey } = require('./verify-local-supabase.cjs');
const jwt = (role) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
assert.equal(isServiceKey(jwt('service_role')), true);
assert.equal(isServiceKey(jwt('anon')), false);
assert.equal(isServiceKey('sb_publishable_example'), false);
assert.equal(isServiceKey('sb_secret_example'), true);
assert.equal(isServiceKey('invalid'), false);
console.log('Local credential type checks passed.');
