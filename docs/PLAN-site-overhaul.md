# TenderHub overhaul plan

Written for an executing agent. Work top to bottom. Each task lists files, exact
changes, and how to check it. Don't skip the checks.

The owner wants: a site that looks serious and premium (UI/UX is the top
priority), dark mode that is **not dark blue** (navy reads as cheap), every
screen polished in Mongolian, English and Chinese, and as much useful PDF
information as can be obtained legitimately.

Live site: https://tender-mu-five.vercel.app · Repo: `s-bilguun/tender` (branch
`main`, Vercel deploys every push) · Supabase project `rufnrfwghtgicecnzljj`.

---

## 0. Ground rules (read first)

**Pre-authorised by the owner:** push to `main`, run SQL on Supabase, change
Vercel environment variables, redeploy. Don't ask before doing these. Do ask
before anything outside this plan that changes production data.

**Hard limits (never, whatever the reason):**
- No getting around tender.gov.mn's Cloudflare check: no reusing a person's
  `cf_clearance` cookie, no stealth/undetected browsers, no CAPTCHA-solving
  services, no residential/rotating proxies, no automating a browser session a
  person cleared, no driving the owner's Brave/Edge to crawl.
- No made-up numbers presented as facts. If a value wasn't read from a source,
  show `—` or label it clearly as an estimate.
- No secrets in code or commits (`.env*` are git-ignored; keep it that way).
- Don't delete data through a website UI; do deletes via reviewed SQL/scripts.

**Environment setup (fresh session):**
1. Attach the repo (`add_repo s-bilguun/tender`, push access), clone to e.g.
   `/home/claude/tender-gh`, `npm ci`.
2. Dev server: `NEXT_TELEMETRY_DISABLED=1 npx next dev -p 3007` (run in the
   background). Without Supabase keys the app uses `lib/live-tenders.json`, so
   pages render with sample data. `next build` will fail at "collecting page
   data" without keys; that's expected. Use `npx tsc --noEmit -p .` plus the dev
   server instead.
3. Screenshots: `node scripts/dev/shots.cjs http://localhost:3007 /tmp/shots`
   (needs `require('playwright')`; Chromium is preinstalled). Look at every
   image after each phase. The script also prints page errors.
4. Never stop the dev server with `pkill -f "next dev"` from a shell whose own
   command line contains that text; it kills the shell. Use
   `kill $(lsof -t -i:3007)`.

**Commits:** identity `Claude <noreply@anthropic.com>`; end every message with
```
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```
Small commits per task. After pushing, wait for Vercel:
`gh api repos/s-bilguun/tender/commits/<sha>/status --jq .state` → `success`.

**Line endings:** the owner edits on Windows (CRLF working copy). The repo stores
LF. Edit in the Linux clone; don't rewrite whole files with different line
endings (`git diff --stat` should only show lines you meant to change).

**Owner's PC copy (optional):** if a linked computer is available, keep
`C:\Users\bilguun.s\tender` in sync by creating a git bundle
(`git bundle create x.bundle <old>..main`), copying it over, then
`git fetch x.bundle main:refs/remotes/origin/main && git -c core.autocrlf=true merge --ff-only origin/main`
and deleting the bundle. Never commit from the PC shell without
`-c core.autocrlf=true` (otherwise every file shows as changed).

---

## 1. Current state (Oct 28, 2026)

**Data**
- tender.gov.mn serves a Cloudflare challenge to every automated request
  (listings, `/api/*`, PDF downloads on `user.tender.gov.mn`), from cloud and
  from the owner's PC. `opendata.tender.gov.mn` no longer resolves.
- New tenders come from the public Telegram channel `t.me/s/tendergovmn` via
  `app/api/cron/telegram-sync/route.ts` (Vercel cron 06:00 and 14:00 UB). These
  rows have `raw_data.source = 'telegram'`: title, buyer, publish time,
  invitation ID only; no budget, deadline or PDF.
- ~23,000 historical tenders (with budgets) synced before Oct 7. 714 closed
  tenders had their PDF text stripped and storage was cleaned (quota fix).
- "Open" = deadline not passed, or (no deadline, `is_receiving=1`, published in
  the last 21 days). Implemented in `app/api/tenders/route.ts` and
  `app/api/analytics/route.ts`.
- Detail page for feed-only tenders shows an "Announcement only" notice and an
  estimated budget from similar past tenders (`estimateBudgetFromHistory` in
  `lib/tender-detail.ts`).

