# Active tender PDF acquisition

The local Edge worker reads the official tender listing and discovers attachment links on the source's public legacy detail pages. It uses an isolated Edge profile, waits for automatic source checks, validates downloaded file signatures, and stores PDF text and page references. It does not use your everyday browser profile. Source access can still fail or require a human check; blocked files are not reported as downloaded and the worker stops after a source block.

Test the source connection without Supabase credentials or database changes:

```powershell
$env:TENDER_WORKER_DIAGNOSTICS_ONLY = 'true'
node scripts/browser-tender-worker.cjs
Remove-Item Env:TENDER_WORKER_DIAGNOSTICS_ONLY
```

For another tender, set `TENDER_WORKER_DIAGNOSTIC_TENDER_ID` before running the diagnostic. To test two pages of official listings instead of PDFs, set `TENDER_WORKER_DIAGNOSTIC_LISTING=true` alongside `TENDER_WORKER_DIAGNOSTICS_ONLY=true`. The report is saved in `scratch/browser-worker/report.json`; it contains no cookies or keys.

For the full worker, `CONFIGURE-LOCAL-WORKER.cmd` securely prompts for the Supabase project URL and service-role key, verifies read-only Storage access, and saves them outside this OneDrive checkout at `%LOCALAPPDATA%\TenderMN\worker.env`. Never paste the key into chat or commit it. The worker also supports an existing ignored `.env.tender-worker`. Optional `TENDER_MAX_SYNC_PAGES` sets the listing page cap and `TENDER_PDF_LIMIT` limits a run for a pilot. The worker needs the PC on, the Windows user signed in, Node.js, installed npm dependencies, and Microsoft Edge. Scanned pages need the OCR queue and Poppler; each downloaded attachment is currently limited to 40 MB.

When the source blocks Edge downloads, the worker falls back to a configured provider. On 8 November 2026, ZenRows successfully retrieved and saved a source PDF, but individual downloads can still fail or time out. Run `CONFIGURE-DOWNLOAD-PROVIDER.cmd` to test a ZenRows key against a real attachment and store it locally only on success. Provider keys stay outside the repository. Provider credits, quotas and pricing apply, and the free tier may not cover all attachments. `SCRAPINGBEE_API_KEY`, `SCRAPER_API_KEY`, and `SCRAPER_PROXY_URL` are also supported but have not been verified with this source.

To prepare this PC's task, execute `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-active-pdf-task.ps1`. It is installed **disabled** until source access and Supabase credentials have been verified. Once verified, enable it with `Enable-ScheduledTask -TaskName 'TenderMN active PDF sync'`. It checks at sign-in and hourly, runs after 24 hours since the last successful run, and waits at least three hours between failed attempts. It cannot sync while the PC is off. Logs are in `scratch/pdf-sync`.

For a one-time active-tender backlog run, use `scripts/run-active-pdf-backfill.ps1`; it skips listing sync and logs to `scratch/pdf-sync`. The daily task checks for an existing browser worker to prevent overlap. The source may block automated access or contain attachments not exposed on the legacy page. A successful sample doesn't prove full coverage; check the run logs and failure counts before relying on the sync.
