import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function extractFullStructuredTenderFromPdfText(fullText) {
  if (!fullText || fullText.length < 50) return null;

  // 1. BDS Extraction (Өгөгдлийн хүснэгт)
  let turnoverReq = '';
  const turnoverMatch = fullText.match(/(?:Борлуулалтын\s+орлого|ТШЗ\s*1[78]\.2\.4)[\s\S]{1,160}?(?:хувиас\s*багагүй|байна|хүрэхгүй|шаардахгүй)/i) ||
                        fullText.match(/Борлуулалтын\s+орлогын\s+хэмжээ[^\.\n;]+(?:[0-9]{1,3}\s*хувиас|[^\.\n;]+)/i);
  if (turnoverMatch) {
    turnoverReq = turnoverMatch[0].replace(/\s+/g, ' ').trim();
  }

  let liquidAssetsReq = '';
  const liquidMatch = fullText.match(/(?:Түргэн\s+хөрвөх\s+чадвартай\s+хөрөнгө|ТШЗ\s*1[78]\.2\.5)[\s\S]{1,160}?(?:хувиас\s*багагүй|багагүй\s*байх|шаардахгүй)/i);
  if (liquidMatch) {
    liquidAssetsReq = liquidMatch[0].replace(/\s+/g, ' ').trim();
  }

  let similarExpReq = '';
  const similarMatch = fullText.match(/(?:Ижил\s+төстэй\s+ажил|Ижил\s+төстэй\s+бараа|ТШЗ\s*1[78]\.6)[\s\S]{1,200}?(?:гүйцэтгэсэн\s*байх|бараа\s*нийлүүлсэн\s*байх|хуулбар|шаардахгүй)/i);
  if (similarMatch) {
    similarExpReq = similarMatch[0].replace(/\s+/g, ' ').trim();
  }

  let bidSecurityReq = '';
  const secIdx = fullText.indexOf('ТШЗ 23.1');
  if (secIdx !== -1) {
    const secSection = fullText.substring(secIdx, secIdx + 300);
    const secMatch = secSection.match(/([\d\s\,\.]+)\s*төгрөг/);
    if (secMatch) {
      bidSecurityReq = `${secMatch[1].trim()} төгрөг`;
    }
  }
  if (!bidSecurityReq) {
    const sec22Match = fullText.match(/(?:Тендерийн\s+баталгаа|ТШЗ\s*22\.1)[\s\S]{1,120}?(?:Шаардахгүй|\/Шаардахгүй\/|"Шаардахгүй"|баталгааны\s+мэдэгдэл)/i);
    if (sec22Match) {
      bidSecurityReq = sec22Match[0].includes('Шаардахгүй') 
        ? 'Шаардахгүй (ТШЗ 22.1 дагуу баталгаа шаардагдахгүй)' 
        : 'Тендерийн баталгааны цахим мэдэгдэл шаардана';
    }
  }

  // Licenses
  const licenses = [];
  let licIdx = fullText.indexOf('ТШЗ 17.4');
  if (licIdx === -1) licIdx = fullText.indexOf('ТШЗ 16.2');
  if (licIdx !== -1) {
    const licSection = fullText.substring(licIdx, licIdx + 2000);
    const afterFirst = licSection.substring(15);
    const nextTsz = afterFirst.search(/ТШЗ\s*1[789]\./);
    const relevant = nextTsz !== -1 ? afterFirst.substring(0, nextTsz) : afterFirst;
    const lines = relevant.split('\n').map(l => l.trim()).filter(Boolean);
    for (const l of lines) {
      if (/^\d+[\.\)]\s+/.test(l)) {
        const item = l.replace(/^\d+[\.\)]\s+/, '').trim();
        if (item.length > 5 && !item.toLowerCase().includes('шаардана') && !item.toLowerCase().includes('зөвшөөрөл')) {
          licenses.push(item);
        }
      } else if (l.startsWith('•') || l.startsWith('-')) {
        const item = l.replace(/^[•\-]\s*/, '').trim();
        if (item.length > 5) licenses.push(item);
      }
    }
  }
  if (licenses.length === 0 && fullText.match(/ТШЗ\s*17\.6\.1[\s\S]{1,100}?Шаардахгүй/i)) {
    licenses.push('Тусгай зөвшөөрөл шаардахгүй');
  }

  // 2. Items / BoQ Table Extraction
  const items = [];
  const techStartIdx = fullText.lastIndexOf('ТЕХНИКИЙН ТОДОРХОЙЛОЛТ');
  const deliveryStartIdx = fullText.lastIndexOf('БАРАА НИЙЛҮҮЛЭЛТИЙН ХУВААРЬ');
  
  let targetSection = '';
  if (techStartIdx !== -1) {
    const section = fullText.slice(techStartIdx);
    const endMatch = section.search(/IV\s*БҮЛЭГ|ТЕНДЕРИЙН\s*ЖИШИГ\s*МАЯГТУУД|V\s*БҮЛЭГ|МАЯГТ\s*1/i);
    targetSection = endMatch !== -1 ? section.slice(0, endMatch) : section.slice(0, 35000);
  } else if (deliveryStartIdx !== -1) {
    const section = fullText.slice(deliveryStartIdx);
    const endMatch = section.search(/IV\s*БҮЛЭГ|ТЕНДЕРИЙН\s*ЖИШИГ\s*МАЯГТУУД|V\s*БҮЛЭГ/i);
    targetSection = endMatch !== -1 ? section.slice(0, endMatch) : section.slice(0, 25000);
  }

  if (targetSection) {
    const lines = targetSection.split('\n').map(l => l.trim()).filter(Boolean);
    let currentItem = null;
    const numRowRegex = /^(\d{1,3})[\.\)]\s*(.*)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^(?:No|№|Барааны нэр|Захиалагчийн|Техникийн тодорхойлолт|Хэмжих нэгж|Тоо хэмжээ|Тавигдах шаардлага|Санамж|Тайлбар)$/i.test(line)) {
        continue;
      }
      if (line.includes('ҮНИЙН САНАЛЫН МАЯГТ') || line.includes('ТЕНДЕР БЭЛТГЭХ ЗААВАР')) {
        break;
      }

      const match = line.match(numRowRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= 1 && num <= 300) {
          if (currentItem && currentItem.name && currentItem.name.length > 2) {
            items.push(currentItem);
          }
          currentItem = {
            number: num,
            name: match[2].trim(),
            specs: '',
            unit: 'ш',
            qty: 1
          };
          continue;
        }
      }

      if (currentItem) {
        if (!currentItem.name) {
          currentItem.name = line;
        } else {
          currentItem.specs = currentItem.specs ? `${currentItem.specs} ${line}` : line;
        }
      }
    }

    if (currentItem && currentItem.name && currentItem.name.length > 2) {
      items.push(currentItem);
    }
  }

  // Refine items qty and unit
  const refinedItems = items.map(item => {
    let qty = 1;
    let unit = 'ш';
    let specs = item.specs || '';
    const textToSearch = `${item.name} ${specs}`;
    const qtyUnitMatch = textToSearch.match(/(\d+(?:[\,\.]\d+)?)\s*(?:хүртэл\s*)?(Ширхэг|ширхэг|ш|ком|комплект|хайрцаг|багц|метр|м|м2|м3|тн|тонн|кг|литр|л|хоног|сар)(?![А-ЯЁа-яёA-Za-z0-9])/i);
    if (qtyUnitMatch) {
      qty = parseFloat(qtyUnitMatch[1].replace(',', '.'));
      unit = qtyUnitMatch[2].toLowerCase();
    }

    return {
      name: item.name,
      specs: specs.trim(),
      unit,
      qty,
      quantity: qty
    };
  });

  // Construct standard eligibility bullet points
  const eligibility_requirements = [];
  if (turnoverReq) eligibility_requirements.push(`Борлуулалтын орлого: ${turnoverReq}`);
  if (liquidAssetsReq) eligibility_requirements.push(`Түргэн хөрвөх чадвар: ${liquidAssetsReq}`);
  if (similarExpReq) eligibility_requirements.push(`Ижил төстэй ажил: ${similarExpReq}`);
  if (bidSecurityReq) eligibility_requirements.push(`Тендерийн баталгаа: ${bidSecurityReq}`);
  if (licenses.length > 0) {
    eligibility_requirements.push(`Тусгай зөвшөөрөл: ${licenses.slice(0, 3).join(', ')}`);
  }

  // Scope summary
  let scopeSummary = '';
  const bdsIdx = fullText.lastIndexOf('ӨГӨГДЛИЙН ХҮСНЭГТ');
  if (bdsIdx !== -1) {
    const excerpt = fullText.slice(bdsIdx, bdsIdx + 4000);
    const match = excerpt.match(/(?:ТШЗ\s*1\.\d|A\.\s*ЕРӨНХИЙ ЗҮЙЛ|ТШЗ\s*17\.|ТШЗ\s*18\.)[\s\S]{100,2000}/i);
    scopeSummary = (match ? match[0] : excerpt.slice(0, 1500)).trim();
  }
  if (!scopeSummary && refinedItems.length > 0) {
    scopeSummary = `Нийлүүлэгдэх үндсэн бараа, ажил үйлчилгээ:\n` + refinedItems.slice(0, 5).map(it => `- ${it.name}: ${it.qty} ${it.unit}`).join('\n');
  }

  return {
    items: refinedItems,
    turnoverReq: turnoverReq || undefined,
    liquidAssetsReq: liquidAssetsReq || undefined,
    similarExpReq: similarExpReq || undefined,
    bidSecurityReq: bidSecurityReq || undefined,
    licenses,
    eligibility_requirements: eligibility_requirements.length > 0 ? eligibility_requirements : undefined,
    scopeSummary: scopeSummary || undefined,
  };
}