**Pending database work** (SQL files exist, not all applied):
- `supabase/migrations/20261028_tender_analytics_live.sql`: NOT applied yet.
  Without it the dashboard budget total shows `—`.
- `supabase/migrations/20261028_live_only_pdfs.sql`: applied.
- `public.tender_is_live()` doesn't yet include the 21-day rule for rows without
  a deadline (see task 2.2).

**Design state:** a first restyle removed emojis, gradients and glow shadows,
introduced IBM Plex Sans, a neutral KPI strip, and table-style buyer/sector
lists. Problems that remain (seen in screenshots):
- Dark mode is navy everywhere (`slate-950/900/800` = blue-tinted), plus tinted
  panels (`dark:bg-blue-950`, `dark:bg-amber-950/40`, …) that look muddy.
- `TenderDetailView.tsx` (269 KB, one component) is the weakest screen: coloured
  boxes per metric, an orange floating "AI" pill, a red "Түншлэл холбогдох" CTA,
  empty coloured icon squares where emojis used to be, a "2." heading with no
  "1." above it (line ~1599; item 1 is conditional), amber AI-chat card.
- `TenderSlideOver.tsx` (75 KB): coloured chips (blue code, green status), red
  deadline box, purple empty icon tile, same numbering bug (line ~707).
- 188 `locale === 'mn' ? '…' : '…'` ternaries have no Chinese branch, so zh
  users see English in places.
- Dead components (not imported anywhere): `ActiveFilterBar`, `ActiveRadarBar`,
  `AnalyticsView`, `BidReadinessChecklist`, `EcosystemStatsBanner`,
  `IndustryDiscoveryBar`, `StatusFilterTabs`, `SubmissionRoadmap`,
  `TenderDetailModal`.

---

## 2. Phase A — housekeeping (small, do first)

### 2.1 Apply the analytics SQL
Run the whole of `supabase/migrations/20261028_tender_analytics_live.sql` in the
Supabase SQL editor (`https://supabase.com/dashboard/project/rufnrfwghtgicecnzljj/sql/new`).
Supabase asks for confirmation on queries that replace objects; confirm.
**Check:** `select public.get_tender_analytics()->>'activeTendersCount';` returns
a number, and `/api/analytics` on the live site reports `"source":"supabase"`.

### 2.2 Teach the SQL "live" rule about deadline-less rows
Edit both SQL files so their notion of "open" matches the API:
- `tender_is_live(p_receive_date, p_is_receiving)` can't see `publish_date`.
  Add a 3-argument version `tender_is_live(receive_date, is_receiving, publish_date)`:
  open when `receive_date >= now() - interval '1 day'`, or when
  `receive_date is null and is_receiving = 1 and publish_date >= now() - interval '21 days'`.
- In `get_tender_analytics`, compute `is_receiving` with that same rule.
Test on local Postgres first (`/usr/lib/postgresql/16/bin`; create a table
with the production columns: `invitation_id bigint primary key, invitation_number,
tender_name, tender_code, tender_type_code, tender_type_name, total_budget numeric,
budget_entity_name, client_code, position_name, fund_name, rule_name,
publish_date timestamptz, open_date timestamptz, receive_date timestamptz,
doc_status_code, doc_status_name, is_receiving int, raw_data jsonb, created_at,
updated_at`). Then run on Supabase.
**Check:** the dashboard "Open tenders" number equals `/api/tenders?status=receiving&tabMode=active` `totalCount`.

### 2.3 Lock the sync endpoint
Generate a random 32-byte hex string. Add it as `CRON_SECRET` in Vercel
(Project → Settings → Environment Variables, Production). Vercel cron sends it
automatically as `Authorization: Bearer …`. Redeploy.
**Check:** opening `/api/cron/telegram-sync` in a browser returns 401; the next
scheduled run still succeeds (Vercel → Project → Cron Jobs shows success).

### 2.4 Delete dead components
Delete the nine files listed in §1. Run `npx tsc --noEmit -p .`.

### 2.5 Show data freshness honestly
In the sidebar "Source" box (`components/DashboardSidebar.tsx`, bottom), show
the newest `publish_date` ("Шинэчлэгдсэн: 2026-10-27 15:37") instead of a fixed
"tender.gov.mn". Get it from `/api/analytics` (`lastUpdatedAt` from the RPC, or
add `newestPublishDate` to the fallback path).

---

## 3. Phase B — visual system (top priority)

