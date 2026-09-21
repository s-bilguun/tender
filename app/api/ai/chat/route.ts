import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { tenderStore } from '@/lib/tender-client';
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

    let targetTender: TargetTenderInfo | null = null;
    let relevantTenders: Partial<TenderItem>[] = [];

    // STEP 1: If tenderContext is passed from UI, use it and fetch full row from DB
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

    // STEP 2: If no targetTender yet, intelligently extract tender from user's message
    if (!targetTender) {
      try {
        // A. Extract tender code or invitation number (e.g. ЭҮТӨҮГ/202601021361, 202601021361)
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

        // B. Extract quoted title (e.g. "Өрөмдлөгийн технологийн материал" or “...”)
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

    // STEP 3: If still no targetTender, search database for relevant tenders by keywords
    if (!targetTender) {
      try {
        const stopwords = new Set([
          'тендерийн', 'тендер', 'тендерүүд', 'төсөв', 'шаардлага', 'онцлогийг', 'онцлог',
          'шинжилж', 'шинжилгээ', 'оролцогчдод', 'зориулсан', 'зөвлөмж', 'өгнө', 'үү', 'асуудал',
          'мэдээлэл', 'талаар', 'байна', 'хэдэн', 'ямар', 'юу', 'авах', 'байгаа', 'гэж', 'болон'
        ]);

        const cleaned = message.replace(/["'“”«»()[\]{}?!,.:;]/g, ' ');
        const keywords = cleaned
          .split(/\s+/)
          .map((w) => w.trim())
          .filter((w) => w.length > 2 && !stopwords.has(w.toLowerCase()));

        if (keywords.length > 0) {
          const conditions = keywords
            .slice(0, 3)
            .map((k) => `tender_name.ilike.%${k}%,budget_entity_name.ilike.%${k}%`)
            .join(',');

          const { data, error } = await supabase
            .from('tenders')
            .select('invitation_id, tender_name, tender_code, total_budget, budget_entity_name, receive_date, open_date, tender_type_name, rule_name')
            .or(conditions)
            .order('total_budget', { ascending: false })
            .limit(10);

          if (!error && data && data.length > 0) {
            relevantTenders = data.map((d) => ({
              invitationId: d.invitation_id,
              tenderCode: d.tender_code,
              tenderName: d.tender_name,
              totalBudget: Number(d.total_budget) || 0,
              budgetEntityName: d.budget_entity_name,
              receiveDate: d.receive_date || d.open_date,
              tenderTypeName: d.tender_type_name,
              ruleName: d.rule_name,
            }));
          }
        }
      } catch (sbErr) {
        console.warn('Supabase query in AI chat failed:', sbErr);
      }

      if (relevantTenders.length === 0) {
        const allTenders = tenderStore.getAllTenders();
        const query = message.toLowerCase();
        const matched = allTenders.filter(
          (t) =>
            (t.tenderName && query.split(' ').some((w) => w.length > 2 && t.tenderName.toLowerCase().includes(w))) ||
            (t.budgetEntityName && query.split(' ').some((w) => w.length > 2 && t.budgetEntityName.toLowerCase().includes(w)))
        );
        relevantTenders = matched.length > 0 ? matched.slice(0, 10) : allTenders.slice(0, 10);
      }
    }

    // STEP 4: Build high-quality system prompt
    let systemPrompt = '';
    if (locale === 'mn') {
      if (targetTender) {
        systemPrompt = `Та бол Монгол Улсын Төрийн худалдан авах ажиллагааны цахим систем (tender.gov.mn)-ийн албан ёсны AI шинжээч, зөвлөх юм.
Хэрэглэгч дараах тодорхой тендерийн талаар асууж байна:

📌 ҮНДСЭН МЭДЭЭЛЭЛ:
- Тендерийн нэр: ${targetTender.tenderName}
- Тендерийн код: ${targetTender.tenderCode || targetTender.invitationNumber}
- Төсөвт өртөг: ${formatBudget(targetTender.totalBudget || 0)}
- Захиалагч байгууллага: ${targetTender.budgetEntityName} (${targetTender.positionName || 'Төрийн худалдан авагч'})
- Төрөл: ${targetTender.tenderTypeName || 'Бараа'}
- Шалгаруулах арга: ${targetTender.ruleName || 'Нээлттэй тендер шалгаруулалтын арга'}
- Санхүүжилтийн эх үүсвэр: ${targetTender.fundName || 'Өөрийн хөрөнгө'}
- Эцсийн хугацаа: ${targetTender.receiveDate || 'Тодорхойгүй'}
- Нийтлэгдсэн огноо: ${targetTender.publishDate || '2026 он'}

ХАРИУЛТЫН ЗААВАР:
1. "Тендерийн дүн шинжилгээ" хэсэгт уг тендерийн төсөв, захиалагчийн шаардлага, онцлогийг мэргэжлийн түвшинд дүгнэ.
2. "Оролцогчдод өгөх зөвлөмж" хэсэгт техникийн тодорхойлолт, тендерийн баталгаа, Monpass тоон гарын үсэг, татварын өргүй лавлагаа, санал өгөх хугацааны талаар практик зөвлөгөө өг.
3. Хариултаа Markdown гарчиг (###), тод үгс (**bold**), жагсаалтаар эмх цэгцтэй гаргана уу.`;
      } else {
        systemPrompt = `Та бол Монгол Улсын Төрийн худалдан авах ажиллагааны цахим систем (tender.gov.mn)-ийн 22,000+ тендерийн сантай ажилладаг албан ёсны AI шинжээч юм.
Хэрэглэгчийн асуулттай холбогдох тендерүүд:
${relevantTenders.map((t) => `- [${t.tenderCode || t.invitationId}] ${t.tenderName} | Төсөв: ${formatBudget(t.totalBudget || 0)} | Захиалагч: ${t.budgetEntityName}`).join('\n')}

Хэрэглэгчийн асуултад бодит тоо баримтад тулгуурлан тодорхой, цэгцтэй монгол хэлээр хариулна уу.`;
      }
    } else {
      if (targetTender) {
        systemPrompt = `You are an official procurement expert for Mongolia's tender system (tender.gov.mn).
Target Tender Information:
- Name: ${targetTender.tenderName}
- Code: ${targetTender.tenderCode || targetTender.invitationNumber}
- Budget: ${formatBudget(targetTender.totalBudget || 0)}
- Agency: ${targetTender.budgetEntityName}
- Category: ${targetTender.tenderTypeName}
- Method: ${targetTender.ruleName}
- Financing: ${targetTender.fundName}
- Deadline: ${targetTender.receiveDate}

Provide a comprehensive analysis including procurement risks, technical requirements, bid security, and actionable tips for bidders in clean Markdown.`;
      } else {
        systemPrompt = `You are a tender analyst for Mongolia's public procurement portal.
Relevant tenders:
${relevantTenders.map((t) => `- [${t.tenderCode}] ${t.tenderName} | ${formatBudget(t.totalBudget || 0)} | ${t.budgetEntityName}`).join('\n')}
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
              max_tokens: 1200,
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
* **Төсөвт өртөг:** ${formatBudget(targetTender.totalBudget || 0)}
* **Төрөл:** ${targetTender.tenderTypeName || 'Бараа'}
* **Шалгаруулах арга:** ${targetTender.ruleName || 'Нээлттэй тендер шалгаруулалт'}
* **Санхүүжилтийн эх үүсвэр:** ${targetTender.fundName || 'Өөрийн хөрөнгө'}
* **Эцсийн хугацаа:** ${targetTender.receiveDate || 'Тендерийн урилгаас харна уу'}

#### 2. Төсөв ба Захиалагчийн онцлог
* **Төсвийн баталгаа:** "${targetTender.fundName || 'Өөрийн хөрөнгө'}" эх үүсвэрээр санхүүжигдэж байгаа нь гүйцэтгэлийн дараах төлбөрийн эрсдэл бага, санхүүжилт найдвартайг харуулж байна.
* **Захиалагчийн шаардлага:** ${targetTender.budgetEntityName} нь өөрийн үйл ажиллагааны онцлогт тохирсон чанарын стандартыг нарийн шалгадаг тул техникийн тодорхойлолтыг 100% хангах шаардлагатай.

#### 3. Оролцогчдод өгөх гол зөвлөмж
1. **Техникийн тодорхойлолт:** Нийлүүлэх бараа, материалын техникийн паспорт, чанарын гэрчилгээг бүрэн хавсаргах.
2. **Татвар ба НД:** Татварын ерөнхий газар болон Нийгмийн даатгалын лавлагаагаар хугацаа хэтэрсэн өргүй байх.
3. **Тендерийн баталгаа:** Хуулийн дагуу төсөвт өртгийн 1-2%-ийн хэмжээтэй арилжааны банкны баталгааг урьдчилан гаргуулж хавсаргах.
4. **Цахим системээр илгээх:** **tender.gov.mn** системд Monpass тоон гарын үсгээр баталгаажуулж, сүлжээний саатлаас сэргийлэн хугацаанаас 2-3 цагийн өмнө саналаа илгээх.`;

      return NextResponse.json({ reply: fallbackAnalysis });
    }

    // Generic list fallback if user just asked generally
    const fallbackText = `### 📊 Тендерийн Мэдээллийн Тойм

Мэдээллийн сангаас илэрсэн тендерүүд:
${relevantTenders.map((t) => `- **${t.tenderName}** (${formatBudget(t.totalBudget || 0)}) — *${t.budgetEntityName}*`).join('\n')}

Та хүссэн тодорхой тендерийн нэр, дугаар, салбараар лавлан асуугаарай.`;

    return NextResponse.json({ reply: fallbackText });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
