import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { tenderStore } from '@/lib/tender-client';
import { TenderItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

function formatBudget(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} тэрбум ₮`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} сая ₮`;
  }
  return `${amount.toLocaleString()} ₮`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, tenderContext, locale = 'mn', model: requestedModel } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let relevantTenders: Partial<TenderItem>[] = [];

    // Query Supabase full dataset (22,000+ tenders) for user query
    try {
      const words = message
        .replace(/[?.,!]/g, '')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 2);

      if (words.length > 0) {
        const orConditions = words
          .slice(0, 3)
          .map((w) => `tender_name.ilike.%${w}%,budget_entity_name.ilike.%${w}%`)
          .join(',');

        const { data, error } = await supabase
          .from('tenders')
          .select('invitation_id, tender_name, tender_code, total_budget, budget_entity_name, receive_date, open_date, tender_type_name, rule_name')
          .or(orConditions)
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
      console.warn('Supabase query in AI chat failed, falling back:', sbErr);
    }

    // Fallback to local memory store if no Supabase matches
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

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const model = requestedModel || process.env.OPENROUTER_MODEL || 'openrouter/free';

    if (openRouterKey) {
      try {
        const systemPrompt =
          locale === 'mn'
            ? `Та бол Монгол Улсын Төрийн худалдан авах ажиллагааны цахим систем (tender.gov.mn)-ийн 22,000+ тендерийн мэдээллийн сантай ажилладаг албан ёсны AI шинжээч, зөвлөх туслах юм.
Та хэрэглэгчийн асуултад маш тодорхой, бодитой, мэргэжлийн түвшинд монгол хэлээр хариулна.

Хэрэглэгчийн асуулттай холбоотой бодит тендерүүдийн өгөгдөл:
${relevantTenders
  .map(
    (t) =>
      `- [${t.tenderCode || t.invitationId}] ${t.tenderName} | Төсөв: ${formatBudget(t.totalBudget || 0)} | Захиалагч: ${t.budgetEntityName} | Хугацаа: ${t.receiveDate || t.openDate} | Төрөл: ${t.tenderTypeName || 'Бусад'}`
  )
  .join('\n')}

${
  tenderContext
    ? `\nХэрэглэгчийн тусгайлан сонгосон тендерийн дэлгэрэнгүй мэдээлэл:
Нэр: ${tenderContext.tenderName}
Код: ${tenderContext.tenderCode}
Төсөвт өртөг: ${formatBudget(tenderContext.totalBudget)}
Захиалагч: ${tenderContext.budgetEntityName}
Эцсийн хугацаа: ${tenderContext.receiveDate || tenderContext.openDate}
Төрөл: ${tenderContext.tenderTypeName}
Шалгаруулах арга: ${tenderContext.ruleName || 'Тодорхойгүй'}
`
    : ''
}

Хариулахдаа:
1. Хэрэв тодорхой тендерийг асуувал түүний код, төсөвт өртөг, хугацаа болон шаардлагатай бичиг баримтуудыг (Monpass тоон гарын үсэг, татварын өргүй тодорхойлолт, тендерийн баталгаа, туршлага) цэгцтэй дурдаарай.
2. Хэрэв салбар, чиглэлээр асуувал бодит төсөвт дүн болон зарлагдсан байгууллагуудыг харьцуулан зөвлөгөө өгөөрэй.`
            : `You are an expert procurement and tender analyst for Mongolia's public procurement portal (tender.gov.mn).
Answer professionally, clearly, and concisely in English using the provided live tender data.

Currently relevant tenders:
${relevantTenders
  .map(
    (t) =>
      `- [${t.tenderCode || t.invitationId}] ${t.tenderName} | Budget: ${formatBudget(t.totalBudget || 0)} | Agency: ${t.budgetEntityName} | Deadline: ${t.receiveDate}`
  )
  .join('\n')}

${tenderContext ? `Selected Tender:\n${JSON.stringify(tenderContext, null, 2)}` : ''}`;

        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://tender.mn',
            'X-Title': 'Tender.mn',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (openRouterRes.ok) {
          const data = await openRouterRes.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({ reply });
          }
        } else {
          const errText = await openRouterRes.text();
          console.warn('OpenRouter non-200 response:', openRouterRes.status, errText);
        }
      } catch (orErr) {
        console.error('OpenRouter request failed, falling back:', orErr);
      }
    }

    // Fallback response if external AI API is unreachable
    const fallbackText = `### 📊 Тендерийн Мэдээллийн Тойм

Мэдээллийн сангаас илэрсэн тендерүүд:
${relevantTenders.map((t) => `- **${t.tenderName}** (${formatBudget(t.totalBudget || 0)}) — *${t.budgetEntityName}*`).join('\n')}

Та хүссэн тендерийн нэр, салбар, төсвийг лавлан асуугаарай.`;

    return NextResponse.json({ reply: fallbackText });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
