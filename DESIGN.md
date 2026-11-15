---
name: TenderHub Cross-Border Design System
version: 1.0.0
mode: Operate
references:
  - .agents/design-references/linear.DESIGN.md
  - .agents/design-references/mercury.DESIGN.md
  - .agents/design-references/stripe.DESIGN.md
  - .agents/skills/impeccable/reference/mode-operate.md
  - .agents/skills/impeccable/reference/craft-floor.md
---

# TenderHub Design System (`DESIGN.md`)

> **Surface Mode (`impeccable` `Operate`):** Built for Chinese and international cross-border procurement teams discovering, verifying, and pricing Mongolian government tenders (`tender.gov.mn`). Precision, scanability, bilingual clarity, and document traceability outrank decorative flourish.

---

## 1. Visual Architecture & Theme Polarity

We combine **Linear's structural density** with **Mercury & Stripe's institutional contrast** and **cross-border document readability**:

- **Committed Shell + Tinted Work Surface (never flat grey-on-grey):**
  - The workspace shell uses distinct tonal steps rather than uniform flat boxes.
  - **Light Mode (Institutional Porcelain):** Tinted ground `#fbfcfd`, crisp elevated surfaces `#ffffff`, committed subtle chrome `#f4f6f9` (or optional high-contrast `#171721` ink-night rail/header), 1px hairlines `#e4e7ec`.
  - **Dark Mode (Linear Obsidian):** Deep canvas `#010102`, primary surface `#0f1011`, raised surface `#141516`, hover surface `#18191a`, 1px hairlines `#23252a` (strong `#34343a`).
- **Single Primary Action Accent (`Indigo`):**
  - Restrained architectural indigo for active selections, primary CTAs, focus rings, and active tab underlines:
    - Light Accent: `#5266eb` (hover `#4356d6`)
    - Dark Accent: `#5e6ad2` (hover `#828fff`)
- **Semantic Verification Tokens (Earned by real data only):**
  - Verified / PDF Extracted / Direct Foreign Bid Eligible: `#10b981` (emerald) / `#27a644`
  - Joint Venture Suggested / Partial Verification / Closing < 72h: `#f59e0b` (amber)
  - Urgent / Failed / Disqualified: `#ef4444` (crimson)

---

## 2. Color Tokens Reference

| Token | Light Mode | Dark Mode | Role |
| :--- | :--- | :--- | :--- |
| `--bg-canvas` | `#fbfcfd` | `#010102` | Page ground / terminal canvas |
| `--bg-shell` | `#171721` (contrast) / `#f4f6f9` | `#0d0f14` | Navigation rail & command bar |
| `--bg-surface` | `#ffffff` | `#0f1011` | Primary cards, ledger rows, dossier panels |
| `--bg-surface-2` | `#f8fafc` | `#141516` | Nested key-facts strip, subtle headers |
| `--bg-surface-hover` | `#f1f5f9` | `#18191a` | Interactive row / control hover |
| `--border-hairline` | `#e4e7ec` | `#23252a` | 1px structural dividers & borders |
| `--border-strong` | `#cbd5e1` | `#34343a` | Focused controls & active dividers |
| `--ink-primary` | `#28253b` / `#0f172a` | `#f7f8f8` | Headlines, primary titles, RMB figures |
| `--ink-secondary` | `#475569` | `#d0d6e0` | Body prose, Mongolian subtitles, buyer names |
| `--ink-muted` | `#64748b` | `#8a8f98` | Secondary metrics (`₮ MNT`), timestamps, labels |
| `--accent-primary` | `#5266eb` | `#5e6ad2` | Primary CTAs, active nav, selection indicator |

---

## 3. Typography & Bilingual Hierarchy

- **Font Stack:**
  - **UI & Headlines:** `Geist`, `Plus Jakarta Sans`, `IBM Plex Sans`, `-apple-system`, `"PingFang SC"`, `"Microsoft YaHei"`, `sans-serif`.
  - **Monospace Telemetry (Codes & Money):** `Geist Mono`, `JetBrains Mono`, `ui-monospace`, `monospace`.
- **Mandatory Numeric Discipline:**
  - Every currency figure (`¥ 4,850,000`, `₮ 2,291,625,000`), item count, percentage, countdown, and tender code (`ТШЗ-2026/0419`) MUST use `font-variant-numeric: tabular-nums` (`tabular-nums`).
- **Bilingual Information Order:**
  - When `locale === 'zh'`: Primary Chinese headline (`15px–16px`, `font-semibold`, `tracking-[-0.015em]`, `leading-snug`) sits directly above the subtle original Mongolian string (`12px`, `--ink-muted`, `truncate`).
  - Dual currency is stacked right-aligned in tabular monospace: **`¥ RMB` primary (`14px–15px font-semibold`)** on top, **`₮ MNT` secondary (`12px --ink-muted`)** directly below.

---

## 4. Signature Structural Moves

1. **Master-Detail Split Workspace (No Full-Page Context Loss):**
   - Clicking a tender row in the main directory opens a live **Dossier Inspector Split Pane / Drawer** (`42%–48%` width on desktop) anchored beside the table. Users scan key facts, PDF eligibility clauses, BOQ equipment lists, and run quick AI questions without losing scroll position or filter state.
2. **Custom Tactile Filter Popovers & Segmented Controls:**
   - Native browser `<select>` elements are replaced across primary workspaces with clean tactile pill triggers displaying active values and counts, custom dropdown popovers, dismissible chips, and keyboard-first `⌘K` omnibar navigation.
3. **50/50 Executive Dossier + Pinned AI & PDF Evidence Copilot (`/tender/[id]`):**
   - **Left (`~55%`):** Porcelain executive dossier housing the Hero Summary, integrated 4-cell **Key Facts** matrix, Foreign Eligibility & Financial Threshold Scorecard, Interactive **BOQ Unit Pricer**, and Historical Award Ledger.
   - **Right (`~45%`, sticky viewport dock):** Obsidian or high-contrast **Document & AI Copilot** pairing verified source PDF page excerpts (`[P.12]`, `[P.27]`) with multi-turn AI Q&A and 1-click prompt chips.

---

## 5. Micro-Interactions, Browser Surfaces & Craft Floor Rules

Following `.agents/skills/impeccable/reference/craft-floor.md`:
- **Motion:** Single purposeful feedback transitions (`120ms–180ms`, `ease-out`); animate `transform` and `opacity` only; respect `prefers-reduced-motion`. Zero decorative floating glows or perpetual pulse animations.
- **Browser Surfaces:** Custom-styled thin scrollbars matching `--border-hairline`, branded `selection:` highlight using `--accent-primary`, and consistent `focus-visible:ring-2` outlines in `--accent-primary`.
- **Hard Bans:**
  - **NO kicker / eyebrow labels** (`text-[11px] uppercase tracking-[0.18em]`) stacked above headings. Headings carry their own hierarchy.
  - **NO cards-inside-cards-inside-cards:** Group data with `border-t`, `divide-y`, hairline grid seams, and intentional whitespace instead of nested rounded boxes.
  - **NO AI-slop purple neon gradients or blurry shadows (`0 0 30px`)** around panels.
  - **NO generic icon-in-colored-circle spam** next to every label.
  - **NO invented placeholder numbers:** Every count, RMB/MNT amount, page number, and eligibility flag reflects real backend/PDF extraction state.
