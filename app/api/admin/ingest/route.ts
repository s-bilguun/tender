import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPdfBuffer, extractTextFromPdfUrl } from '@/lib/ingestion/pdf-parser';
import { extractTenderDataWithLLM } from '@/lib/ingestion/llm-extractor';
import { saveTenderToDatabase } from '@/lib/ingestion/db-adapter';
import { findSimilarTendersAndWinners } from '@/lib/ingestion/similar-finder';

export const runtime = 'nodejs'; // pdf-parse Node.js runtime шаарддаг
export const maxDuration = 60;   // Vercel serverless function timeout

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let extractedText = '';
    let sourceUrl: string | undefined = undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'PDF файл олдсонгүй' }, { status: 400 });
      }
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfResult = await extractTextFromPdfBuffer(buffer);
      extractedText = pdfResult.text;
    } else {
      const body = await req.json();
      const { url } = body;
      if (!url) {
        return NextResponse.json({ error: 'PDF URL шаардлагатай' }, { status: 400 });
      }
      sourceUrl = url;
      const pdfResult = await extractTextFromPdfUrl(url);
      extractedText = pdfResult.text;
    }

    if (!extractedText || extractedText.length < 20) {
      return NextResponse.json({ 
        error: 'PDF-ээс текст уншиж чадсангүй (Сканнердсан зурагт PDF байх магадлалтай).' 
      }, { status: 422 });
    }

    // 2. LLM-ээр бүтэцлэгдсэн өгөгдөл гаргах
    const structuredData = await extractTenderDataWithLLM(extractedText);

    // 3. Төстэй өмнөх тендерүүд & Ялагчдыг олох
    const { similarTenders, marketIntelligence } = await findSimilarTendersAndWinners(structuredData);

    // 4. Database-д хадгалах
    const dbResult = await saveTenderToDatabase(structuredData, sourceUrl);

    return NextResponse.json({
      success: true,
      data: structuredData,
      similarTenders,
      marketIntelligence,
      dbSaved: dbResult.success,
      dbError: dbResult.error,
    });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    return NextResponse.json({ error: error.message || 'Алдаа гарлаа' }, { status: 500 });
  }
}
