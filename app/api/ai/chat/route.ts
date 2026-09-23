import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { TenderItem } from '@/lib/types';
import { getStructuredTenderSummary, getTenderDetailData } from '@/lib/tender-detail';

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

interface QueryPlan {
  searchKeywords?: string[];
  agency?: string | null;
  isReceivingOnly?: boolean;
  minBudget?: number | null;
  maxBudget?: number | null;
  category?: 'PRODUCT' | 'JOB' | 'SERVICE' | null;
  sortBy?: 'budget_desc' | 'budget_asc' | 'date_desc' | 'deadline_asc' | null;
}

async function parseNaturalQueryWithLLM(message: string, apiKey: string): Promise<QueryPlan | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tender.mn',
        'X-Title': 'Tender.mn',
      },
      body: JSON.stringify({
        model: 'google/gemma-4-26b-a4b-it:free',
        messages: [
          {
            role: 'system',
            content: `You are an AI query parser for Mongolia's tender portal (22,000 tenders).
Convert the user's natural language question into a search filter JSON.
Schema:
{
  "searchKeywords": string[], // Core specific nouns only (e.g. "програм", "компьютер", "камер", "шатахуун", "эмнэлэг"). DO NOT put category words ("бараа", "ажил", "үйлчилгээ") or stopwords ("хэрэгтэй", "байгаа", "тэндэр") in searchKeywords.
  "agency": string | null,    // Specific agency if mentioned (e.g. "Эрдэнэт", "УБТЗ", "Нийслэл")
  "isReceivingOnly": boolean, // TRUE if the user asks for tenders currently needed, open, or accepting proposals ("хэрэгтэй байгаа", "санал авч байгаа", "хүлээн авч байгаа", "одоо", "идэвхтэй")
  "minBudget": number | null, // Numeric budget in MNT (e.g. 500 сая -> 500000000)
  "maxBudget": number | null,
  "category": "PRODUCT" | "JOB" | "SERVICE" | null, // "бараа" -> PRODUCT, "ажил" -> JOB, "үйлчилгээ" -> SERVICE
  "sortBy": "budget_desc" | "budget_asc" | "date_desc" | "deadline_asc" | null
}
Return ONLY valid JSON without markdown fences.`,
          },
          { role: 'user', content: message },
        ],
        max_tokens: 150,
        temperature: 0.1,
      }),
    });

    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;
    const cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned) as QueryPlan;
  } catch (err) {
    console.warn('AI Query Planner skipped or timed out:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenderContext, locale = 'mn', model: requestedModel } = body;
    const rawMessage = body.message;
    const messages = body.messages;
    const message = (
      typeof rawMessage === 'string' && rawMessage.trim()
        ? rawMessage.trim()
        : Array.isArray(messages) && messages.length > 0
          ? messages[messages.length - 1]?.content || ''
          : ''
    );

    if (!message) {
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
      const openRouterKey = process.env.OPENROUTER_API_KEY;

      // ATTEMPT 1: Dynamic AI Query Planner (understands true human natural language)
      if (openRouterKey) {
        try {
          const plan = await parseNaturalQueryWithLLM(message, openRouterKey);
          if (plan) {
            let query = supabase
              .from('tenders')
              .select('invitation_id, tender_code, tender_name, total_budget, budget_entity_name, tender_type_name, doc_status_name, receive_date, publish_date');

            if (plan.isReceivingOnly) {
              query = query.ilike('doc_status_name', '%хүлээн авч%');
            }
            if (plan.agency) {
              query = query.ilike('budget_entity_name', `%${plan.agency}%`);
            }
            if (plan.minBudget && plan.minBudget > 0) {
              query = query.gte('total_budget', plan.minBudget);
            }
            if (plan.maxBudget && plan.maxBudget > 0) {
              query = query.lte('total_budget', plan.maxBudget);
            }
            if (plan.category) {
              query = query.eq('tender_type_code', plan.category);
            }
            if (plan.searchKeywords && plan.searchKeywords.length > 0) {
              let kws = [...plan.searchKeywords];
              if (kws.some((k: string) => k.toLowerCase().includes('програм'))) {
                kws = Array.from(new Set([...kws, 'програм', 'программ']));
              }
              const conditions = kws.map((k: string) => `tender_name.ilike.%${k}%`).join(',');
              query = query.or(conditions);
            }
            if (plan.sortBy === 'budget_asc') {
              query = query.order('total_budget', { ascending: true });
            } else if (plan.sortBy === 'deadline_asc') {
              query = query.order('receive_date', { ascending: true });
            } else if (plan.sortBy === 'date_desc') {
              query = query.order('publish_date', { ascending: false });
            } else {
              query = query.order('total_budget', { ascending: false });
            }

            const { data } = await query.limit(10);
            if (data && data.length > 0) {
              relevantTenders = data.map(mapRowToTender);
              queryContextDescription = 'Хэрэглэгчийн асуултын дагуу өгөгдлийн сангаас шүүсэн бодит тендерүүд:';
            }
          }
        } catch (planErr) {
          console.warn('Dynamic query planner execution failed, falling back:', planErr);
        }
      }

      // ATTEMPT 2: Fallback Domain & Keyword Rules (if AI planner was skipped or yielded 0)
      if (relevantTenders.length === 0) {
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
              .map((w: string) => w.trim())
              .filter((w: string) => w.length > 2 && !stopwords.has(w.toLowerCase()));

            if (keywords.length > 0) {
              queryContextDescription = `"${keywords.join(', ')}" түлхүүр үгээр илэрсэн тендерүүд:`;
              const conditions = keywords
                .slice(0, 3)
                .map((k: string) => `tender_name.ilike.%${k}%,budget_entity_name.ilike.%${k}%`)
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

    // STEP 4: Build high-quality, friendly system prompt with structured PDF/BDS data
    let systemPrompt = '';
    let structuredInfo: any = null;

    if (targetTender) {
      if (tenderContext?.bds && tenderContext?.technicalSpecs?.realSpecsText) {
        structuredInfo = {
          bds: tenderContext.bds,
          technicalSpecs: tenderContext.technicalSpecs,
          results: tenderContext.results,
        };
      } else {
        const invId = targetTender.invitationId || targetTender.invitationNumber;
        if (invId) {
          try {
            const fullDetail = await getTenderDetailData(String(invId));
            if (fullDetail) {
              structuredInfo = {
                bds: fullDetail.bds,
                technicalSpecs: fullDetail.technicalSpecs,
                results: fullDetail.results,
              };
            }
          } catch (e) {
            console.warn('Failed to load full live tender detail for AI chat:', e);
          }
        }
        if (!structuredInfo) {
          structuredInfo = getStructuredTenderSummary(targetTender);
        }
      }
    }

    if (locale === 'mn') {
      if (targetTender && structuredInfo) {
        const { bds, technicalSpecs, results } = structuredInfo;
        systemPrompt = `Та бол Монгол Улсын төрийн худалдан авах ажиллагаа (tender.gov.mn)-ны ТШББ, баримт бичиг, техникийн тодорхойлолт, хууль зүйн шаардлагыг шинжлэх чиглэлээр мэргэшсэн туршлагатай, найрсаг ахлах шинжээч зөвлөх юм.

ХАРИЛЦААНЫ СТАНДАРТ:
- Робот шиг хуурай, хиймэл албархуу хэллэг БҮҮ ашигла ("Мэдээллийн санд...", "Хэрэглэгчийн асуултын дагуу..." гэх мэт үгс БҮҮ хэрэглэ).
- Хэрэглэгчийн асуултад шууд, тодорхой, практик, бодитой хариулт өг.
- Баталгаажсан бодит тоо баримтуудыг (төсөв, хугацаа, код, захиалагч, арга, санхүүжилт) яг үнэн зөвөөр хэл.
- Хэзээ ч хуурамч, зохиомол ялагч компани эсвэл регистрийн дугаар зохиож БҮҮ хариул! (Хэрэв үр дүн гарсан бол tender.gov.mn дээрх албан ёсны протоколыг шалгахыг зөвлөнө).
- Мөнгөн дүнг Их наяд ₮, тэрбум ₮, сая ₮-өөр ойлгомжтой бич.

ХЭРЭГЛЭГЧИЙН СОНГОСОН ТЕНДЕРИЙН БАТАЛГААЖСАН БОДИТ МЭДЭЭЛЭЛ:
- Нэр: ${targetTender.tenderName}
- Код / Урилгын дугаар: ${targetTender.tenderCode || targetTender.invitationNumber}
- Төсөвт өртөг: ${formatBudget(targetTender.totalBudget || 0)} (${(targetTender.totalBudget || 0).toLocaleString()} ₮)
- Захиалагч: ${targetTender.budgetEntityName} (${targetTender.positionName || 'Төрийн худалдан авагч'})
- Төрөл: ${targetTender.tenderTypeName || 'Бараа'} | Сонгон шалгаруулалтын арга: ${targetTender.ruleName || 'Нээлттэй'}
- Санхүүжилтийн эх үүсвэр: ${targetTender.fundName || 'Төсөв / Өөрийн хөрөнгө'}
- Эцсийн хугацаа: ${targetTender.receiveDate || 'Тендерийн урилгаас харна уу'}
- Төлөв: ${targetTender.docStatusName || 'Нээлттэй'}

ХУУЛЬ ЗҮЙН ЖИШИГ ШААРДЛАГУУД:
1. Санхүүгийн босго үзүүлэлт:
   • Сүүлийн жилүүдийн борлуулалтын доод орлого: ${formatBudget(bds?.minAnnualTurnover || 0)} (${(bds?.minAnnualTurnover || 0).toLocaleString()} ₮)
   • Түргэн хөрвөх чадвартай хөрөнгө / Зээлжих боломж: ${formatBudget(bds?.minLiquidAssets || 0)} (${(bds?.minLiquidAssets || 0).toLocaleString()} ₮)
   • Тендерийн баталгаа: ${bds?.bidSecurityReq || `${(bds?.bidSecurity1Pct || 0).toLocaleString()} ₮ - ${(bds?.bidSecurity2Pct || 0).toLocaleString()} ₮`}
   • Гүйцэтгэлийн баталгаа (5%): ${(bds?.performanceBond5Pct || 0).toLocaleString()} ₮

2. Бүрдүүлэх ерөнхий бичиг баримтууд:
   • Улсын бүртгэлийн гэрчилгээ, Татварын өргүй цахим тодорхойлолт (e-Mongolia / E-Tax)
   • ШШГЕГ-ын өргүй лавлагаа, НДШ төлөлтийн цахим лавлагаа
   • Банкны баталгаа эсвэл даатгалын батлан даалт
${technicalSpecs?.documents && technicalSpecs.documents.length > 0 ? `\n3. АЛБАН ЁСНЫ ЭХ БАРИМТ БИЧГҮҮД (${technicalSpecs.documents.length} файл):\n${technicalSpecs.documents.map((d: any) => `   - ${d.name} (${d.category || 'Баримт бичиг'})`).join('\n')}` : ''}
${bds?.requiredLicenses && bds.requiredLicenses.length > 0 ? `\n4. ШААРДАГДАХ ТУСГАЙ ЗӨВШӨӨРӨЛ / СЕРТИФИКАТ (ТШЗ 17.4 / 16.2):\n${bds.requiredLicenses.map((lic: string) => `   • ${lic}`).join('\n')}` : ''}
${bds?.keyPersonnel && bds.keyPersonnel.length > 0 ? `\n5. ШААРДАГДАХ ТҮЛХҮҮР АЖИЛТНУУД / ХҮНИЙ НӨӨЦ:\n${bds.keyPersonnel.map((p: any) => `   • ${p.role}: ${p.count} хүн (Туршлага: ${p.experience || 'Шаардлагын дагуу'}, Мэргэжил: ${p.qualification || '-'})`).join('\n')}` : ''}
${bds?.machinery && bds.machinery.length > 0 ? `\n6. ШААРДАГДАХ ТЕХНИК, МАШИН МЕХАНИЗМ, ТЭЭВЭР:\n${bds.machinery.map((m: string) => `   • ${m}`).join('\n')}` : ''}
${technicalSpecs?.extractedSpecs?.items && technicalSpecs.extractedSpecs.items.length > 0 ? `\n7. НИЙЛҮҮЛЭХ БАРАА, БАГЦЫН БОДИТ ЖАГСААЛТ (${technicalSpecs.extractedSpecs.items.length} зүйл):\n${technicalSpecs.extractedSpecs.items.slice(0, 40).map((it: any) => `   - ${it.name} (${it.qty || ''} ${it.unit || ''}): ${it.specs || ''}`).join('\n')}${technicalSpecs.extractedSpecs.items.length > 40 ? `\n   ... болон цааш нийт ${technicalSpecs.extractedSpecs.items.length} багц/бараа байна.` : ''}` : ''}
${technicalSpecs?.realSpecsText ? `\n8. АЛБАН ЁСНЫ ТШББ PDF-ЭЭС БОДИТООР ЗАДАРСАН ТЕХНИКИЙН ҮЗҮҮЛЭЛТҮҮД:\n${technicalSpecs.realSpecsText.substring(0, 5000)}` : ''}
${technicalSpecs?.extractedQualifications && technicalSpecs.extractedQualifications.length > 0 ? `\n9. ОРОЛЦОГЧИЙН ЧАДАВХЫН ТУХАЙЛСАН ШААРДЛАГУУД (PDF-ээс):\n${technicalSpecs.extractedQualifications.join('\n')}` : ''}
${results?.bidders && results.bidders.length > 0 ? `\n10. БОДИТ ОРОЛЦОГЧИД БА ҮНЭЛГЭЭНИЙ ХОРООНЫ ДҮГНЭЛТ:\n${results.bidders.map((b: any, idx: number) => `${idx + 1}. Компани: ${b.supplierName} (Регистр: ${b.registerNumber || '-'}) | Үнэ: ${b.openedBidderPrice?.toLocaleString()} ₮ | Төлөв: ${b.wfmStatusName} | Дүгнэлт: "${b.commentText || ''}"`).join('\n')}` : results?.isConcluded ? `\n10. ШАЛГАРУУЛАЛТЫН ҮР ДҮН:\n- Энэ тендер нь шалгаруулалтаа дуусгаж үр дүн нь гарсан байна. Үнэлгээний хорооны албан ёсны протокол tender.gov.mn дээр баталгаажсан байна.` : ''}

ХАРИУЛТЫН ЗӨВЛӨМЖ:
Хэрэглэгчийн асуултад дээрх ТШББ PDF болон албан ёсны баримтуудаас задлан шинжилсэн бодит өгөгдөл, шаардлагад үндэслэн хамгийн практик, тодорхой зөвлөгөө өгч хариулна уу.`;
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
   - Төсвийг заахдаа өгөгдсөн их наяд (Их наяд ₮), тэрбум (тэрбум ₮), сая (сая ₮)-ийн нэгжийг огт өөрчилж болохгүй.
3. Төгсгөлд нь нөхөрсөг практик зөвлөгөө эсвэл дараагийн алхмыг найрсаг санал болго.

БОДИТ МЭДЭЭЛЭЛ:
${relevantTenders
  .map(
    (t, idx) =>
      `${idx + 1}. [${t.tenderCode || t.invitationId}] ${t.tenderName}\n   - Төсөв: ${formatBudget(t.totalBudget || 0)} (${(t.totalBudget || 0).toLocaleString()} ₮)\n   - Захиалагч: ${t.budgetEntityName}\n   - Төрөл: ${t.tenderTypeName || 'Бусад'} | Төлөв: ${t.docStatusName || 'Нээлттэй'}`
  )
  .join('\n\n')}`;
      }
    } else {
      if (targetTender && structuredInfo) {
        const { bds, technicalSpecs } = structuredInfo;
        systemPrompt = `You are an experienced, friendly procurement consultant for Mongolia's tender system (tender.gov.mn).
Answer naturally, accurately and helpfully without robotic jargon.
Target Tender:
- Name: ${targetTender.tenderName}
- Code: ${targetTender.tenderCode || targetTender.invitationNumber}
- Budget: ${formatBudget(targetTender.totalBudget || 0)} (${(targetTender.totalBudget || 0).toLocaleString()} MNT)
- Agency: ${targetTender.budgetEntityName}
- Category: ${targetTender.tenderTypeName}
- Method: ${targetTender.ruleName}
- Financing: ${targetTender.fundName}
- Deadline: ${targetTender.receiveDate}

STRUCTURED BDS & SPECIFICATION DATA (EXTRACTED FROM OFFICIAL PDF DOSSIER):
- Official Documents: ${technicalSpecs?.documents?.map((d: any) => d.name).join(', ') || 'Official PDF dossier available'}
- Required Licenses: ${bds?.requiredLicenses?.join(', ') || 'Standard registration'}
- Key Personnel: ${bds?.keyPersonnel?.map((p: any) => `${p.role} (${p.count})`).join(', ') || 'Standard'}
- Machinery/Equipment: ${bds?.machinery?.join(', ') || 'Standard'}
- Bid Security: ${bds?.bidSecurityReq || `${(bds?.bidSecurity1Pct || 0).toLocaleString()} - ${(bds?.bidSecurity2Pct || 0).toLocaleString()} MNT`}
- Specifications Summary:
${technicalSpecs?.realSpecsText ? technicalSpecs.realSpecsText.substring(0, 3000) : 'Technical requirements outlined in official dossier.'}

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
              return NextResponse.json({ reply, text: reply, structured: structuredInfo });
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
      const { bds, technicalSpecs, results } = structuredInfo || {};
      const fallbackAnalysis = `### 📋 "${targetTender.tenderName}" Тендерийн Шинжилгээ

#### 1. Үндсэн үзүүлэлт & Төсөв
* **Тендерийн нэр:** ${targetTender.tenderName}
* **Тендерийн код:** \`${targetTender.tenderCode || targetTender.invitationNumber || 'Бүртгэлтэй'}\`
* **Төсөвт өртөг:** **${formatBudget(targetTender.totalBudget || 0)}** (${(targetTender.totalBudget || 0).toLocaleString()} ₮)
* **Захиалагч:** ${targetTender.budgetEntityName}
* **Хугацаа:** Санал авах эцсийн хугацаа: ${targetTender.receiveDate || 'Тендерийн урилгаас харна уу'}
* **Төлөв:** ${targetTender.docStatusName || 'Нээлттэй'}

#### 2. ТШӨХ (I Бүлэг) - Хууль зүйн жишиг шаардлагууд
* **Бүрдүүлэх ерөнхий баримт бичиг:**
${bds?.generalRequirements?.map((r: string) => `  - ${r}`).join('\n') || '  - Улсын бүртгэлийн гэрчилгээ, татварын цахим тодорхойлолт'}
* **Санхүүгийн босго үзүүлэлт (Хуулийн жишиг тооцоолол):**
  - Борлуулалтын доод орлого: **${formatBudget(bds?.minAnnualTurnover || 0)}** (${(bds?.minAnnualTurnover || 0).toLocaleString()} ₮)
  - Түргэн хөрвөх чадвартай хөрөнгө / Зээлжих эрх: **${formatBudget(bds?.minLiquidAssets || 0)}** (${(bds?.minLiquidAssets || 0).toLocaleString()} ₮)
  - Ижил төстэй гэрээний дүн: **${formatBudget(bds?.similarContractThreshold || 0)}** (${(bds?.similarContractThreshold || 0).toLocaleString()} ₮)
  - Тендерийн баталгаа (1-2%): **${(bds?.bidSecurity1Pct || 0).toLocaleString()} ₮** - **${(bds?.bidSecurity2Pct || 0).toLocaleString()} ₮**
  - Гүйцэтгэлийн баталгаа: **5%** (${(bds?.performanceBond5Pct || 0).toLocaleString()} ₮)

#### 3. Техникийн тодорхойлолт & Нийлүүлэлтийн мэдээлэл
* **Нийлүүлэх газар:** ${technicalSpecs?.deliveryLocation || 'Захиалагчийн заасан хаяг'}
* **Нийлүүлэлтийн хугацаа:** ${technicalSpecs?.deliveryPeriodDays || 30} хоног
* **Баталгаат хугацаа:** ${technicalSpecs?.warrantyMonths || 12} сар
* **Урьдчилгаа төлбөр:** ${technicalSpecs?.paymentTerms?.advancePaymentPct || 20}%
* **Чанарын стандарт:** ${technicalSpecs?.standards?.join(', ') || 'MNS, ISO'}
* **Албан ёсны эх баримт (PDF):** tender.gov.mn дээр нээлттэй байршиж байна.

#### 4. Оролцогчдод өгөх шинжээчийн зөвлөмж
1. **Албан ёсны ТШББ татах:** tender.gov.mn дээрх энэ тендерийн албан ёсны хуудсаас ТШББ болон ажлын даалгаврыг татан нарийвчилсан шаардлагатай танилцах.
2. **Татвар & НДШ:** Татварын өргүй тухай e-Mongolia лавлагаа болон ажилтнуудын НДШ лавлагааг бэлтгэх.
3. **Банкны баталгаа:** Тендерийн баталгааг зөвшөөрөгдсөн маягтын дагуу арилжааны банкаар гаргуулах.
4. **tender.gov.mn илгээх:** Санал хүлээн авах эцсийн хугацаанаас хамгийн багадаа 2 цагийн өмнө Monpass тоон гарын үсгээр баталгаажуулж илгээх.`;

      return NextResponse.json({ reply: fallbackAnalysis, text: fallbackAnalysis, structured: structuredInfo });
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