async function batchEnrich() {
  console.log('🚀 Starting batch structured extraction on active tenders...');
  
  const { data: tenders, error } = await supabase
    .from('tenders')
    .select('invitation_id, tender_code, tender_name, raw_data')
    .ilike('doc_status_name', '%хүлээн авч%')
    .not('raw_data->pdfUrl', 'is', null)
    .limit(300);

  if (error || !tenders) {
    console.error('Fetch error:', error);
    return;
  }

  console.log(`Found ${tenders.length} active tenders with stored PDFs to process.`);
  let successCount = 0;
  let itemsCountTotal = 0;

  for (let i = 0; i < tenders.length; i++) {
    const t = tenders[i];
    const pdfUrl = t.raw_data.pdfUrl;
    console.log(`[${i + 1}/${tenders.length}] Processing [${t.tender_code}] ${t.invitation_id}...`);

    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) {
        console.warn(`  Failed to fetch PDF: ${res.status}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const parsed = await pdfParse(buffer);
      const text = parsed.text || '';
      const extracted = extractFullStructuredTenderFromPdfText(text);

      if (!extracted) {
        console.log('  No text extracted (likely scanned PDF)');
        continue;
      }

      const existingRaw = t.raw_data || {};
      const existingLiveBundle = existingRaw.liveBundle || {};
      const existingStructured = existingLiveBundle.structuredSpecs || existingRaw.structuredSpecs || {};

      const updatedStructuredSpecs = {
        ...existingStructured,
        items: extracted.items?.length ? extracted.items : existingStructured.items,
        turnoverReq: extracted.turnoverReq || existingStructured.turnoverReq,
        liquidAssetsReq: extracted.liquidAssetsReq || existingStructured.liquidAssetsReq,
        similarExpReq: extracted.similarExpReq || existingStructured.similarExpReq,
        bidSecurityReq: extracted.bidSecurityReq || existingStructured.bidSecurityReq,
        licenses: extracted.licenses?.length ? extracted.licenses : existingStructured.licenses,
        rawSpecText: extracted.scopeSummary || existingStructured.rawSpecText,
      };

      const updatedRaw = {
        ...existingRaw,
        hasPdf: true,
        full_scope_of_work: extracted.scopeSummary || existingRaw.full_scope_of_work,
        eligibility_requirements: extracted.eligibility_requirements || existingRaw.eligibility_requirements,
        structuredSpecs: updatedStructuredSpecs,
        liveBundle: {
          ...existingLiveBundle,
          fullScopeOfWork: extracted.scopeSummary || existingLiveBundle.fullScopeOfWork,
          structuredSpecs: updatedStructuredSpecs,
        }
      };

      const { error: updateErr } = await supabase
        .from('tenders')
        .update({
          raw_data: updatedRaw,
          updated_at: new Date().toISOString()
        })
        .eq('invitation_id', t.invitation_id);

      if (updateErr) {
        console.error('  Update error:', updateErr.message);
      } else {
        successCount++;
        const itemCount = extracted.items?.length || 0;
        itemsCountTotal += itemCount;
        console.log(`  ✅ Updated! Items: ${itemCount}, Reqs: ${extracted.eligibility_requirements?.length || 0}, Licenses: ${extracted.licenses?.length || 0}`);
      }
    } catch (err) {
      console.warn(`  Error processing tender ${t.invitation_id}:`, err.message);
    }
  }

  console.log(`\n🎉 Batch processing finished! Successfully updated: ${successCount}/${tenders.length} tenders with ${itemsCountTotal} structured items.`);
}

batchEnrich();
