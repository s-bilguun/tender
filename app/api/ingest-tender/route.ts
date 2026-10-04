import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdfBuffer, extractTextFromPdfUrl } from '@/lib/ingestion/pdf-parser';
import { extractTenderDataWithLLM } from '@/lib/ingestion/llm-extractor';
import { saveTenderToDatabase } from '@/lib/ingestion/db-adapter';
import { findSimilarTendersAndWinners } from '@/lib/ingestion/similar-finder';

export const runtime = 'nodejs'; // pdf-parse requires Node.js runtime
export const maxDuration = 60;   // Vercel Serverless execution limit

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let extractedText = '';
    let sourceUrl: string | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfResult = await extractTextFromPdfBuffer(buffer);
      extractedText = pdfResult.text;
    } else {
      const body = await req.json();
      const { url } = body;
      if (!url) {
        return NextResponse.json({ error: 'Target tender PDF URL is required' }, { status: 400 });
      }
      sourceUrl = url;
      // Stealth fetch bypasses Cloudflare Bot Management on tender.gov.mn
      const pdfResult = await extractTextFromPdfUrl(url);
      extractedText = pdfResult.text;
    }

    if (!extractedText || extractedText.length < 30) {
      return NextResponse.json(
        {
          error: 'Could not extract text from the PDF document (the file might be a scanned image without OCR text).',
        },
        { status: 422 }
      );
    }

    // 1. Run LLM Structured Extraction (Gemini 1.5 Flash 1M Context / GPT-4o-mini)
    const structuredData = await extractTenderDataWithLLM(extractedText);

    // 2. Discover Similar Historical Tenders and Awarded Winners
    const { similarTenders, marketIntelligence } = await findSimilarTendersAndWinners(structuredData);

    // 3. Save to Database (PostgreSQL / Supabase)
    const dbResult = await saveTenderToDatabase(structuredData, sourceUrl);

    return NextResponse.json({
      success: true,
      tender: structuredData,
      similar_tenders: similarTenders,
      market_intelligence: marketIntelligence,
      db_saved: dbResult.success,
      db_error: dbResult.error,
      model_used: process.env.LLM_MODEL || 'gemini-1.5-flash',
    });
  } catch (error: any) {
    console.error('[Ingest API Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal ingestion error',
      },
      { status: 500 }
    );
  }
}
