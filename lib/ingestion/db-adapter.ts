import { supabaseAdmin, supabase } from '@/lib/supabase';
import { TenderStructuredData } from './llm-extractor';
import { IndustryVertical } from '@/lib/types';

/**
 * Монгол салбарын нэрийг дотоод IndustryVertical кодонд хөрвүүлэх
 */
export function mapSectorToIndustry(sector: string): IndustryVertical {
  if (!sector) return 'all';
  const s = sector.toLowerCase();
  if (s.includes('барилга') || s.includes('засвар') || s.includes('зам')) return 'construction';
  if (s.includes('мэдээлэл') || s.includes('технологи') || s.includes('програм') || s.includes('it')) return 'it';
  if (s.includes('эмнэлэг') || s.includes('эрүүл мэнд') || s.includes('эм')) return 'medical';
  if (s.includes('хүнс') || s.includes('хоол')) return 'food';
  if (s.includes('тээвэр') || s.includes('шатахуун')) return 'transport';
  if (s.includes('уул уурхай') || s.includes('хүнд үйлдвэр')) return 'mining';
  if (s.includes('харуул') || s.includes('цэвэрлэгээ')) return 'facility';
  if (s.includes('боловсрол') || s.includes('бичиг хэрэг') || s.includes('ном')) return 'stationery';
  if (s.includes('зөвлөх') || s.includes('аудит')) return 'consulting';
  return 'all';
}

/**
 * Тендерийн төрлийг (JOB / PRODUCT / SERVICE) тодорхойлох
 */
export function mapSectorToTenderType(sector: string): { code: string; name: string } {
  const ind = mapSectorToIndustry(sector);
  if (ind === 'construction') return { code: 'JOB', name: 'Ажил' };
  if (ind === 'it' || ind === 'medical' || ind === 'food' || ind === 'stationery') {
    return { code: 'PRODUCT', name: 'Бараа' };
  }
  return { code: 'SERVICE', name: 'Үйлчилгээ' };
}

/**
 * LLM-ээс гарсан бүтэцлэгдсэн өгөгдлийг Supabase / PostgreSQL баазад хадгалах
 */
export async function saveTenderToDatabase(data: TenderStructuredData, sourceUrl?: string) {
  const client = supabaseAdmin || supabase;

  const pubDate = data.publish_date ? new Date(data.publish_date).toISOString() : new Date().toISOString();
  let receiveDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  if (data.deadline) {
    try {
      const parsed = new Date(data.deadline);
      if (!isNaN(parsed.getTime())) {
        receiveDate = parsed.toISOString();
      }
    } catch {}
  }

  const typeInfo = mapSectorToTenderType(data.sector);
  const invitationId = data.tender_id.replace(/\D/g, '') || String(Date.now());
  const title = data.project_title || (data as any).project_title_mn || '';

  const rowData = {
    invitation_id: invitationId,
    invitation_number: data.tender_id,
    tender_code: data.tender_id,
    tender_name: title,
    budget_entity_name: data.buyer_name,
    position_name: data.buyer_name,
    total_budget: data.estimated_budget_mnt || 0,
    tender_type_code: typeInfo.code,
    tender_type_name: typeInfo.name,
    publish_date: pubDate,
    receive_date: receiveDate,
    doc_status_code: 'RECEIVE_TENDER',
    doc_status_name: 'Тендер хүлээн авч байгаа',
    doc_status_color: '#10b981',
    is_receiving: 1,
    full_scope_of_work: data.full_scope_of_work || '',
    eligibility_requirements: data.eligibility_requirements || [],
    raw_data: {
      sourceUrl,
      llmExtracted: {
        sector: data.sector,
        budget_category: data.budget_category,
        deadline: data.deadline,
        eligibility_requirements: data.eligibility_requirements,
        full_scope_of_work: data.full_scope_of_work,
        historical_comparison_flags: data.historical_comparison_flags,
      },
      liveBundle: {
        schemaVersion: 2,
        documents: sourceUrl ? [{ name: `${data.tender_id}.pdf`, url: sourceUrl }] : [],
        structuredSpecs: {
          keyRequirements: data.eligibility_requirements,
          fullScopeOfWork: data.full_scope_of_work,
          historicalNotes: data.historical_comparison_flags,
        },
      },
    },
  };

  try {
    const { data: inserted, error } = await client
      .from('tenders')
      .upsert([rowData], { onConflict: 'invitation_number' })
      .select();

    if (error) {
      console.warn('Supabase upsert warning:', error.message);
      return { success: false, error: error.message, fallbackRecord: rowData };
    }

    return { success: true, record: inserted?.[0] || rowData };
  } catch (err: any) {
    console.warn('Database save error:', err.message);
    return { success: false, error: err.message, fallbackRecord: rowData };
  }
}
