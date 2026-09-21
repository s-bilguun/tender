import { NextRequest, NextResponse } from 'next/server';
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

    const allTenders = tenderStore.getAllTenders();

    // Check if user is searching for something specific in chat
    const query = message.toLowerCase();
    const relevantTenders = allTenders.filter(t => 
      (t.tenderName && query.split(' ').some(w => w.length > 2 && t.tenderName.toLowerCase().includes(w))) ||
      (t.budgetEntityName && query.split(' ').some(w => w.length > 2 && t.budgetEntityName.toLowerCase().includes(w)))
    ).slice(0, 10);

    const contextTenders = relevantTenders.length > 0 ? relevantTenders : allTenders.slice(0, 12);

    const openRouterKey = process.env.OPENROUTER_API_KEY;
    const model = requestedModel || process.env.OPENROUTER_MODEL || 'openrouter/free';

    if (openRouterKey) {
      try {
        const systemPrompt = locale === 'mn' 
          ? `Та бол Монгол Улсын Төрийн худалдан авах ажиллагааны цахим систем (tender.gov.mn)-ийн албан ёсны AI шинжээч, зөвлөх туслах юм.
Та хэрэглэгчийн асуултад маш тодорхой, бодитой, мэргэжлийн түвшинд монгол хэлээр хариулна.

Одоо системд зарлагдсан бодит нээлттэй тендерүүдийн өгөгдөл:
${contextTenders.map(t => `- [${t.tenderCode}] ${t.tenderName} | Төсөв: ${formatBudget(t.totalBudget)} | Захиалагч: ${t.budgetEntityName} | Хугацаа: ${t.receiveDate || t.openDate} | Төрөл: ${t.tenderTypeName}`).join('\n')}

${tenderContext ? `\nХэрэглэгчийн тусгайлан сонгосон тендерийн мэдээлэл:
Нэр: ${tenderContext.tenderName}
Код: ${tenderContext.tenderCode}
Төсөвт өртөг: ${formatBudget(tenderContext.totalBudget)}
Захиалагч: ${tenderContext.budgetEntityName}
Эцсийн хугацаа: ${tenderContext.receiveDate || tenderContext.openDate}
Төрөл: ${tenderContext.tenderTypeName}
Шалгаруулах арга: ${tenderContext.ruleName || 'Тодорхойгүй'}
` : ''}

Хариулахдаа:
1. Хэрэв тодорхой тендерийг асуувал түүний код, төсөвт өртөг, хугацаа болон шаардлагатай бичиг баримтуудыг (Monpass тоон гарын үсэг, татварын өргүй тодорхойлолт, тендерийн баталгаа, туршлага) цэгцтэй дурдаарай.
2. Хэрэв салбар, чиглэлээр асуувал бодит төсөвт дүн болон зарлагдсан байгууллагуудыг харьцуулан зөвлөгөө өгөөрэй.`
          : `You are an expert procurement and tender analyst for Mongolia's public procurement portal (tender.gov.mn).
Answer professionally, clearly, and concisely in English using the provided live tender data.

Currently available live tenders:
${contextTenders.map(t => `- [${t.tenderCode}] ${t.tenderName} | Budget: ${formatBudget(t.totalBudget)} | Agency: ${t.budgetEntityName} | Deadline: ${t.receiveDate}`).join('\n')}

${tenderContext ? `Selected Tender:\n${JSON.stringify(tenderContext, null, 2)}` : ''}`;

        const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Tender.mn',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message }
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

    // Fallback response if external API is unreachable
    const totalSum = allTenders.reduce((acc, t) => acc + (t.totalBudget || 0), 0);
    const topTenders = [...allTenders].sort((a, b) => b.totalBudget - a.totalBudget).slice(0, 3);
    const fallbackText = `### 📊 Тендерийн Мэдээллийн Тойм

Одоогоор нийт **${allTenders.length}** тендер бүртгэлтэй бөгөөд нийт төсөв **${formatBudget(totalSum)}** байна.

**Хамгийн их төсөвтэй тендерүүд:**
${topTenders.map(t => `- **${t.tenderName}** (${formatBudget(t.totalBudget)}) - *${t.budgetEntityName}*`).join('\n')}

Та хүссэн тендерийн нэр, салбарыг бичиж дэлгэрэнгүй лавлаарай.`;

    return NextResponse.json({ reply: fallbackText });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
