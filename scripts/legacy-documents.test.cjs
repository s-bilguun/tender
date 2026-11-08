const assert = require('assert/strict');
const { extractLegacyDocumentDom, validateLegacyDocuments } = require('./browser-tender-worker.cjs');
const input = (value) => ({ getAttribute: () => value });
const link = (attrs, textContent) => ({ getAttribute: (name) => attrs[name] || null, textContent });
global.document = {
  querySelector: (selector) => ({ '#invitationId': input(' 123 '), '#tenderDocumentId': input(' 456 '), '#tenderId': input('789') })[selector] || null,
  querySelectorAll: () => [
    link({ 'data-fileid': '100' }, ' Нэг  файл.pdf '),
    link({ href: '/mn/download/200' }, 'Хоёр.pdf'),
    link({ 'data-fileid': '100' }, ' Нэг файл.pdf '),
    link({ 'data-fileid': 'invalid' }, 'ignored.pdf'),
  ],
};
const result = validateLegacyDocuments(extractLegacyDocumentDom(), '123');
assert.equal(result.tenderDocumentId, '456');
assert.deepEqual(result.documents, [
  { fileId: '100', fileName: 'Нэг файл.pdf' },
  { fileId: '200', fileName: 'Хоёр.pdf' },
]);
assert.throws(() => validateLegacyDocuments(result, '999'), /did not identify/);
console.log('Legacy attachment discovery checks passed.');
