---
name: taste-design
description: >-
  Enforce world-class aesthetic taste, intentional art direction, and tactile design engineering.
  Eliminate generic AI slop (blurry neon purple gradients, floating cards, cookie-cutter templates)
  and create distinctive, purposeful, and polished digital interfaces.
---

# 🎨 Taste Design Skill (Design Direction & Aesthetic Excellence)

This skill provides design direction principles to create distinctive, thoughtful, and authentic web interfaces while eliminating generic AI-generated aesthetics.

---

## 1. The Anti-Slop Manifesto (What to NEVER do)

❌ **Banned AI Tropes:**
* **Purple/Cyan Neon Gradients:** Do not use `bg-gradient-to-r from-purple-600 to-indigo-600` for every header, card, or button.
* **Blurry Glassmorphism Everywhere:** Stop putting `backdrop-blur-md bg-white/10 border-white/20` on every single surface where solid, crisp background colors belong.
* **Floating Empty Cards:** Avoid surrounding every tiny piece of text in a padded, floating, shadow-heavy card with no visual grounding.
* **Pointless Glowing Rings:** Do not add `shadow-[0_0_50px_rgba(59,130,246,0.5)]` or decorative neon blobs in the background that distract from real content.
* **Generic SaaS Hero Sections:** Avoid centered title + purple badge + 2 generic buttons + floating mockup dashboard unless it directly serves the product's identity.

---

## 2. Core Aesthetic Pillars

### A. Intentional Brand & Personality
* **Grounding:** Choose a clear aesthetic archetype (e.g. *Tactical Intelligence*, *Editorial Swiss*, *Minimalist Utility*, *Bloomberg Terminal density*).
* **Color Discipline:** 1 dominant anchor color (e.g. Deep Slate `#0f172a`, Crisp Navy `#1e3a8a`, Warm Stone), 1 purposeful accent color (e.g. Amber `#d97706` for procurement alerts, Emerald `#059669` for verified statuses), and neutral slate scales for typography.
* **Contrast Hierarchy:** Never compromise text readability for "cool vibes". High contrast ratios (WCAG AAA for body text, AA for secondary text).

### B. Typography & Spatial Rhythm
* **Font Pairing:** Clean sans-serif for UI (Inter, Geist, Plus Jakarta Sans, SF Pro) with tabular numbers (`tabular-nums font-mono`) for budgets, dates, codes, and metrics.
* **Type Scale:** Restrain font sizes. Use 4-5 core sizes (`text-xs: 12px`, `text-sm: 14px`, `text-base: 16px`, `text-lg: 18px`, `text-2xl: 24px`) rather than 10 random sizes.
* **Tight, Intentional Density:** In data-heavy applications (tenders, analytics, dashboards), prioritize information density and scannability over vast wasted whitespace.

### C. Tactile Elevation & Micro-Details
* **Crisp Borders over Blurry Shadows:** Prefer subtle `1px border border-slate-200` with micro-shadows (`shadow-2xs` or `shadow-xs`) instead of heavy diffuse drop shadows (`shadow-2xl`).
* **Subtle States:** Hover, active, focus, and disabled states should feel physical: slight background tint shifts (`hover:bg-slate-50`, `active:scale-[0.99]`), crisp focus rings (`focus:ring-2 focus:ring-blue-600 focus:outline-none`).
* **Pill & Badge Discipline:** Keep badges compact (`px-2 py-0.5 text-[11px] font-semibold rounded-md`). Never let badges overpower the main title text.

---

## 3. Checklist for UI Reviews

1. [ ] Does this interface look like a human designer with taste crafted it, rather than an AI generating random purple Tailwind classes?
2. [ ] Is the primary action visually unambiguous?
3. [ ] Are data values formatted cleanly (e.g., currency, timestamps, countdowns)?
4. [ ] Does the visual rhythm feel solid, structured, and pleasant to scan repeatedly?
