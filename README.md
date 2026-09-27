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
3. GitHub Actions-ийн **Settings → Secrets and variables → Actions** хэсэгт `SUPABASE_URL` болон `SUPABASE_SERVICE_ROLE_KEY` secrets-ийг зөвхөн GitHub workflow-ийн гар diagnostic-д ашиглах бол нэмнэ. Cloud runner source-оос HTTP 403 авдаг тул өдөр тутмын sync-ийг тэндээс ажиллуулах хуваарийг идэвхгүй болгосон; өдөр тутмын browser worker-ийн зааврыг доороос харна уу.
4. `TENDER_SYNC_SECRET`-ийг Vercel-д урт, санамсаргүй server-side утгаар тохируулна. Энэ нь `/api/sync` route-ийг зөвхөн итгэмжлэгдсэн автоматжуулалтад нээнэ.
5. Manual PDF import ашиглах бол Vercel-д тусдаа `TENDER_PDF_IMPORT_SECRET` server-side утга үүсгэнэ. Энэ нь PDF оруулах эрхийг listing sync түлхүүрээс тусгаарлана.

### PDF and OCR coverage

Before relying on unattended ingestion, run **Actions → Tender source diagnostics and cloud sync → Run workflow** with `diagnostics_only` checked and a public invitation ID. This read-only mode checks the configured Supabase credentials and PDF queue table, tests normal HTTP access, and attempts to discover and download a real PDF using a clean Chromium browser on the cloud runner. The `pdf-source-diagnostic` artifact contains the report and a screenshot on source failure; it does not publish the downloaded PDF. A scheduled workflow is not proof that source access works. Cloudflare may block both direct HTTP and cloud browsers, in which case a worker host with verified public-source access or source-provider cooperation is needed. No tender.gov.mn API key is used by this diagnostic. GitHub accepts either `SUPABASE_URL` or the existing `NEXT_PUBLIC_SUPABASE_URL` secret, paired with a valid `SUPABASE_SERVICE_ROLE_KEY` from that same Supabase project.

The PDF worker enqueues tenders whose last extraction is older than 24 hours, then processes those jobs with a durable Supabase queue. The Windows browser worker needs Poppler on `PATH` to rasterize sparse-text pages for OCR, up to 100 pages per PDF; larger files remain explicitly partial. Text-layer PDFs are page-labeled, as are OCR results from rendered pages. If the page renderer is unavailable, the app can optionally use a labeled sample of up to three embedded images by setting `ENABLE_VISION_OCR=true`, `OPENROUTER_OCR_MODEL`, and `OPENROUTER_API_KEY`; those sample citations do not claim physical PDF page numbers. Failed source downloads remain queued for retry. The AI is told not to treat missing text as an absent requirement.

The “PDF says no bid security” count and filter include only active tenders whose stored extraction explicitly contains that phrase. They do not claim to cover tenders whose PDFs have not yet been processed.

### Automatic Windows worker when the cloud runner gets HTTP 403

The GitHub-hosted runner currently receives HTTP 403 from the source. Use the browser worker on a Windows PC where Microsoft Edge can open the public tender page and download its PDF. The GitHub Actions schedule is disabled; the workflow remains available for manual diagnostics.

1. On the remote PC, install Node.js 20+, check out this repository, and run `npm ci` from the repository folder.
2. Create `.env.tender-worker` in the repository root with the Supabase project URL and private service-role key. Keep this file on that PC; it is git-ignored and must never be committed:
   ```text
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-private-service-role-key
   ```
3. Run a read-only browser check first in PowerShell:
   ```powershell
   $env:TENDER_WORKER_DIAGNOSTICS_ONLY = 'true'
   node .\scripts\browser-tender-worker.cjs
   Remove-Item Env:TENDER_WORKER_DIAGNOSTICS_ONLY
   ```
   Edge opens visibly with a separate persistent profile. The check opens tender `1789954037772`, tries the rendered public download links first (then the document-list endpoint if no links are found), and downloads one PDF without changing Supabase. It saves HTTP status, page title, and any Cloudflare Ray ID to `scratch/browser-worker/report.json`, plus `source-page.png` on source failure. A Cloudflare script on an otherwise normal page is not treated as a block. If Edge displays a human verification challenge, complete it in the browser window. A hard 403 block may have no verification control; the worker reports that separately and stops.
4. Continue only after the check prints `PASS`. Run `node .\scripts\browser-tender-worker.cjs` once to sync listing pages and process the PDF queue. It uses Edge for the official pages and files, then the existing parser and Tesseract OCR for extraction.
5. Install Poppler on Windows and add its `Library\bin` folder to `PATH` for OCR of scanned PDF pages. The worker logs its run to `scratch\browser-worker`. Then install the daily task:
   ```powershell
   .\scripts\install-windows-worker-task.ps1
   ```
   By default it runs at 12:15 AM in that PC's local time. It runs only while your Windows user is signed in, so that Edge can run visibly. Keep the PC awake or allow the task to wake it. Task Scheduler logs are saved under `scratch\browser-worker`.

The worker's Edge profile is stored under `%LOCALAPPDATA%\TenderMN\EdgeSourceProfile`; it does not reuse your everyday Edge profile or saved passwords. The first automated run is a test: Edge automation may still be denied even though a normal Edge window works. The read-only diagnostic's `PASS` confirms one PDF download from that PC, not complete coverage or future unattended access. The listing sync and full queue must also succeed before relying on the daily task.

For comparison, you can open the same dedicated profile manually in Edge and visit the exact tender URL. Close that profile's Edge windows before restarting the worker, because two processes cannot safely share it. A successful manual visit does not guarantee automated access: challenge clearance can expire or be rejected by the source. Stealth flags and challenge-solving proxies are not a guaranteed fix. Poppler enables scanned-page OCR after download; it cannot resolve HTTP 403.

For scanned-page OCR, install Poppler from the [Windows Poppler releases](https://github.com/oschwartz10612/poppler-windows/releases), extract it, and add the folder containing `pdftoppm.exe` to the user's `PATH`. Open a new PowerShell window and confirm `pdftoppm -h` works before running the worker. Text-based PDFs do not need Poppler.

### Manual PDF import when the source blocks downloads

If tender.gov.mn lists a PDF but the server cannot fetch it, open the official tender page, download the PDF yourself, then use **PDF-г гараар оруулж уншуулах** on the TenderHub tender page. Enter the server-side `TENDER_PDF_IMPORT_SECRET` and select the PDF. The browser sends the file directly to a private Supabase Storage bucket; the server extracts its text and saves it with the tender so the summary and AI assistant can use it. The bucket is created automatically. Imports are limited to 20 MB and 100 pages.

Text-layer PDFs are extracted immediately without an OCR service. For scanned or partial PDFs, the import adds a job to the existing PDF queue. Run the Windows browser worker to rasterize pages with Poppler and OCR them locally with Tesseract.js; no AI API is required for this step. To process manually uploaded PDFs without refreshing official listings, set `$env:TENDER_SKIP_LISTING_SYNC = 'true'` before running the worker, then remove the variable afterward. If the optional sampled vision fallback is enabled, it can call the configured OpenRouter OCR model. The import key is held in page memory only and is not stored in the browser.
