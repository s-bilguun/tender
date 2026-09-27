const assert = require('node:assert/strict');
const { classifySourceResponse } = require('./source-response.cjs');

assert.equal(classifySourceResponse({ status: 200, body: '<title>Tenders</title><script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script><p>PDF attachments</p>' }), 'ok');
assert.equal(classifySourceResponse({ status: 200, body: '<p>Protected by Cloudflare</p>' }), 'ok');
assert.equal(classifySourceResponse({ status: 403, body: '<title>Forbidden</title>' }), 'blocked');
assert.equal(classifySourceResponse({ status: 403, body: '<title>Attention Required! | Cloudflare</title><p>Sorry, you have been blocked</p>' }), 'blocked');
assert.equal(classifySourceResponse({ status: 403, mitigated: 'challenge', body: '<title>Just a moment...</title>' }), 'challenge');
assert.equal(classifySourceResponse({ status: 200, mitigated: 'challenge', body: '<html></html>' }), 'challenge');
assert.equal(classifySourceResponse({ status: 200, body: '<title>Just a moment...</title>' }), 'challenge');
assert.equal(classifySourceResponse({ status: 429, body: 'Rate limit reached' }), 'http_error');
assert.equal(classifySourceResponse({ status: 200, body: '[{"description":"Access denied by previous supplier"}]' }), 'ok');
assert.equal(classifySourceResponse({ status: 200, body: '<p>Verify you are human</p>' }), 'challenge');
assert.equal(classifySourceResponse({ status: 403, mitigated: 'challenge', body: 'Access denied until verification completes' }), 'challenge');
console.log('Source response classification checks passed.');
