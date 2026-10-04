import { supabaseAdmin, supabase } from '@/lib/supabase';
import { TenderStructuredData } from './llm-extractor';
import { IndustryVertical } from '@/lib/types';

/**
 * Монгол салбарын нэрийг дотоод IndustryVertical кодонд хөрвүүлэх
 */
export function mapSectorToIndustry(sector: string): IndustryVertical {
  switch (sector) {
    case 'Барилга':
      return 'construction';
    case 'Мэдээллийн технологи':
      return 'it';
    case 'Эрүүл мэнд':
      return 'medical';
    case 'Боловсрол':
      return 'stationery';
    case 'Уул уурхай':
      return 'mining';
    default:
      return 'all';
  }
}

/**
 * Тендерийн төрлийг (JOB / PRODUCT / SERVICE) тодорхойлох
 */
export function mapSectorToTenderType(sector: string): { code: string; name: string } {
  if (sector === 'Барилга') {
    return { code: 'JOB', name: 'Ажил' };
  }
  if (sector === 'Мэдээллийн технологи' || sector === 'Эрүүл мэнд') {
    return { code: 'PRODUCT', name: 'Бараа' };
  }
  return { code: 'SERVICE', name: 'Үйлчилгээ' };
}

/**
 * LLM-ээс гарсан бүтэцлэгдсэн өгөгдлийг Supabase / PostgreSQL баазад хадгалах
 */
export async function saveTenderToDatabase(data: TenderStructuredData, sourceUrl?: string) {
  const client = supabaseAdmin || supabase;

  // Огноо тодорхойлох
  const pubDate = data.publish_date ? new Date(data.publish_date).toISOString() : new Date().toISOString();
  // Төгсөх хугацааг 14 хоногийн дараа эсвэл тухайн оны төгсгөлөөр тооцох
  const receiveDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const industry = mapSectorToIndustry(data.sector);
  const typeInfo = mapSectorToTenderType(data.sector);

  // invitation_id үүсгэх (хэрэв тоон ID байхгүй бол hash эсвэл цагийн тамгаар)
  const invitationId = data.tender_id.replace(/\D/g, '') || String(Date.now());

  const rowData = {
    invitation_id: invitationId,
    invitation_number: data.tender_id,
    tender_code: data.tender_id,
    tender_name: data.project_title_mn,
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
    raw_data: {
      sourceUrl,
      llmExtracted: {
        sector: data.sector,
        budget_category: data.budget_category,
        deadline_year: data.deadline_year,
        key_requirements: data.key_requirements,
        historical_comparison_notes: data.historical_comparison_notes,
      },
      liveBundle: {
        schemaVersion: 2,
        documents: sourceUrl ? [{ name: `${data.tender_id}.pdf`, url: sourceUrl }] : [],
        structuredSpecs: {
          keyRequirements: data.key_requirements,
          historicalNotes: data.historical_comparison_notes,
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
      console.warn('Supabase хадгалахад алдаа гарлаа (бааз тохируулаагүй байж болно):', error.message);
      return { success: false, error: error.message, fallbackRecord: rowData };
    }

    return { success: true, record: inserted?.[0] || rowData };
  } catch (err: any) {
    console.warn('DB хандалтын алдаа:', err.message);
    return { success: false, error: err.message, fallbackRecord: rowData };
  }
}