### 3.1 Design tokens (decide once, use everywhere)
Typeface: IBM Plex Sans (already loaded), tabular figures for numbers.
Radius: `rounded-md` for controls, `rounded-lg` for panels. No `rounded-full`
except status dots and avatars. No shadows except modals/popovers (`shadow-xl`).

| Role | Light | Dark (graphite, no blue) |
|---|---|---|
| Page background | `#f5f6f8` | `#0f0f11` |
| Surface (cards, panels) | `white` | `zinc-900` `#18181b` |
| Raised / hover | `slate-50` | `zinc-800` `#27272a` |
| Border | `slate-200` | `zinc-800` |
| Strong border / dividers | `slate-300` | `zinc-700` |
| Primary text | `slate-900` | `zinc-100` |
| Secondary text | `slate-500` | `zinc-400` |
| Accent (links, focus, selected) | `blue-600` | `blue-400` |
| Primary button | `slate-900` bg / white text | `white` bg / `zinc-900` text |

Semantic colours only for meaning, as **text or a 6 px dot**, never as tinted
panel backgrounds: open/eligible = emerald, needs partner/warning = amber,
urgent/closed/error = rose. Light mode may use `*-50` tints on small badges
only.

### 3.2 Mechanical dark-mode swap
Run `python3 scripts/dev/neutralize-dark.py` (dry run), then `--apply`. It
rewrites `dark:*-slate-N` → `dark:*-zinc-N`, tinted `dark:bg-*-950` panels →
`dark:bg-zinc-900`, tinted `dark:border-*-800/900` → `dark:border-zinc-800`,
and the navy hex values in `app/globals.css`. Then:
- `app/layout.tsx`: body `dark:bg-zinc-950` → `dark:bg-[#0f0f11]`; also the
  `.dark body` rule in `globals.css` (`#0f0f11`).
- `tailwind.config.js`: set `page.dark` to `#0f0f11`, `surface.dark` to
  `#18181b`, `surface.dark-subtle` to `#27272a`, `surface.dark-border` to `#3f3f46`.
- Scrollbar thumb in dark: `#3f3f46`.
**Check:** `grep -rn "dark:[a-z:-]*slate-" components app | wc -l` → 0, and
screenshots in dark show no blue cast on backgrounds (sample a background pixel:
R, G and B should be within 3 of each other).

### 3.3 Light-mode tinted panels
Search for `bg-(blue|indigo|purple|violet|emerald|amber|rose|teal|cyan)-50` on
panel-sized elements (`p-3`+ boxes, cards, banners) in `TenderDetailView`,
`TenderSlideOver`, modals. Replace with `bg-white` (or `bg-slate-50` for an inset)
plus `border-slate-200`, and move the meaning into a small coloured label or dot.
Keep tints only on badges ≤ 24 px tall.

---

## 4. Phase C — screen by screen

For each screen: make the change, screenshot light/dark/desktop/mobile, compare
with the previous shot, fix regressions, commit.

### 4.1 Tender detail page (`components/TenderDetailView.tsx`), biggest win
Split it first; a 269 KB component is too big to restyle safely. Create
`components/tender-detail/` and move, without changing behaviour:
`DetailHeader`, `CoverageNotice`, `BudgetEstimateCard`, `KeyFacts`,
`AiChatPanel`, `RequirementsTab`, `ItemsTab`, `ResultsTab`, `RelatedTab`,
`ForeignBidderTab`, `FloatingAiButton`. Keep props explicit. Check behaviour
is unchanged before restyling (same text in `get_page_text`).

Then restyle:
- **Header bar:** back link, tender code (mono-free tabular), status dot + text,
  then right side: language switch, theme, "Ask AI" (neutral secondary button),
  "Open on tender.gov.mn" (secondary), primary "Participate" (`slate-900`/white).
  Remove the amber "AI Шинжээч" button style.
- **Title block:** title (text-2xl semibold), buyer, a one-line meta row
  (type · published · deadline · budget). No coloured chips.
- **Key facts:** one 4-column ruled strip like the home KPI strip (budget,
  deadline, bid security, delivery). Replace the four coloured boxes and the
  "Шуурхай хураангуй" dark card. Values not read from the PDF show `—` with a
  small "PDF-ээс уншаагүй" caption.
- **Remove:** red "Түншлэл холбогдох" CTA (move partner matching into the
  Foreign bidder tab as a normal secondary button), empty coloured icon squares
  (delete the element; e.g. line ~1537 `h-8 w-8 rounded-md bg-indigo-600`),
  the orange floating pill (make it a neutral `zinc-900`/white round button with
  an icon only, 44 px, bottom-right, hidden on desktop when the AI panel is
  visible).
