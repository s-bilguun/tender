# Tender MN

Монгол улсын төрийн худалдан авах ажиллагааны (tender.gov.mn) нээлттэй өгөгдлийг хялбархан хайх, дүн шинжилгээ хийх, AI туслахтай интерактив портал систем.

## Онцлогууд (Features)

- **Нээлттэй өгөгдлийн шууд хайлт (Public Tender Search):**
  - Төрөл, салбар, төсөвт өртөг, тендерийн дугаар, огноогоор бодит цагт шүүж хайх
  - Table (хүснэгт) болон Card (картын) харагдацын горим
  - Хүснэгтийн багануудыг эрэмбэлэх (өртөг, огноо, хүчинтэй хугацаа)
- **AI Зөвлөх туслах (OpenRouter AI Assistant):**
  - Тендерийн үндсэн талбар болон олдсон PDF эшлэлд тулгуурлан хариулна
  - PDF-ийн өгөгдөл байхгүй эсвэл хэсэгчлэн боловсруулагдсан үед үүнийг ил тод хэлнэ
- **PDF баримтын боловсруулалт:**
  - Тендерийн дэлгэрэнгүйг нээхэд албан ёсны хавсралтыг шалгаж, текстийг боломжтой бол хуудасны дугаартай хадгална
  - Боловсруулалтын төлөвийг файл тус бүрээр харуулна; бүх скан PDF бүрэн OCR хийгдсэн гэж батлахгүй
- **Хос хэлний сонголт (MN / EN):**
  - Монгол болон Англи хэл хооронд шууд шилжих
- **Мэргэжлийн, цэвэрхэн дизайн (Clean Design):**
  - `ibelick/ui-skills` зарчимд нийцсэн нейтраль өнгө, тодорхой шатлал, tabular тоон формат

## Технологийн стек (Tech Stack)

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **AI Routing:** OpenRouter API (`openrouter/free`)

## Эхлүүлэх заавар (Quickstart)

1. **Хамааралтай сангуудыг суулгах:**
   ```bash
   npm install
   ```

2. **Орчны хувьсагч тохируулах (.env.local):**
   `.env.example` файлыг хуулж `.env.local` үүсгэнэ:
   ```bash
   cp .env.example .env.local
   ```
   `OPENROUTER_API_KEY` утгад өөрийн OpenRouter түлхүүрийг оруулна.

3. **Хөгжүүлэлтийн сервер асаах:**
   ```bash
   npm run dev
   # эсвэл өөр порт дээр:
   npm run dev:3001
   ```

4. **Тендерийн жагсаалтыг нэг удаа татах (Сонголттой):**
   ```bash
   node scripts/sync-to-supabase.js 1 3000
   ```

## Production setup

1. Supabase-д `supabase/migrations/20260926_preserve_live_bundle.sql`, `supabase/migrations/20260926_tender_analytics.sql`, `supabase/migrations/20260926_tender_pdf_jobs.sql` файлуудыг дарааллаар SQL Editor-оор ажиллуулна. Эхний migration нь жагсаалтын upsert PDF extraction багцыг дарахаас хамгаалж, хоёр дахь нь бодит aggregate тоонуудыг гаргаж, гурав дахь нь PDF ажлын дарааллыг хадгална.
2. Vercel-ийн **server-side environment variables**-д `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`-г тохируулна. Service role key-г `NEXT_PUBLIC_` нэртэй хувьсагчид хэзээ ч бүү хий.
3. GitHub Actions-ийн **Settings → Secrets and variables → Actions** хэсэгт `SUPABASE_URL` болон `SUPABASE_SERVICE_ROLE_KEY` secrets-ийг нэмнэ. `Daily tender listing sync` workflow өдөр бүр 16:00 UTC (Улаанбаатарын 00:00 цаг) ажиллаж, 1-р хуудаснаас эхлэн дээд тал нь 3000 хуудсыг шалгана. Дараа нь 24 цагаас хуучирсан PDF ажлуудыг дараалж боловсруулж, скан PDF-ийн хоосон тексттэй хуудсыг Poppler-аар зураг болгон, Tesseract.js Mongolian + English OCR-оор уншина. `workflow_dispatch`-аар гараар ажиллуулж болно. Source эсвэл Supabase алдаа гарвал workflow fail болно.
4. `TENDER_SYNC_SECRET`-ийг Vercel-д урт, санамсаргүй server-side утгаар тохируулна. Энэ нь `/api/sync` route-ийг зөвхөн итгэмжлэгдсэн автоматжуулалтад нээнэ.
5. Manual PDF import ашиглах бол Vercel-д тусдаа `TENDER_PDF_IMPORT_SECRET` server-side утга үүсгэнэ. Энэ нь PDF оруулах эрхийг listing sync түлхүүрээс тусгаарлана.

### PDF and OCR coverage

The daily workflow enqueues every tender whose last extraction is older than 24 hours, then processes those jobs with a durable Supabase queue. The runner installs Poppler and rasterizes sparse-text pages for OCR, up to 100 pages per PDF; larger files remain explicitly partial. Text-layer PDFs are page-labeled, as are OCR results from rendered pages. If the page renderer is unavailable, the app can optionally use a labeled sample of up to three embedded images by setting `ENABLE_VISION_OCR=true`, `OPENROUTER_OCR_MODEL`, and `OPENROUTER_API_KEY`; those sample citations do not claim physical PDF page numbers. Failed source downloads remain queued for retry. The AI is told not to treat missing text as an absent requirement.

The “PDF says no bid security” count and filter include only active tenders whose stored extraction explicitly contains that phrase. They do not claim to cover tenders whose PDFs have not yet been processed.

### Manual PDF import when the source blocks downloads

If tender.gov.mn lists a PDF but the server cannot fetch it, open the official tender page, download the PDF yourself, then use **PDF-г гараар оруулж уншуулах** on the TenderHub tender page. Enter the server-side `TENDER_PDF_IMPORT_SECRET` and select the PDF. The browser sends the file directly to a private Supabase Storage bucket; the server extracts its text and saves it with the tender so the summary and AI assistant can use it. The bucket is created automatically. Imports are limited to 20 MB and 100 pages.

Text-layer PDFs are extracted immediately without an OCR service. For scanned or partial PDFs, the import adds a job to the existing PDF queue. Run **Actions → Daily tender listing sync → Run workflow** in GitHub to rasterize pages with Poppler and OCR them locally with Tesseract.js; no AI API is required for this step. If the optional sampled vision fallback is enabled, it can call the configured OpenRouter OCR model. The import key is held in page memory only and is not stored in the browser.
