---
name: awesome-design
description: >-
  Curated patterns, component architectures, and visual benchmarks from industry-leading design systems
  (Linear, Stripe, Raycast, Vercel, Apple, GitHub). Use when designing components, micro-interactions,
  command palettes, data density, and dark/light mode palettes.
---

# 🧩 Awesome Design (Design Systems & Component Patterns)

A reference library of battle-tested design system patterns, color architectures, and micro-interactions.

---

## 1. Industry Benchmarks & Aesthetics

* **Linear Aesthetic:** High-density, keyboard-driven navigation, monospace badges, crisp 1px borders, subtle gradient outlines, ultra-snappy micro-animations (<150ms).
* **Stripe Aesthetic:** Flawless typography hierarchy, rich contextual preview modals, crystal-clear documentation tabs, polished financial and tabular data layouts.
* **Raycast Aesthetic:** Compact command palette patterns (Cmd+K / Ctrl+K), keyboard shortcut hints (`⌘K`, `Esc`), high-contrast pill status indicators.

---

## 2. Reusable Component Patterns

### A. High-Density Data Card (Procurement & Finance)
```tsx
<div className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-4 shadow-2xs hover:shadow-xs transition-all">
  <div className="flex items-center justify-between gap-2 mb-2">
    <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
      {code}
    </span>
    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      {status}
    </span>
  </div>
  <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">{title}</h4>
  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
    <span className="text-slate-500 font-medium">{entity}</span>
    <span className="font-mono font-bold text-blue-700 tabular-nums">{budget}</span>
  </div>
</div>
```

### B. Command Bar & Quick Search Header
```tsx
<div className="relative flex items-center w-full max-w-md">
  <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
  <input
    type="text"
    placeholder="Хайх (Түлхүүр үг, код, захиалагч)..."
    className="w-full pl-9 pr-14 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-lg shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
  />
  <kbd className="absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-100 border border-slate-200 rounded">
    ⌘K
  </kbd>
</div>
```

### C. Collapsible Drawer / Modal Pattern
* **Backdrop:** `fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs transition-opacity`
* **Card Container:** `bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden`
* **Header / Footer:** Sticky or pinned with border dividers (`border-slate-200 bg-slate-50/80 px-5 py-3.5`).

---

## 3. Micro-Interaction Rules

* **Duration:** Keep transitions between **100ms - 200ms**. Anything over 300ms feels sluggish.
* **Easing:** Use `transition-all ease-out` or `transition-colors duration-150`.
* **Tactile Feedback:** Buttons should have subtle active states (`active:scale-[0.98]` or `active:bg-slate-100`).
