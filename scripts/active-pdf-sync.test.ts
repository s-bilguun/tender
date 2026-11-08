import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';

async function main() {
  const pdf = readFileSync('Tender_MN_v0.1.0_Summary.pdf');
  let rawData: any = { liveBundle: { documents: [{ id: 'manual-1', fileName: 'manual.pdf', source: 'manual_upload', extractionStatus: 'partial' }], pdfText: '--- DOCUMENT manual-1: manual.pdf ---\n[Page 1]\npreserved' } };
  const server = createServer(async (request, response) => {
    const parts: Buffer[] = [];
    for await (const part of request) parts.push(Buffer.from(part));
    if (request.url?.startsWith('/rest/v1/tenders') && request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify([{ raw_data: rawData }]));
    } else if (request.url?.startsWith('/rest/v1/tenders') && request.method === 'PATCH') {
      rawData = JSON.parse(Buffer.concat(parts).toString()).raw_data;
      response.writeHead(204); response.end();
    } else if (request.url?.startsWith('/storage/v1/object/') && request.method === 'POST') {
      response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ Key: 'stored' }));
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    process.env.SUPABASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
    let rejectSecond = true;
    (globalThis as any).__TENDER_SOURCE_BROWSER__ = {
      getLegacyDocuments: async () => ({ tenderDocumentId: '99', documents: [{ fileId: '101', fileName: 'one.pdf' }, { fileId: '102', fileName: 'two.pdf' }] }),
      getBuffer: async (url: string) => {
        if (url.endsWith('/102') && rejectSecond) throw new Error('HTTP 403 blocked');
        return { buffer: pdf, contentType: 'application/pdf' };
      },
    };
    const { syncSingleTenderPdf } = await import('./sync-active-pdfs');
    const tender: any = { invitation_id: '123', tender_code: 'TEST', raw_data: rawData };
    const first = await syncSingleTenderPdf(tender);
    assert.equal(first.success, true, JSON.stringify(first));
    assert.ok(first.warnings?.some((warning) => warning.includes('403')));
    assert.equal(rawData.liveBundle.documents.find((doc: any) => doc.fileId === '101').isStored, true);
    assert.equal(rawData.liveBundle.documents.find((doc: any) => doc.fileId === '102').extractionStatus, 'source_error');
    assert.ok(rawData.liveBundle.documents.some((doc: any) => doc.id === 'manual-1'));
    rejectSecond = false;
    const second = await syncSingleTenderPdf({ ...tender, raw_data: rawData });
    assert.equal(second.success, true);
    assert.equal(second.warnings?.length, 0);
    assert.equal(rawData.liveBundle.documents.find((doc: any) => doc.fileId === '102').isStored, true);
    assert.equal((rawData.liveBundle.pdfText.match(/--- DOCUMENT 101:/g) || []).length, 1);
    assert.match(rawData.liveBundle.pdfText, /--- DOCUMENT 102:/);
    assert.match(rawData.liveBundle.pdfText, /preserved/);
    assert.equal(rawData.liveBundle.extractionStatus, 'partial');
    (globalThis as any).__TENDER_SOURCE_BROWSER__.getBuffer = async () => { throw new Error('An unchanged PDF should not be downloaded again'); };
    const third = await syncSingleTenderPdf({ ...tender, raw_data: rawData });
    assert.equal(third.success, true);
    assert.equal(third.unchanged, true);
    rawData = { liveBundle: { documents: [] } };
    (globalThis as any).__TENDER_SOURCE_BROWSER__.getBuffer = async () => { throw new Error('Attachment access failed: HTTP 403 (blocked)'); };
    const blocked = await syncSingleTenderPdf({ invitation_id: '124', raw_data: rawData });
    assert.equal(blocked.success, false);
    assert.equal(rawData.liveBundle.documents.length, 2);
    assert.equal(rawData.liveBundle.documents[0].extractionStatus, 'not_extracted');
    assert.equal(rawData.liveBundle.documents[0].isStored, undefined);
    assert.equal(rawData.liveBundle.attachmentDiscoverySource, 'legacy_public_page');
    rawData = { liveBundle: { documents: [] } };
    const discovery = await syncSingleTenderPdf({ invitation_id: '125', raw_data: rawData }, { discoveryOnly: true });
    assert.equal(discovery.success, true);
    assert.equal(discovery.discoveryOnly, true);
    assert.equal(rawData.liveBundle.documents.length, 2);
    console.log('Active PDF sync retry and preservation checks passed.');
  } finally {
    delete (globalThis as any).__TENDER_SOURCE_BROWSER__;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
