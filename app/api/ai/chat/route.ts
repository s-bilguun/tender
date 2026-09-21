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
              'тендерийн', 'тендер', 'тендерүүд', 'төсөв', 'шаардлага', 'онцлогийг', 'онцлог',
              'шинжилж', 'шинжилгээ', 'оролцогчдод', 'зориулсан', 'зөвлөмж', 'өгнө', 'үү', 'асуудал',
              'мэдээлэл', 'талаар', 'байна', 'хэдэн', 'ямар', 'юу', 'авах', 'байгаа', 'гэж', 'болон',
              'жагсаана', 'жагсаалт', 'харуул', 'өгөөч', 'гэсэн', 'аль'
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

    // STEP 4: Build high-quality system prompt
    let systemPrompt = '';
    const statsContext = `
МЭДЭЭЛЛИЙН САНГИЙН БОДИТ СТАТИСТИК (2026 он):
- Нийт бүртгэлтэй тендер: 22,785
- Нийт батлагдсан төсөвт өртөг: 21.72 Их наяд ₮
- Хамгийн өндөр төсөвтэй тендер: 1.21 Их наяд ₮ ("Нийтийн тээврийн Улаанбаатар Трам төслийн 2 дугаар шугам" - НЗДТГ)
- Төлөвийн бүтэц: Үр дүн гарсан (21,089), Тендер хүлээн авч байгаа буюу идэвхтэй (737), Нээгдсэн (717), Хүчингүй (50)
- Төрлийн бүтэц: Бараа (13,734), Ажил (6,373), Үйлчилгээ (2,667)
`;

    if (locale === 'mn') {
      if (targetTender) {
        systemPrompt = `Та бол Монгол Улсын Төрийн худалдан авах ажиллагааны цахим систем (tender.gov.mn)-ийн албан ёсны AI шинжээч, зөвлөх юм.
Хэрэглэгч дараах тодорхой тендерийн талаар лавлаж байна:

📌 ҮНДСЭН МЭДЭЭЛЭЛ:
- Тендерийн нэр: ${targetTender.tenderName}
- Тендерийн код: ${targetTender.tenderCode || targetTender.invitationNumber}
- Төсөвт өртөг: ${formatBudget(targetTender.totalBudget || 0)} (${(targetTender.totalBudget || 0).toLocaleString()} ₮)
- Захиалагч байгууллага: ${targetTender.budgetEntityName} (${targetTender.positionName || 'Төрийн худалдан авагч'})
- Төрөл: ${targetTender.tenderTypeName || 'Бараа'}
- Шалгаруулах арга: ${targetTender.ruleName || 'Нээлттэй тендер шалгаруулалтын арга'}
- Санхүүжилтийн эх үүсвэр: ${targetTender.fundName || 'Өөрийн хөрөнгө / Төсөв'}
- Эцсийн хугацаа: ${targetTender.receiveDate || 'Тодорхойгүй'}
- Төлөв: ${targetTender.docStatusName || 'Бүртгэгдсэн'}

ХАРИУЛТЫН ЗААВАР:
1. "Тендерийн дүн шинжилгээ" хэсэгт төсөв, захиалагчийн шаардлага, онцлогийг мэргэжлийн түвшинд дүгнэ.
2. "Оролцогчдод өгөх зөвлөмж" хэсэгт техникийн тодорхойлолт, 1-2%-ийн тендерийн баталгаа, Monpass тоон гарын үсэг, татварын өргүй лавлагаа, санал өгөх хугацааны талаар зөвлөгөө өг.
3. Хариултаа эмх цэгцтэй Markdown гарчиг (###), тод үгс (**bold**), жагсаалтаар өнгө үзэмжтэй гаргана уу.`;
      } else {
        systemPrompt = `Та бол Монгол Улсын Төрийн худалдан авах ажиллагааны цахим систем (tender.gov.mn)-ийн 22,785 тендерийн сантай ажилладаг албан ёсны AI шинжээч юм.
${statsContext}

${queryContextDescription}
${relevantTenders
  .map(
    (t, idx) =>
      `${idx + 1}. [${t.tenderCode || t.invitationId}] ${t.tenderName}\n   - Төсөв: ${formatBudget(t.totalBudget || 0)} (${(t.totalBudget || 0).toLocaleString()} ₮)\n   - Захиалагч: ${t.budgetEntityName}\n   - Төрөл: ${t.tenderTypeName || 'Бусад'} | Төлөв: ${t.docStatusName || 'Нээлттэй'}`
  )
  .join('\n\n')}

ХАРИУЛТЫН ЗААВАР:
1. Хэрэглэгчийн асуултад дээрх бодит өгөгдлийг ашиглан дэлгэрэнгүй, цэгцтэй, үнэн зөв хариулна уу.
2. Мөнгөн дүнг их наяд (Их наяд ₮), тэрбум (тэрбум ₮), сая (сая ₮)-аар тодорхой дурдаарай.
3. Хэрэв тодорхой тендерийг онцолбол түүний код, захиалагч, төлөвийг тодорхой бичнэ үү.`;
      }
    } else {
      if (targetTender) {
        systemPrompt = `You are an official procurement expert for Mongolia's tender system (tender.gov.mn).
Target Tender Information:
- Name: ${targetTender.tenderName}
- Code: ${targetTender.tenderCode || targetTender.invitationNumber}
- Budget: ${formatBudget(targetTender.totalBudget || 0)} (${(targetTender.totalBudget || 0).toLocaleString()} MNT)
- Agency: ${targetTender.budgetEntityName}
- Category: ${targetTender.tenderTypeName}
- Method: ${targetTender.ruleName}
- Financing: ${targetTender.fundName}
- Deadline: ${targetTender.receiveDate}

Provide a comprehensive analysis including technical requirements, bid security, and actionable tips for bidders in clean Markdown.`;
      } else {
        systemPrompt = `You are a tender analyst for Mongolia's public procurement portal (22,785 total tenders, 21.72 Trillion MNT budget).
${queryContextDescription}
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
    const fallbackList = `### 📊 ${queryContextDescription || 'Тендерийн Мэдээллийн Тойм'}

Мэдээллийн сангаас илэрсэн бодит тендерүүд:
${relevantTenders
  .map(
    (t, idx) =>
      `${idx + 1}. **${t.tenderName}**\n   - Дугаар: \`${t.tenderCode}\`\n   - Төсөв: **${formatBudget(t.totalBudget || 0)}**\n   - Захиалагч: *${t.budgetEntityName}*\n   - Төлөв: ${t.docStatusName || 'Нээлттэй'}`
  )
  .join('\n\n')}

Та хүссэн тодорхой тендерийн нэр, дугаар, салбараар лавлан асуугаарай.`;

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
