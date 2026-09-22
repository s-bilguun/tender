const fs = require('fs');
const text = fs.readFileSync('scratch/detail-dump.txt', 'utf8');

const regex = /self\.__next_f\.push\(\[1,"(.*)"\]\)/g;
let m;
let full = '';
while ((m = regex.exec(text)) !== null) {
  full += m[1];
}

console.log('Total extracted SSR payload length:', full.length);
fs.writeFileSync('scratch/ssr-payload.txt', full.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));

// Let's search inside the payload
const keywords = ['1789954037328', 'tenderDocumentId', 'documents', 'files', 'pdf', 'өгөгдлийн'];
for (const k of keywords) {
  const idx = full.indexOf(k);
  console.log(`Keyword "${k}": index = ${idx}`);
  if (idx !== -1) {
    console.log(full.substring(Math.max(0, idx - 100), Math.min(full.length, idx + 200)));
    console.log('---');
  }
}
