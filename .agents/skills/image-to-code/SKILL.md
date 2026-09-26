---
name: image-to-code
description: >-
  Systematic methodology to convert UI screenshots, Figma mockups, visual references,
  or wireframes into high-fidelity, pixel-accurate Next.js/React + Tailwind CSS components.
  Use when implementing interfaces based on visual designs or reference images.
---

# 🖼️ Image-to-Code Skill (Visual Reference to Clean React Code)

A systematic workflow to analyze reference designs/screenshots and transcribe them into clean, accessible, and responsive React + Tailwind components.

---

## 1. Visual Decomposition Process

When presented with an image or UI mockup, follow this 4-step decomposition:

```
┌──────────────────────────────────────────────────────────┐
│ Step 1: Macro Layout & Grid System                      │
│ - Identify container max-widths, split columns, headers  │
├──────────────────────────────────────────────────────────┤
│ Step 2: Spatial Hierarchy & Spacing Tokens              │
│ - Measure margins, paddings, gaps, and border radiuses   │
├──────────────────────────────────────────────────────────┤
│ Step 3: Typography & Color Extraction                   │
│ - Exact font weights, color hexes/Tailwind scales, alpha │
├──────────────────────────────────────────────────────────┤
│ Step 4: Interactive States & Dynamic Data Modeling      │
│ - Hover states, active tabs, pill filters, badge variants│
└──────────────────────────────────────────────────────────┘
```

---

## 2. Extraction Guidelines

### A. Layout & Positioning
* If elements are horizontally aligned with dynamic widths, use `flex items-center justify-between gap-X`.
* If elements are multi-column cards, use `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-X`.
* For pinned sidebars or filter bars, use `sticky top-X z-Y`.

### B. Color & Border Calibration
* **Neutral Backgrounds:** Match warm or cool grays (`bg-slate-50`, `bg-zinc-50`, `bg-gray-50`).
* **Borders:** Match subtle 1px divider lines (`border border-slate-200/80`).
* **Accent & State Colors:** Match brand blues, emerald success indicators, and amber alert badges.

### C. Typography & Text Truncation
* Long product or tender titles: Use `line-clamp-1` or `line-clamp-2` with `leading-snug` to prevent layout breaking.
* Identifiers & Codes: Use `font-mono text-[11px] font-bold tracking-tight`.

---

## 3. Code Generation Template

```tsx
'use client';

import React, { useState } from 'react';
import { LucideIconName } from 'lucide-react';

interface ComponentProps {
  // Define strict TypeScript interface matching visual data fields
}

export const VisualComponent: React.FC<ComponentProps> = ({ ...props }) => {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* 1. Header with title, badge, and quick actions */}
      
      {/* 2. Main content area (Grid / Table / Split View) */}
      
      {/* 3. Responsive controls & pagination */}
    </div>
  );
};
```
