---
name: web-design-guidelines
description: >-
  Audit and optimize UI layout, visual rhythm, component ergonomics, typography scales,
  touch targets, accessible contrast ratios, and responsive breakpoints.
  Use when reviewing, refining, or building robust web interfaces.
---

# 📐 Web Design Guidelines & UI Audit Skill

A practical, actionable reference to audit and refine user interfaces for visual hierarchy, layout consistency, and component ergonomics.

---

## 1. 8-Point Spatial Grid & Sizing System

* **Spacing Multiples:** Always use multiples of 4px and 8px for margins, padding, and gaps:
  * `gap-1` (4px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px), `gap-8` (32px).
* **Component Heights:** Standardize interactive heights:
  * Compact button / Input: `h-8` (32px) or `h-9` (36px).
  * Standard button / Form input: `h-10` (40px) or `h-11` (44px).
  * Touch Target Minimum: Ensure interactive area is at least 44x44px on mobile devices (`min-h-[44px] min-w-[44px]`).

---

## 2. Visual Hierarchy & Scannability

* **Primary vs Secondary vs Tertiary:**
  * **Primary Action:** 1 per section (Solid fill, e.g. `bg-blue-600 text-white hover:bg-blue-700 shadow-2xs`).
  * **Secondary Action:** Ghost or Bordered (e.g. `bg-white border border-slate-200 text-slate-700 hover:bg-slate-50`).
  * **Tertiary / Destructive Action:** Text-only or muted icon (e.g. `text-slate-400 hover:text-slate-600`, or `text-rose-600 hover:bg-rose-50`).
* **Z-Pattern / F-Pattern Layout:** Place key navigation and identity at top-left, global actions at top-right, primary filters in horizontal bars, and the densest content in the core viewport.

---

## 3. Data Tables & List Ergonomics

* **Alignment Standards:**
  * **Text / Names:** Always left-aligned (`text-left`).
  * **Numbers / Currencies / Quantities:** Always right-aligned (`text-right tabular-nums font-mono`).
  * **Status Badges / Action Icons:** Centered or neatly tucked to the right.
* **Row Hover & Active Feedback:** Add subtle row highlighting (`hover:bg-slate-50/80 transition-colors`).
* **Sticky Table Headers:** For long data lists, use `sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs` so column headers remain visible while scrolling.

---

## 4. Responsive Breakpoint Choreography

* **Mobile (<640px):**
  * Single column stack (`grid-cols-1`).
  * Hide low-priority metadata columns in tables or collapse to clean expandable card rows.
  * Bottom-fixed or drawer-based action bars (`AIChatDrawer`, filter sheets).
* **Tablet (640px - 1024px):**
  * 2-column grids (`sm:grid-cols-2`).
  * Horizontal scrollable filter pills with hidden scrollbars.
* **Desktop (>=1024px):**
  * Full multi-column data views (`lg:grid-cols-3` or `xl:grid-cols-4`).
  * Max-width containment (`max-w-[1600px] mx-auto`) to prevent extreme ultrawide distortion.

---

## 5. UI Audit Checklist

- [ ] Are all margins and paddings adhering to the 4px/8px grid scale?
- [ ] Are font sizes consistent and restrained across similar components?
- [ ] Are numeric values right-aligned with `tabular-nums`?
- [ ] Do all interactive elements have visible `:hover`, `:focus-visible`, and `:active` states?
- [ ] Is there zero layout shift (CLS) when data or images finish loading?
- [ ] Are error, loading, and empty states cleanly styled and informative?
