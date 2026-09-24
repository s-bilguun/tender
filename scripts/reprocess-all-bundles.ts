import fs from 'fs';
import path from 'path';
import { parsePdfContent, isClauseEmptyOrTemplate } from '../lib/live-fetcher';

async function reprocess() {
  const bundlesPath = path.join(process.cwd(), 'lib', 'live-bundles.json');
  console.log('Loading bundles from:', bundlesPath);
  const bundles = JSON.parse(fs.readFileSync(bundlesPath, 'utf8'));
  const total = Object.keys(bundles).length;
  console.log(`Reprocessing ${total} bundles with enhanced multi-strategy extraction...`);

  let itemsFound = 0;
  let sccCount = 0;
  let updatedCount = 0;

  for (const [id, bundle] of Object.entries(bundles) as [string, any][]) {
    const text = bundle.pdfText || '';
    const oldSpecs = bundle.structuredSpecs || {};

    // 1. Filter existing SCC to remove empty template placeholders
    const existingScc = (oldSpecs.specialConditions || []).filter((c: any) => !isClauseEmptyOrTemplate(c.content));

    // 2. Parse new specs from text if available
    let parsed: any = null;
    if (text && text.length > 50) {
      parsed = parsePdfContent(text);
    }

    const newScc = (parsed?.specialConditions || []).filter((c: any) => !isClauseEmptyOrTemplate(c.content));
    const finalScc = newScc.length > existingScc.length ? newScc : existingScc;

    // 3. Items: choose new multi-strategy parsed items if found, else existing
    const newItems = parsed?.items || [];
    const finalItems = newItems.length > 0 ? newItems : (oldSpecs.items || []);

    const mergedSpecs = {
      ...oldSpecs,
      rawSpecText: parsed?.rawSpecText || oldSpecs.rawSpecText,
      turnoverReq: parsed?.turnoverReq || oldSpecs.turnoverReq,
      similarExpReq: parsed?.similarExpReq || oldSpecs.similarExpReq,
      liquidAssetsReq: parsed?.liquidAssetsReq || oldSpecs.liquidAssetsReq,
      bidSecurityReq: parsed?.bidSecurityReq || oldSpecs.bidSecurityReq,
      licenses: (parsed?.licenses && parsed.licenses.length > 0) ? parsed.licenses : oldSpecs.licenses,
      personnel: (parsed?.personnel && parsed.personnel.length > 0) ? parsed.personnel : oldSpecs.personnel,
      machinery: (parsed?.machinery && parsed.machinery.length > 0) ? parsed.machinery : oldSpecs.machinery,
      specialConditions: finalScc,
      deliverySchedule: (parsed?.deliverySchedule && parsed.deliverySchedule.length > 0) ? parsed.deliverySchedule : oldSpecs.deliverySchedule,
      items: finalItems
    };

    bundle.structuredSpecs = mergedSpecs;

    if (mergedSpecs.items && mergedSpecs.items.length > 0) {
      itemsFound++;
    }
    if (mergedSpecs.specialConditions && mergedSpecs.specialConditions.length > 0) {
      sccCount++;
    }
    updatedCount++;
  }

  // Specifically ensure 1789954037328 has the OCR-extracted spec & items
  const tender1789954037328 = bundles['1789954037328'];
  if (tender1789954037328) {
    console.log('Ensuring 1789954037328 has exact OCR items...');
    tender1789954037328.structuredSpecs = tender1789954037328.structuredSpecs || {};
    tender1789954037328.structuredSpecs.items = [
      {
        name: 'Боосон өвс (2026 оны намрын ургацын шивээгүй ногоон өвс)',
        qty: 64,
        unit: 'тонн (буюу 3,200 боодол)',
        specs: 'MNS 0592:2008 стандарт, 1 боодол 20 кг-с багагүй, хэмжээ 50*30*80 см, нягтрал 120-150 кг/м3, чийг 15% ихгүй, хагд өвс 5% ихгүй'
      }
    ];
    tender1789954037328.structuredSpecs.turnoverReq = '2025 онуудын борлуулалтын орлого нь санал болгож байгаа үнийн дүнгийн 50 хувиас багагүй байна (ТШЗ 17.2.4)';
    tender1789954037328.structuredSpecs.liquidAssetsReq = 'Батлагдсан төсөвт өртгөөс багагүй байх. Санал болгож байгаа үнийн дүнгийн 50 хувиас багагүй (ТШЗ 17.2.5)';
    tender1789954037328.structuredSpecs.similarExpReq = '2024, 2025 онуудад ижил төстэй ажил гүйцэтгэсэн байна. /өвс/ (ТШЗ 17.6)';
    tender1789954037328.structuredSpecs.bidSecurityReq = 'Шаардахгүй (ТШЗ 22.1 дагуу тендерийн баталгаа шаардагдахгүй)';
    tender1789954037328.structuredSpecs.licenses = ['Тусгай зөвшөөрөл шаардахгүй (ТШЗ 17.6.1-ийн дагуу ямар нэг тусгай зөвшөөрөл шаардагдахгүй)'];
    tender1789954037328.structuredSpecs.machinery = ['Үндсэн тоног төхөөрөмж шаардахгүй (ТШЗ 17.6.3-ын дагуу)'];
    tender1789954037328.structuredSpecs.specialConditions = []; // Clean template - no empty questions
  }

  fs.writeFileSync(bundlesPath, JSON.stringify(bundles, null, 2), 'utf8');
  console.log(`Reprocessing completed!`);
  console.log({
    total,
    updatedCount,
    tendersWithStructuredItems: itemsFound,
    tendersWithRealSCC: sccCount
  });
}

reprocess().catch(console.error);
