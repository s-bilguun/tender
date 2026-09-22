const fs = require('fs');
const text = fs.readFileSync('scratch/detail-dump.txt', 'utf8');

const regexes = [
  /tenderDocumentId["':\s]+(\d+)/gi,
  /tenderId["':\s]+(\d+)/gi,
  /invitationId["':\s]+(\d+)/gi,
  /subTenderId["':\s]+(\d+)/gi
];

for (const r of regexes) {
  let match;
  while ((match = r.exec(text)) !== null) {
    console.log(match[0]);
  }
}
