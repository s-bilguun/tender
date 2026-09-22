const { execFile } = require('child_process');

function curlJson(url) {
  return new Promise((resolve) => {
    execFile('curl.exe', [
      '-s', '-L',
      '-H', 'Accept: application/json',
      '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      url
    ], (err, stdout) => {
      if (err || !stdout) return resolve(null);
      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        resolve(stdout.substring(0, 200));
      }
    });
  });
}

async function test() {
  const urls = [
    'https://www.tender.gov.mn/api/invitation/1789954037328',
    'https://www.tender.gov.mn/api/tender/1767444354805',
    'https://www.tender.gov.mn/api/process/153/list?tenderDocumentId=1760322067184&offset=1&limit=20',
    'https://www.tender.gov.mn/api/process/153/list?tenderId=1767444354805&offset=1&limit=20',
    'https://www.tender.gov.mn/api/process/153/list?invitationId=1789954037328&offset=1&limit=20',
    'https://user.tender.gov.mn/api/document/1789954037328'
  ];

  for (const u of urls) {
    const res = await curlJson(u);
    console.log('URL:', u);
    console.log('RES:', typeof res === 'object' ? JSON.stringify(res).substring(0, 150) : res);
    console.log('---');
  }
}

test();
