import assert from 'node:assert/strict';
import { mergeLegacyAttachments, replacePdfDocumentSections } from '../lib/legacy-attachment-merge';

const stored = { fileId: '10', fileName: 'old.pdf', downloadUrl: 'https://storage.example/10.pdf', isStored: true, extractionStatus: 'text_extracted' };
const uploaded = { id: 'manual-1', fileName: 'manual.pdf', source: 'manual_upload', extractionStatus: 'partial' };
const result = mergeLegacyAttachments([stored, uploaded], [{ fileId: '10', fileName: 'new-name.pdf' }, { fileId: '20', fileName: 'two.pdf' }]);
assert.equal(result.newlyDiscovered, true);
assert.equal(result.documents[0].downloadUrl, stored.downloadUrl);
assert.equal(result.documents[0].extractionStatus, 'text_extracted');
assert.equal(result.documents[1].downloadUrl, 'https://user.tender.gov.mn/mn/download/20');
assert.equal(result.documents[1].extractionStatus, 'not_extracted');
assert.deepEqual(result.documents[2], uploaded);
assert.equal(mergeLegacyAttachments([stored], [{ fileId: '10', fileName: 'old.pdf' }]).newlyDiscovered, false);
const oldText = '--- DOCUMENT 10: old.pdf ---\n[Page 1]\nold\n\n--- DOCUMENT manual-1: manual.pdf ---\n[Page 1]\npreserved';
const mergedText = replacePdfDocumentSections(oldText, ['--- DOCUMENT 10: new.pdf ---\n[Page 1]\nnew']);
assert.equal((mergedText.match(/--- DOCUMENT 10:/g) || []).length, 1);
assert.match(mergedText, /new/);
assert.match(mergedText, /preserved/);
console.log('Legacy attachment merge checks passed.');