- **Numbering bug:** remove "1."/"2." prefixes from requirement headings (the
  first item is conditional, so "2." appears alone).
- **Tabs:** underline style (active: text-slate-900 + 2 px bottom border), no
  pill backgrounds, horizontally scrollable on mobile.
- **AI chat panel:** neutral surface, no amber; suggested questions as plain
  outline chips.

### 4.2 Slide-over (`components/TenderSlideOver.tsx`)
Same rules: code as plain text, status as dot + text, deadline as a ruled fact
(rose text only when < 48 h), remove the purple icon tile, fix "2." heading,
footer buttons: "Download" secondary, "Participate" primary neutral.
Consider replacing the slide-over's duplicated sections with the extracted
detail components from 4.1.

### 4.3 Home list
- Cards (`TenderCard.tsx`): already neutral. Add a small "Зар" (announcement)
  tag for `source === 'telegram'`; show "Хугацаа: tender.gov.mn" instead of `—`
  deadline for those; consistent 3-line title clamp; equal card heights per row.
- Table view (`TenderTable.tsx`): restyle to match the buyer table (header row
  `text-[11px] text-slate-500`, row hover, no zebra); make it the default view
  on desktop ≥ 1280 px; cards on mobile.
- Filters (`TenderFilters.tsx`): one row of status tabs (underline style), one
  row of compact selects; collapse advanced filters into a "Шүүлтүүр" popover.
  Remove any remaining coloured icons.

### 4.4 Header & sidebar
- Header: search field full height 40 px, keyboard hint `⌘K` muted; language
  switch segmented; remove duplicate "Ask AI" if the sidebar has one (keep the
  header one, drop the sidebar button).
- Sidebar: keep; check collapsed state icons align; active item uses
  `bg-slate-200/70 dark:bg-zinc-800`.

### 4.5 Modals and drawers
`AIChatDrawer`, `TenderPdfReaderModal`, `PricingSubscriptionModal`,
`TenderDocAuditModal`, `TenderFinanceModal`, `ChinaSupplierModal`,
`CommandPalette`: neutral surfaces, one primary button each, close with Esc and
backdrop click, focus trapped, `role="dialog" aria-modal="true"`. Remove
leftover coloured headers and tinted info boxes.

### 4.6 Empty, loading and error states
`EmptyState.tsx`, `TenderSkeleton.tsx`, `app/tender/[id]/loading.tsx`:
skeletons in `slate-100 / zinc-800`; empty state says what to do next ("Clear
filters", "Search all tenders"). The detail page loading text currently claims
it's "reading PDF attachments"; change to a neutral "Loading tender…".

### 4.7 Internationalisation
Every user-visible string needs mn/en/zh. Find the 188 two-way ternaries:
`grep -n "locale === 'mn' ? '[^']*' : '[^']*'" components/*.tsx app/page.tsx`.
Convert each to a three-way form. Prefer moving repeated strings into
`lib/translations.ts`. Use plain, natural Chinese (Simplified); no marketing
slogans. Remove remaining claims that aren't true (e.g. "中行乌兰巴托分行" as a
partner, "90% 出海中企首选").

### 4.8 Mobile pass
At 390 px: no horizontal scroll on any screen; header shows logo, search icon,
language, menu; KPI strip 2×2; tables become stacked rows; detail tabs scroll
horizontally; tap targets ≥ 40 px.

### 4.9 Accessibility
Visible focus ring (`:focus-visible` already defined, check it shows on
buttons/links); text contrast ≥ 4.5:1 in both themes (zinc-400 on zinc-900 is
fine; slate-400 on white is not, so use slate-500 for body text); icons-only
buttons get `aria-label`.

---

## 5. Phase D — PDF information (legitimate routes only)

Reality: PDFs live behind tender.gov.mn's human check, so a program can't
fetch them. In order of value:

### 5.1 Official access (needs the owner to send one message)
Write the request below as `docs/request-data-access.md` and tell the owner
where it is. Contact: Төрийн худалдан авах ажиллагааны газар, e-procurement & IT
department; channels: contact page on tender.gov.mn (opened by a person),
Facebook `facebook.com/spagovmn`, or the government 11-11 centre.

