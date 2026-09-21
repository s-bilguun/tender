import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { TenderItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

function formatBudget(amount: number): string {
  if (!amount) return '0 ₮';
  if (amount >= 1_000_000_000_000) {
    return `${(amount / 1_000_000_000_000).toFixed(2)} Их наяд ₮`;
  }
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} тэрбум ₮`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} сая ₮`;
  }
  return `${amount.toLocaleString()} ₮`;
}

interface TargetTenderInfo {
  invitationId?: string | number;
  tenderCode?: string;
  invitationNumber?: string;
  tenderName?: string;
  totalBudget?: number;
  budgetEntityName?: string;
  tenderTypeName?: string;
  ruleName?: string;
  fundName?: string;
  receiveDate?: string;
  publishDate?: string;
  positionName?: string;
  docStatusName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, tenderContext, locale = 'mn', model: requestedModel } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const lower = message.toLowerCase();
    let targetTender: TargetTenderInfo | null = null;
    let relevantTenders: Partial<TenderItem>[] = [];
    let queryContextDescription = '';

    // STEP 1: Specific Tender Context from UI
    if (tenderContext) {
      const code = tenderContext.tenderCode || tenderContext.invitationNumber;
      const id = tenderContext.invitationId;

      try {
        let query = supabase.from('tenders').select('*');
        if (code) {
          query = query.or(`tender_code.eq.${code},invitation_number.eq.${code}`);
        } else if (id) {
          query = query.eq('invitation_id', id);
        }
        const { data } = await query.limit(1);
        if (data && data.length > 0) {
          const row = data[0];
          targetTender = {
            invitationId: row.invitation_id,
            tenderCode: row.tender_code,
            invitationNumber: row.invitation_number,
            tenderName: row.tender_name,
            totalBudget: Number(row.total_budget) || 0,
            budgetEntityName: row.budget_entity_name,
            tenderTypeName: row.tender_type_name,
            ruleName: row.rule_name,
            fundName: row.fund_name,
            receiveDate: row.receive_date || row.open_date,
            publishDate: row.publish_date,
            positionName: row.position_name,
            docStatusName: row.doc_status_name,
          };
        }
      } catch (err) {
        console.warn('Failed to query DB for tenderContext:', err);
      }

      if (!targetTender) {
        targetTender = {
          invitationId: tenderContext.invitationId,
          tenderCode: tenderContext.tenderCode,
          invitationNumber: tenderContext.invitationNumber,
          tenderName: tenderContext.tenderName,
          totalBudget: tenderContext.totalBudget,
          budgetEntityName: tenderContext.budgetEntityName,
          tenderTypeName: tenderContext.tenderTypeName,
          ruleName: tenderContext.ruleName,
          fundName: tenderContext.fundName,
          receiveDate: tenderContext.receiveDate || tenderContext.openDate,
          publishDate: tenderContext.publishDate,
          docStatusName: tenderContext.docStatusName,
        };
      }
    }

    // STEP 2: Extract Tender Code or Quoted Title from message
    if (!targetTender) {
      try {
        const codeMatch = message.match(/([A-ZА-ЯӨҮa-zа-яөү0-9-]+\/\d{6,}(?:\/\d{2}\/\d{2})?|\b\d{10,}\b)/);
        if (codeMatch) {
          const rawCode = codeMatch[1].trim();
          const { data } = await supabase
            .from('tenders')
            .select('*')
            .or(`tender_code.ilike.%${rawCode}%,invitation_number.ilike.%${rawCode}%`)
            .limit(1);

          if (data && data.length > 0) {
            const row = data[0];
            targetTender = {
              invitationId: row.invitation_id,
              tenderCode: row.tender_code,
              invitationNumber: row.invitation_number,
              tenderName: row.tender_name,
              totalBudget: Number(row.total_budget) || 0,
              budgetEntityName: row.budget_entity_name,
              tenderTypeName: row.tender_type_name,
              ruleName: row.rule_name,
              fundName: row.fund_name,
              receiveDate: row.receive_date || row.open_date,
              publishDate: row.publish_date,
              positionName: row.position_name,
              docStatusName: row.doc_status_name,
            };
          }
        }

        if (!targetTender) {
          const titleMatch = message.match(/["“]([^"”]{4,})["”]/);
          if (titleMatch) {
            const quotedTitle = titleMatch[1].trim();
            const { data } = await supabase
              .from('tenders')
              .select('*')
              .ilike('tender_name', `%${quotedTitle}%`)
              .limit(1);

            if (data && data.length > 0) {
              const row = data[0];
              targetTender = {
                invitationId: row.invitation_id,
                tenderCode: row.tender_code,
                invitationNumber: row.invitation_number,
                tenderName: row.tender_name,
                totalBudget: Number(row.total_budget) || 0,
                budgetEntityName: row.budget_entity_name,
                tenderTypeName: row.tender_type_name,
                ruleName: row.rule_name,
                fundName: row.fund_name,
                receiveDate: row.receive_date || row.open_date,
                publishDate: row.publish_date,
                positionName: row.position_name,
                docStatusName: row.doc_status_name,
              };
            }
          }
        }
      } catch (err) {
        console.warn('Error extracting tender from message:', err);
      }
    }

    // STEP 3: Intent Classification & Specialized Database Queries (if no specific single tender)
    if (!targetTender) {
      // INTENT A: TOP / HIGHEST BUDGET TENDERS
      const isTopBudget = /(хамгийн\s*(их|өндөр|үнэтэй|том)|топ\s*\d*|их\s*төсөвтэй|өндөр\s*төсөвтэй|хамгийн\s*их\s*мөнгө|highest\s*budget|top\s*budget|largest)/i.test(message);

      // INTENT B: LOWEST BUDGET TENDERS
      const isLowBudget = /(хамгийн\s*(бага|хямд|жижиг)|бага\s*төсөвтэй|хямд\s*төсөвтэй|lowest\s*budget)/i.test(message);

      // INTENT C: ACTIVE / RECEIVING TENDERS
      const isActiveTenders = /(хүлээн\s*авч\s*байгаа|одоо\s*нээлттэй|дуусах\s*гэж\s*байгаа|дуусах\s*хугацаа|энэ\s*7\s*хоногт|идэвхтэй|active|closing\s*soon)/i.test(message);

      // INTENT D: RECENT / NEWEST TENDERS
      const isRecentTenders = /(шинээр|сүүлд\s*зарлагдсан|хамгийн\s*шинэ|шинэ\s*тендер|хамгийн\s*сүүлийн|newest|recent)/i.test(message);

      try {
        if (isTopBudget) {
          queryContextDescription = 'Мэдээллийн сангаас шүүсэн ХАМГИЙН ӨНДӨР ТӨСӨВТЭЙ ТОП ТЕНДЕРҮҮД (2026 он):';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data) relevantTenders = data.map(mapRowToTender);
        } else if (isLowBudget) {
          queryContextDescription = 'Мэдээллийн сангаас шүүсэн БАГА ТӨСӨВТЭЙ ТЕНДЕРҮҮД:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .gt('total_budget', 100000)
            .order('total_budget', { ascending: true })
            .limit(10);
          if (data) relevantTenders = data.map(mapRowToTender);
        } else if (isActiveTenders) {
          queryContextDescription = 'Одоогоор САНАЛ ХҮЛЭЭН АВЧ БАЙГАА (Идэвхтэй) ТЕНДЕРҮҮД:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .ilike('doc_status_name', '%хүлээн авч%')
            .order('receive_date', { ascending: true })
            .limit(10);
          if (data) relevantTenders = data.map(mapRowToTender);
        } else if (isRecentTenders) {
          queryContextDescription = 'ХАМГИЙН СҮҮЛД ЗАРЛАГДСАН ТЕНДЕРҮҮД:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .order('publish_date', { ascending: false })
            .limit(10);
          if (data) relevantTenders = data.map(mapRowToTender);
        } else if (/(программ|програм|software|мэдээллийн\s*технологи|кибер|өгөгдлийн\s*сан|дата\s*төв|систем\s*хөгжүүлэлт|лиценз)/i.test(message)) {
          // DOMAIN: IT / Software / Systems
          queryContextDescription = 'Мэдээллийн технологи, програм хангамж, системийн чиглэлийн тендерүүд:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .or('tender_name.ilike.%программ%,tender_name.ilike.%програм%,tender_name.ilike.%мэдээллийн технологи%,tender_name.ilike.%өгөгдлийн сан%,tender_name.ilike.%лиценз%,tender_name.ilike.%кибер%')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data && data.length > 0) relevantTenders = data.map(mapRowToTender);
        } else if (/(эмнэлэг|эрүүл\s*мэнд|эм\s*бэлдмэл|эмнэлгийн|оношилгоо|урвалж|тоног\s*төхөөрөмж|рентген|мэс\s*засал)/i.test(message)) {
          // DOMAIN: Medical / Healthcare
          queryContextDescription = 'Эрүүл мэнд, эмнэлгийн тоног төхөөрөмжийн чиглэлийн тендерүүд:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .or('tender_name.ilike.%эмнэлэг%,tender_name.ilike.%эрүүл мэнд%,tender_name.ilike.%тоног төхөөрөмж%,tender_name.ilike.%оношилгоо%,tender_name.ilike.%эм бэлдмэл%')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data && data.length > 0) relevantTenders = data.map(mapRowToTender);
        } else if (/(барилга|их\s*засвар|барилга\s*угсралт|өргөтгөл|дулаалга|дээвэр)/i.test(message)) {
          // DOMAIN: Construction & Renovation
          queryContextDescription = 'Барилга угсралт, их засварын чиглэлийн тендерүүд:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .eq('tender_type_code', 'JOB')
            .or('tender_name.ilike.%барилга%,tender_name.ilike.%их засвар%,tender_name.ilike.%өргөтгөл%')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data && data.length > 0) relevantTenders = data.map(mapRowToTender);
        } else if (/(авто\s*зам|замын\s*засвар|гүүр|нийтийн\s*тээвэр|автобус)/i.test(message)) {
          // DOMAIN: Roads & Transportation
          queryContextDescription = 'Авто зам, дэд бүтэц, тээврийн чиглэлийн тендерүүд:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .or('tender_name.ilike.%авто зам%,tender_name.ilike.%гүүр%,tender_name.ilike.%тээвэр%')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data && data.length > 0) relevantTenders = data.map(mapRowToTender);
        } else if (/(сургууль|цэцэрлэг|дотуур\s*байр|боловсрол|сургалт)/i.test(message)) {
          // DOMAIN: Education & Schools
          queryContextDescription = 'Боловсрол, сургууль, цэцэрлэгийн чиглэлийн тендерүүд:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .or('tender_name.ilike.%сургууль%,tender_name.ilike.%цэцэрлэг%,tender_name.ilike.%дотуур байр%')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data && data.length > 0) relevantTenders = data.map(mapRowToTender);
        } else if (/(шатахуун|түлш|дизель|нүүрс|уурхай|өрөмдлөг|тэсэлгээ)/i.test(message)) {
          // DOMAIN: Fuel, Mining, Drilling
          queryContextDescription = 'Түлш шатахуун, уул уурхай, өрөмдлөгийн чиглэлийн тендерүүд:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .or('tender_name.ilike.%шатахуун%,tender_name.ilike.%түлш%,tender_name.ilike.%дизель%,tender_name.ilike.%нүүрс%,tender_name.ilike.%өрөмдлөг%')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data && data.length > 0) relevantTenders = data.map(mapRowToTender);
        } else if (/(камер|хяналтын\s*камер|дохиолол|хамгаалалт)/i.test(message)) {
          // DOMAIN: Security & Cameras
          queryContextDescription = 'Камер, хяналтын систем, аюулгүй байдлын чиглэлийн тендерүүд:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .or('tender_name.ilike.%камер%,tender_name.ilike.%хяналтын камер%,tender_name.ilike.%дохиолол%')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data && data.length > 0) relevantTenders = data.map(mapRowToTender);
        } else if (/(хүнс|хоол|мах|гурил|сүү)/i.test(message)) {
          // DOMAIN: Food & Catering
          queryContextDescription = 'Хүнс, хоол хангамжийн чиглэлийн тендерүүд:';
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .or('tender_name.ilike.%хүнс%,tender_name.ilike.%хоол%,tender_name.ilike.%мах%')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data && data.length > 0) relevantTenders = data.map(mapRowToTender);
        } else {
          // Check if specific organization is named
          const knownAgencies = [
            'эрдэнэт', 'таван толгой', 'төмөр зам', 'убтз', 'нийслэл', 'нздтг', 'эрүүл мэнд', 'эмя',
            'боловсрол', 'бшуя', 'зам тээвэр', 'зтя', 'онцгой байдал', 'цагдаа', 'хүнс', 'ххаахүй',
            'эрчим хүч', 'эхя', 'дцс', 'багануур', 'хотын захиргаа'
          ];
          const matchedAgency = knownAgencies.find((a) => lower.includes(a));

          if (matchedAgency) {
            queryContextDescription = `"${matchedAgency}" байгууллагатай холбоотой тендерүүд:`;
            const { data } = await supabase
              .from('tenders')
              .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
              .ilike('budget_entity_name', `%${matchedAgency}%`)
              .order('total_budget', { ascending: false })
              .limit(10);
            if (data && data.length > 0) relevantTenders = data.map(mapRowToTender);
          }

          // Keyword search if no agency match or 0 agency results
          if (relevantTenders.length === 0) {
            const stopwords = new Set([
              'тендерийн', 'тендер', 'тендерүүд', 'тэндэр', 'төсөв', 'шаардлага', 'онцлогийг', 'онцлог',
              'шинжилж', 'шинжилгээ', 'оролцогчдод', 'зориулсан', 'зөвлөмж', 'өгнө', 'үү', 'асуудал',
              'мэдээлэл', 'талаар', 'байна', 'хэдэн', 'ямар', 'юу', 'авах', 'байгаа', 'гэж', 'болон',
              'жагсаана', 'жагсаалт', 'харуул', 'өгөөч', 'гэсэн', 'аль', 'хэрэгтэй', 'хэрэгцээтэй',
              'байнауу', 'байнаа', 'чиглэлээр', 'хайж', 'тухай', 'бүх', 'нийт', 'хангамж',
              'нийлүүлэх', 'хийх', 'гүйцэтгэх', 'үйлчилгээ', 'ажил', 'бараа'
            ]);

            const cleaned = message.replace(/["'“”«»()[\]{}?!,.:;]/g, ' ');
            const keywords = cleaned
              .split(/\s+/)
              .map((w) => w.trim())
              .filter((w) => w.length > 2 && !stopwords.has(w.toLowerCase()));

            if (keywords.length > 0) {
              queryContextDescription = `"${keywords.join(', ')}" түлхүүр үгээр илэрсэн тендерүүд:`;
              const conditions = keywords
                .slice(0, 3)
                .map((k) => `tender_name.ilike.%${k}%,budget_entity_name.ilike.%${k}%`)
                .join(',');

              const { data } = await supabase
                .from('tenders')
                .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
                .or(conditions)
                .order('total_budget', { ascending: false })
                .limit(10);

              if (data && data.length > 0) {
                relevantTenders = data.map(mapRowToTender);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Query processing failed:', err);
      }

      // If still empty (e.g. greeting or general query), provide top active/budget tenders from Supabase
      if (relevantTenders.length === 0) {
        queryContextDescription = 'Мэдээллийн сангаас санал болгох тэргүүлэх тендерүүд:';
        try {
          const { data } = await supabase
            .from('tenders')
            .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date')
            .order('total_budget', { ascending: false })
            .limit(10);
          if (data) relevantTenders = data.map(mapRowToTender);
        } catch (e) {
          console.warn('Fallback query failed:', e);
        }
      }
    }

    // STEP 4: Build high-quality, friendly system prompt
    let systemPrompt = '';

    if (locale === 'mn') {
      if (targetTender) {
        systemPrompt = `Та бол Монгол Улсын төрийн худалдан авах ажиллагаа (tender.gov.mn)-ны чиглэлээр олон жил зөвлөгөө өгсөн, туршлагатай найрсаг мэргэжилтэн хамтрагч юм.

ХАРИЛЦААНЫ СТАНДАРТ:
- Робот шиг, хуурай албархуу хэллэг БҮҮ ашигла (Жишээ нь: "Мэдээллийн санд бүртгэлтэй...", "Хэрэглэгчийн асуултын дагуу доорх дүн шинжилгээг хүргэж байна..." гэх мэт хиймэл үгс БҮҮ хэрэглэ).
- Энгийн, ойлгомжтой, тусархуу, амьд монгол хэлээр харилцана.
- Эхлээд тендерийн гол үзүүлэлтүүдийг цэгцтэй дурдаад, дараа нь оролцогчид юуг анхаарах ёстойг практик зөвлөгөө хэлбэрээр өгнө.

ХЭРЭГЛЭГЧИЙН СОНГОСОН ТЕНДЕР:
- Тендерийн нэр: ${targetTender.tenderName}
- Тендерийн дугаар / Код: ${targetTender.tenderCode || targetTender.invitationNumber}
- Төсөвт өртөг: ${formatBudget(targetTender.totalBudget || 0)} (${(targetTender.totalBudget || 0).toLocaleString()} ₮)
- Захиалагч: ${targetTender.budgetEntityName} (${targetTender.positionName || 'Төрийн худалдан авагч'})
- Төрөл: ${targetTender.tenderTypeName || 'Бараа'}
- Шалгаруулах арга: ${targetTender.ruleName || 'Нээлттэй тендер шалгаруулалтын арга'}
- Санхүүжилтийн эх үүсвэр: ${targetTender.fundName || 'Өөрийн хөрөнгө / Төсөв'}
- Санал авах эцсийн хугацаа: ${targetTender.receiveDate || 'Тендерийн урилгаас харна уу'}
- Төлөв: ${targetTender.docStatusName || 'Нээлттэй'}

ХАРИУЛТЫН БҮТЭЦ:
1. Товч дүн шинжилгээ: Төсөв, захиалагч, санхүүжилтийн онцлог.
2. Оролцогчдод өгөх гол зөвлөмж: Техникийн шаардлага, 1-2%-ийн банкны баталгаа, Monpass тоон гарын үсэг, татварын өргүй лавлагаа, санал илгээх хугацаа.
3. Мөнгөн дүнг Их наяд ₮, тэрбум ₮, сая ₮-өөр яг үнэн зөв заагаарай.`;
      } else {
        systemPrompt = `Та бол төрийн худалдан авах ажиллагаа (тендер)-ны салбарт олон жил ажилласан, туршлагатай найрсаг зөвлөх туслах юм.

ХАРИЛЦААНЫ СТАНДАРТ (МАШ ЧУХАЛ):
1. Хэзээ ч робот шиг, хуурай албархуу өнгө аясаар бүү эхэл!
   - ❌ "Мэдээллийн санд бүртгэлд байгаа 22,785 тендерийн мэдээлэл дээр үндэслэн..."
   - ❌ "Хэрэглэгчийн асуултын дагуу доорх жагсаалтыг хүргэж байна..."
   - ❌ "Системийн дүн шинжилгээний үр дүнд..." гэх мэт хиймэл, робот эхлэлийг ОГТ БҮҮ АШИГЛА.
   - ✅ ОРОНД НЬ: "2026 оны хамгийн өндөр төсөвтэй тендерүүдийг жагсаавал:", "Одоогоор хамгийн өндөр дүнтэй тендерүүд эдгээр байна:", "Таны хайсан тендерүүдийг энд нэгтгэлээ:" гэх мэтээр шууд энгийн, ойлгомжтой, амьд найрсаг монгол хэлээр эхэл.
2. Мэдээллээ хүнд уншихад эвтэйхэн, цэвэрхэн жагсаалтаар харуул:
   - Дугаар, Нэр (тодоор), Төсөв, Захиалагч, Төлөв.
   - Төсвийг заахдаа өгөгдсөн их наяд (Их наяд ₮), тэрбум (тэрбум ₮), сая (сая ₮)-ийн нэгжийг огт өөрчилж болохгүй (Жишээ нь 1.21 Их наяд ₮-ийг 1.21 тэрбум ₮ болгож бүү андуур!).
3. Төгсгөлд нь нөхөрсөг практик зөвлөгөө эсвэл дараагийн алхмыг найрсаг санал болго (Жишээ нь: "💡 Та эдгээрээс аль нэг тендерийг сонирхож байвал шаардагдах бичиг баримт, баталгааг нь дэлгэрүүлээд асуугаарай!").

БОДИТ МЭДЭЭЛЭЛ:
${relevantTenders
  .map(
    (t, idx) =>
      `${idx + 1}. [${t.tenderCode || t.invitationId}] ${t.tenderName}\n   - Төсөв: ${formatBudget(t.totalBudget || 0)} (${(t.totalBudget || 0).toLocaleString()} ₮)\n   - Захиалагч: ${t.budgetEntityName}\n   - Төрөл: ${t.tenderTypeName || 'Бусад'} | Төлөв: ${t.docStatusName || 'Нээлттэй'}`
  )
  .join('\n\n')}`;
      }
    } else {
      if (targetTender) {
        systemPrompt = `You are an experienced, friendly procurement consultant for Mongolia's tender system (tender.gov.mn).
Answer naturally and helpfully without robotic jargon.
Target Tender:
- Name: ${targetTender.tenderName}
- Code: ${targetTender.tenderCode || targetTender.invitationNumber}
- Budget: ${formatBudget(targetTender.totalBudget || 0)} (${(targetTender.totalBudget || 0).toLocaleString()} MNT)
- Agency: ${targetTender.budgetEntityName}
- Category: ${targetTender.tenderTypeName}
- Method: ${targetTender.ruleName}
- Financing: ${targetTender.fundName}
- Deadline: ${targetTender.receiveDate}

Provide practical guidance on technical requirements, bid security, and key deadlines in clean Markdown.`;
      } else {
        systemPrompt = `You are a friendly, helpful procurement advisor for Mongolia's tender portal.
Give direct, clear answers in natural English without robotic clichés.
Tenders:
${relevantTenders
  .map(
    (t, idx) =>
      `${idx + 1}. [${t.tenderCode}] ${t.tenderName} | Budget: ${formatBudget(t.totalBudget || 0)} | Agency: ${t.budgetEntityName}`
  )
  .join('\n')}
Answer clearly in English using this data.`;
      }
    }

    // STEP 5: Call OpenRouter with candidate fallback models
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const candidateModels = Array.from(
      new Set([
        requestedModel || 'google/gemma-4-26b-a4b-it:free',
        'google/gemma-4-26b-a4b-it:free',
        'nvidia/nemotron-3.5-lightning:free',
        'openrouter/free',
      ])
    ).filter(Boolean);

    if (openRouterKey) {
      for (const m of candidateModels) {
        try {
          const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://tender.mn',
              'X-Title': 'Tender.mn',
            },
            body: JSON.stringify({
              model: m,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
              temperature: 0.6,
              max_tokens: 1400,
            }),
          });

          if (openRouterRes.ok) {
            const data = await openRouterRes.json();
            const choice = data.choices?.[0];
            const reply = choice?.message?.content;
            if (reply && typeof reply === 'string' && reply.trim().length > 30) {
              return NextResponse.json({ reply });
            }
          } else {
            console.warn(`Model ${m} returned non-200:`, openRouterRes.status);
          }
        } catch (orErr) {
          console.warn(`Model ${m} failed, trying next:`, orErr);
        }
      }
    }

    // STEP 6: High-Quality Structured Local Fallback (Guaranteed Relevant)
    if (targetTender) {
      const fallbackAnalysis = `### 📋 "${targetTender.tenderName}" Тендерийн Шинжилгээ

#### 1. Үндсэн мэдээлэл
* **Тендерийн нэр:** ${targetTender.tenderName}
* **Тендерийн дугаар:** ${targetTender.tenderCode || targetTender.invitationNumber || 'Бүртгэлтэй'}
* **Захиалагч байгууллага:** ${targetTender.budgetEntityName || 'Төрийн байгууллага'}
* **Төсөвт өртөг:** ${formatBudget(targetTender.totalBudget || 0)} (${(targetTender.totalBudget || 0).toLocaleString()} ₮)
* **Төрөл:** ${targetTender.tenderTypeName || 'Бараа'}
* **Шалгаруулах арга:** ${targetTender.ruleName || 'Нээлттэй тендер шалгаруулалт'}
* **Санхүүжилтийн эх үүсвэр:** ${targetTender.fundName || 'Өөрийн хөрөнгө'}
* **Эцсийн хугацаа:** ${targetTender.receiveDate || 'Тендерийн урилгаас харна уу'}

#### 2. Төсөв ба Захиалагчийн онцлог
* **Төсвийн баталгаа:** "${targetTender.fundName || 'Өөрийн хөрөнгө'}" эх үүсвэрээр санхүүжигдэж байгаа нь төлбөрийн эрсдэл бага, санхүүжилт найдвартайг харуулж байна.
* **Захиалагчийн шаардлага:** ${targetTender.budgetEntityName} нь чанарын стандартыг нарийн шалгадаг тул техникийн тодорхойлолтыг 100% хангах шаардлагатай.

#### 3. Оролцогчдод өгөх гол зөвлөмж
1. **Техникийн тодорхойлолт:** Нийлүүлэх бараа, материалын техникийн паспорт, чанарын гэрчилгээг бүрэн хавсаргах.
2. **Татвар ба НД:** Татварын ерөнхий газар болон Нийгмийн даатгалын лавлагаагаар хугацаа хэтэрсэн өргүй байх.
3. **Тендерийн баталгаа:** Төсөвт өртгийн 1-2%-ийн хэмжээтэй арилжааны банкны баталгааг урьдчилан бэлдэх.
4. **Цахим системээр илгээх:** **tender.gov.mn** системд Monpass тоон гарын үсгээр баталгаажуулж, хугацаанаас 2-3 цагийн өмнө илгээх.`;

      return NextResponse.json({ reply: fallbackAnalysis });
    }

    // List fallback with real database results
    const fallbackList = `Одоогийн байдлаар тохирох тендерүүдийг жагсаавал:

${relevantTenders
  .map(
    (t, idx) =>
      `${idx + 1}. **${t.tenderName}**\n   - Дугаар: \`${t.tenderCode}\`\n   - Төсөв: **${formatBudget(t.totalBudget || 0)}**\n   - Захиалагч: *${t.budgetEntityName}*\n   - Төлөв: ${t.docStatusName || 'Нээлттэй'}`
  )
  .join('\n\n')}

💡 *Та аль нэг тендерийн талаар дэлгэрүүлж асуухыг хүсвэл нэр эсвэл дугаарыг нь бичээрэй.*`;

    return NextResponse.json({ reply: fallbackList });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function mapRowToTender(d: any): Partial<TenderItem> {
  return {
    invitationId: d.invitation_id,
    tenderCode: d.tender_code,
    tenderName: d.tender_name,
    totalBudget: Number(d.total_budget) || 0,
    budgetEntityName: d.budget_entity_name,
    receiveDate: d.receive_date || d.open_date,
    tenderTypeName: d.tender_type_name,
    ruleName: d.rule_name,
    docStatusName: d.doc_status_name,
  };
}
