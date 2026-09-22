const { execFile } = require('child_process');

const headers = [
  '-H', 'Accept: application/json, text/plain, */*',
  '-H', 'Referer: https://www.tender.gov.mn/mn/invitation/detail/1789954037328',
  '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  '-H', 'Sec-Fetch-Mode: cors',
  '-H', 'Sec-Fetch-Site: same-origin'
];

execFile('curl.exe', [
  '-s', '-L',
  ...headers,
  'https://www.tender.gov.mn/api/process/153/list?tenderDocumentId=1789954037215&offset=1&limit=9999'
], (err, stdout) => {
  console.log('OUTPUT (first 300 chars):', stdout ? stdout.substring(0, 300) : 'none');
});