> Төрийн худалдан авах ажиллагааны газрын Цахим худалдан авах ажиллагаа,
> мэдээллийн технологийн хэлтэст
>
> Сайн байна уу. Бид tender.gov.mn-д нийтлэгдсэн тендерийн урилгыг гадаад
> болон дотоодын нийлүүлэгчдэд монгол, англи, хятад хэлээр хүргэх TenderHub
> үйлчилгээг хөгжүүлж байна.
>
> Өмнө нь ажиллаж байсан opendata.tender.gov.mn REST API одоогоор нээгдэхгүй
> байгаа тул дараах хоёрын аль нэгийг хүсэж байна:
> 1. Нээлттэй өгөгдлийн API-д (тендерийн урилга, хавсралт баримт бичиг)
>    хандах токен олгох, эсвэл
> 2. Манай серверээс тендерийн жагсаалт болон ТШББ хавсралтыг автоматаар
>    татахыг зөвшөөрөх (хүсэлтийн давтамжийг өдөрт хэдэн зуу хүртэл хязгаарлана).
>
> Токен нь бүх нийтэд зарлагдсан тендерийг хамрах эсэх, ашиглалтын нөхцөл,
> төлбөртэй эсэхийг тодруулж өгнө үү.
>
> Хүндэтгэсэн,
> [Нэр, байгууллага, утас, имэйл]

When access is granted: add the token as `TENDER_OPENDATA_TOKEN` in Vercel, write
`lib/opendata-client.ts` against the documented endpoints
(`POST /api/invitation` with `current_page`, `per_page`, `tenderYear`;
bearer auth; form-encoded) and switch the cron to it.

### 5.2 Resume automatically if the site opens up (done)
`scripts/run-windows-tender-worker.ps1` runs `scripts/source-probe.cjs` nightly
on the owner's PC and only starts the Edge worker when tender.gov.mn answers
without a challenge (capped at the newest 30 listing pages). Nothing to do
except keep it working.

### 5.3 "Add the PDF" for users (build this)
Let any visitor who has the tender PDF (downloaded from tender.gov.mn as a
person) drop it on the tender page, so the summary appears for everyone.
- UI: on the detail page, when there's no PDF text, a drop zone "Тендерийн
  баримт бичиг (PDF) нэмэх → AI хураангуй гаргана". Max 25 MB, PDF only.
- Extraction in the browser (no file upload, no storage quota):
  `pdfjs-dist` to read the text layer; for pages with < 80 characters, render
  to canvas and OCR with `tesseract.js` (`mon` + `eng` language data; already a
  dependency). Show progress per page. Cap OCR at 60 pages.
- Send `{ invitationId, pages: [{ n, text }] , fileName, sha256 }` to a new
  `POST /api/tenders/[id]/pdf-text`. Server: rate-limit by IP (e.g. 5/hour),
  reject if the tender already has `liveBundle.pdfText` from the same sha256,
  verify the text mentions the tender (title words or code) to stop spam,
  store `raw_data.liveBundle.pdfText` (page-labelled, like the existing worker
  output), set `extractionStatus`, then run the existing parser
  (`lib/live-fetcher.ts` section isolation → `structuredSpecs`) so the
  requirements tabs fill in.
- Label it: "Хэрэглэгчийн оруулсан баримтаас уншсан · {date}". Keep the
  "check the official file" note.

### 5.4 Better AI on announcement-only tenders
In `app/api/ai/chat/route.ts`, when a tender has no PDF text, give the model the
announcement fields plus the budget estimate and the 5 most similar past
tenders (with their budgets and, where stored, their requirements). The AI
should say plainly that it hasn't seen this tender's documents.

---

## 6. Phase E — final QA (every item must pass)

- [ ] `npx tsc --noEmit -p .` clean; dev server shows no page errors in `shots.cjs`.
- [ ] Dark screenshots: no navy anywhere; backgrounds neutral; text readable.
- [ ] Light screenshots: no tinted panels larger than a badge.
- [ ] mn / en / zh: switch on home, list, slide-over, detail, every modal; no
      untranslated strings (spot-check 20 elements per screen).
- [ ] 390 px: no horizontal scroll (`document.documentElement.scrollWidth <= 390`).
- [ ] Live site: `/api/analytics` source `supabase`, budget total not `—`;
      open count = list count; newest tender ≤ 1 day old.
- [ ] A Telegram-only tender page shows the notice + estimate, no `₮0`, no
      PDF-derived claims.
- [ ] A tender with PDF text shows requirements and the AI answers with citations.
- [ ] `/api/cron/telegram-sync` returns 401 without the secret.
- [ ] Lighthouse (Chrome DevTools) on home: Accessibility ≥ 90.

When done, write a short changelog at the top of this file and tell the owner
what changed and what still needs a person (only §5.1).
