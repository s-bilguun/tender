# Active tender PDF acquisition

The worker reads `.env.tender-worker` (or `TENDER_WORKER_ENV_FILE`) and needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. A paid provider can be configured using one of `ZENROWS_API_KEY`, `SCRAPINGBEE_API_KEY`, `SCRAPER_API_KEY`, or `SCRAPER_PROXY_URL`. These are private secrets: do not commit them or include them in logs. Provider usage can incur charges. `ZENROWS_PROXY_COUNTRY` is optional; choose a country supported by the provider rather than assuming a Mongolian proxy exists.

On the remote Windows PC, pull the latest code and run `npm ci` with Node 20 or newer. Add a provider key to the existing local `.env.tender-worker`, then run the read-only smoke test:

```powershell
npx tsx scripts/test-pdf-provider.ts 1789954037772 1789954037652
```

For an up-to-date test, replace both IDs with an active tender and one of its known PDF file IDs. This makes paid provider requests but does not write to Supabase. If it fails, no automatic acquisition is established; check provider access, response, quota, and source availability. A provider may not be able to access this site.

After a passing test, run a small batch with `npx tsx scripts/sync-active-pdfs.ts --limit 1 --concurrency 1`. Verify every attachment and extraction result before expanding. The worker records incomplete lists and attachment errors so they can be retried, and stops after repeated source challenges. Its successful primary download is not proof that every source document was discovered or read.

To prepare a task, execute `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-active-pdf-task.ps1`. It is installed **disabled** until source access and Supabase credentials have been tested. Once verified, enable it with `Enable-ScheduledTask -TaskName 'TenderMN active PDF sync'`. The task checks when the user signs in and every hour while the PC is on and that user is signed in. It runs if the last successful run was at least 24 hours ago, with at least three hours between failed attempts. It cannot sync while the PC is off and may take longer than 24 hours between updates. Review provider costs first: a full run may make many paid requests. Logs are in `scratch/pdf-sync`.

The worker extracts text already present in PDFs; scanned pages still require the separate OCR queue. No provider guarantees access or full attachment coverage.
