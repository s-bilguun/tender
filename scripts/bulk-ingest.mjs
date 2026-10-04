#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_ENDPOINT = process.env.INGEST_API_URL || 'http://localhost:3000/api/admin/ingest';

/**
 * Хавтас доторх бүх PDF файлыг цувуулан боловсруулах
 */
async function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.error(`❌ Хавтас олдсонгүй: ${dirPath}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dirPath).filter((f) => f.toLowerCase().endsWith('.pdf'));

  if (files.length === 0) {
    console.warn(`⚠️ '${dirPath}' хавтсанд PDF файл олдсонгүй.`);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`🚀 TenderHub MN: ${files.length} PDF файл импортлож эхэллээ`);
  console.log(`🎯 Endpoint: ${API_ENDPOINT}`);
  console.log(`======================================================\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const fullPath = path.join(dirPath, filename);
    console.log(`[${i + 1}/${files.length}] Боловсруулж байна: ${filename}...`);

    try {
      const fileBuffer = fs.readFileSync(fullPath);
      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer], { type: 'application/pdf' }), filename);

      const start = Date.now();
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        body: formData,
      });

      const duration = ((Date.now() - start) / 1000).toFixed(1);
      const json = await res.json();

      if (res.ok && json.success) {
        successCount++;
        const d = json.data;
        console.log(`   ✅ Амжилттай (${duration}s): [${d.tender_id}] ${d.project_title_mn}`);
        console.log(`      Захиалагч: ${d.buyer_name} | Төсөв: ${d.estimated_budget_mnt?.toLocaleString()} ₮ | Салбар: ${d.sector}`);
      } else {
        errorCount++;
        console.error(`   ❌ Алдаа (${duration}s): ${json.error || 'Тодорхойгүй алдаа'}`);
      }
    } catch (err) {
      errorCount++;
      console.error(`   ❌ Сүлжээний алдаа: ${err.message}`);
    }

    // Rate-limiting delay (OpenAI TPM хамгаалах)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\n======================================================`);
  console.log(`🎉 Дууслаа! Нийт: ${files.length} | Амжилттай: ${successCount} | Алдаатай: ${errorCount}`);
  console.log(`======================================================\n`);
}

/**
 * URL жагсаалттай .txt файлыг уншиж бөөнөөр оруулах
 */
async function processUrlsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Файл олдсонгүй: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const urls = content
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

  console.log(`\n🚀 ${urls.length} PDF URL татаж боловсруулж байна...`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] Татаж байна: ${url}...`);

    try {
      const res = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        console.log(`   ✅ Амжилттай: [${json.data.tender_id}] ${json.data.project_title_mn}`);
      } else {
        console.error(`   ❌ Алдаа: ${json.error}`);
      }
    } catch (err) {
      console.error(`   ❌ Сүлжээний алдаа: ${err.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

// Аргумент шалгах
const arg = process.argv[2];

if (!arg) {
  console.log(`
Хэрэглэх заавар:
  node scripts/bulk-ingest.mjs <Хавтасны зам эсвэл urls.txt файл>

Жишээ:
  node scripts/bulk-ingest.mjs ./sample_tenders
  node scripts/bulk-ingest.mjs ./urls.txt
  `);
  process.exit(0);
}

if (arg.endsWith('.txt')) {
  processUrlsFile(arg);
} else {
  processDirectory(arg);
}
