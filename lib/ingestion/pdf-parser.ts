// Next.js Webpack bundler fix: import directly from pdf-parse/lib/pdf-parse.js to avoid test file debug check
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export interface ExtractedPdfResult {
  text: string;
  numPages: number;
  info?: any;
  isScanned?: boolean;
}

/**
 * PDF Buffer-аас текст задлах (Cloud-friendly / Vercel Serverless compatible)
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<ExtractedPdfResult> {
  try {
    const data = await pdfParse(buffer, {
      pagerender: function (pageData: any) {
        return pageData.getTextContent().then(function (textContent: any) {
          let lastY: number | undefined;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === undefined || lastY === item.transform[5]) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          return text;
        });
      },
    });

    const cleanText = data.text.replace(/\r\n/g, '\n').replace(/\t/g, ' ').trim();
    const isScanned = cleanText.length < 60; // Хэрэв текст маш бага гарвал зураг байх магадлалтай

    return {
      text: cleanText,
      numPages: data.numpages,
      info: data.info,
      isScanned,
    };
  } catch (error: any) {
    throw new Error(`PDF уншихад алдаа гарлаа: ${error.message}`);
  }
}

/**
 * Цахим холбоос (URL)-аас PDF татаж текст задлах
 */
export async function extractTextFromPdfUrl(url: string): Promise<ExtractedPdfResult> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
  });

  if (!response.ok) {
    throw new Error(`PDF файлыг татаж чадсангүй: HTTP ${response.status} (${url})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return extractTextFromPdfBuffer(buffer);
}
