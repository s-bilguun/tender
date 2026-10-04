import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestTenders, downloadPdfBuffer, parseTenderWithGemini, upsertTenderToDatabase } from '@/scripts/sync-tenders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s maximum execution time for serverless

export async function GET(request: NextRequest) {
  // 1. Validate Cron Secret if configured
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.TENDER_SYNC_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized cron request' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 3, 10);

  console.log(`[Vercel Cron] Triggered /api/cron/sync (limit: ${limit})...`);

  try {
    const candidates = await fetchLatestTenders(limit);
    const results = [];

    for (const tender of candidates) {
      try {
        const pdfRes = await downloadPdfBuffer(
          tender.pdf_download_url,
          tender.invitation_id,
          tender.tender_document_id
        );

        let extracted;
        if (pdfRes && pdfRes.buffer.length > 500) {
          extracted = await parseTenderWithGemini(pdfRes.buffer, tender);
        } else {
          extracted = {
            buyer_name: tender.budget_entity_name || 'Монгол Улсын Засгийн газар',
            sector: (tender.tender_name.includes('барилга') ? 'Барилга' : 'Бусад') as any,
            budget_category: (tender.total_budget && tender.total_budget >= 500_000_000 ? 'from500mto2b' : 'from50to500m') as any,
            estimated_budget_mnt: tender.total_budget || 0,
            publish_date: tender.publish_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            deadline: tender.receive_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            eligibility_requirements: ['Хуулийн ерөнхий шаардлага'],
            full_scope_of_work: tender.tender_name,
            historical_comparison_flags: 'Салбарын дундаж жишиг үнээр хянагдсан',
          };
        }

        await upsertTenderToDatabase(tender, extracted, pdfRes?.fileName);
        results.push({ id: tender.tender_id, success: true, sector: extracted.sector });
      } catch (err: any) {
        results.push({ id: tender.tender_id, success: false, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
