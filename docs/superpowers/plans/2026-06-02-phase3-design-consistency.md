# Phase 3 — Design Consistency

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page — association and cooperative — looks like it belongs to the same product. Consistent colors, cards, typography, and RTL layout throughout all 62 pages.

**Architecture:** (1) CSS custom properties for semantic color tokens, (2) shared `<Card>` component replacing scattered inline div styles, (3) typography + RTL audit on page headers and tables.

**Tech Stack:** Tailwind CSS (existing) + CSS custom properties. No new npm packages.

---

## File Map

| File | Purpose |
|------|---------|
| `frontend/src/index.css` | Add CSS custom property color tokens (`:root` block) |
| `frontend/tailwind.config.js` | Extend theme to consume CSS variables |
| `frontend/src/components/ui/Card.tsx` | Shared card component with size variants |
| All main pages | Replace ad-hoc `<div className="bg-white rounded-xl shadow...">` with `<Card>` |

---

## Task 1 — Color tokens

**Files:**
- Modify: `mar-eac/frontend/src/index.css`
- Modify: `mar-eac/frontend/tailwind.config.js`

- [ ] **Step 1: Read index.css to find the :root block**

Read `mar-eac/frontend/src/index.css`. Find any existing `:root { }` block.

- [ ] **Step 2: Add semantic color tokens to :root**

Inside the existing `:root` block (or add one if it doesn't exist), add:

```css
:root {
  --color-primary-50:  214 100% 97%;
  --color-primary-100: 214 95%  92%;
  --color-primary-600: 215 100% 47%;
  --color-primary-700: 215 100% 40%;
  --color-primary-900: 215 100% 20%;

  --color-success-50:  142 72% 95%;
  --color-success-600: 142 76% 36%;

  --color-danger-50:     0 86% 97%;
  --color-danger-600:    0 84% 60%;

  --color-warning-50:   45 100% 96%;
  --color-warning-600:  38 92%  50%;

  --color-neutral-50:  220 14% 96%;
  --color-neutral-100: 220 13% 91%;
  --color-neutral-900: 222 47%  11%;
}

.dark {
  --color-primary-50:  215 100% 15%;
  --color-primary-600: 215 100% 60%;
}
```

- [ ] **Step 3: Read tailwind.config.js**

Read `mar-eac/frontend/tailwind.config.js` to see the current `theme.extend` block.

- [ ] **Step 4: Add CSS variable references to tailwind.config.js**

Inside `theme.extend.colors`, add (keep all existing colors — only add these):

```javascript
theme: {
  extend: {
    colors: {
      // existing colors ...
      token: {
        'primary-50':  'hsl(var(--color-primary-50))',
        'primary-600': 'hsl(var(--color-primary-600))',
        'primary-700': 'hsl(var(--color-primary-700))',
        'success-50':  'hsl(var(--color-success-50))',
        'success-600': 'hsl(var(--color-success-600))',
        'danger-50':   'hsl(var(--color-danger-50))',
        'danger-600':  'hsl(var(--color-danger-600))',
        'warning-50':  'hsl(var(--color-warning-50))',
        'warning-600': 'hsl(var(--color-warning-600))',
      },
    },
  },
},
```

These are now available as `bg-token-primary-600`, `text-token-danger-600`, etc.

Note: Do NOT remove existing color definitions — only add the `token` namespace. Existing pages use the existing colors.

- [ ] **Step 5: Verify build**

```bash
cd mar-eac/frontend && npx vite build --mode development 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` with no CSS errors.

- [ ] **Step 6: Commit**

```bash
git add mar-eac/frontend/src/index.css mar-eac/frontend/tailwind.config.js
git commit -m "feat(design): add semantic color tokens via CSS custom properties"
```

---

## Task 2 — Shared Card component

**Files:**
- Create: `mar-eac/frontend/src/components/ui/Card.tsx`

- [ ] **Step 1: Check if Card.tsx already exists**

```bash
ls mar-eac/frontend/src/components/ui/
```

If `Card.tsx` already exists, read it first and extend it. Otherwise create from scratch.

- [ ] **Step 2: Create (or replace) Card.tsx**

```tsx
// mar-eac/frontend/src/components/ui/Card.tsx
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  flat?: boolean;
  onClick?: () => void;
}

const PADDING: Record<NonNullable<CardProps['size']>, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  size = 'md',
  flat = false,
  onClick,
}) => {
  const base =
    'bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700';
  const shadow = flat ? '' : 'shadow-sm';
  const padding = PADDING[size];
  const interactive = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : '';

  return (
    <div
      className={`${base} ${shadow} ${padding} ${interactive} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd mar-eac/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add mar-eac/frontend/src/components/ui/Card.tsx
git commit -m "feat(design): add shared Card component with size and flat variants"
```

---

## Task 3 — Replace inline card divs on main pages

**Files:**
- Modify: main pages that have inline card divs

- [ ] **Step 1: Find inline card patterns**

```bash
grep -rn 'bg-white.*rounded-xl\|rounded-xl.*bg-white\|rounded-2xl.*bg-white' \
  mar-eac/frontend/src/pages/ --include="*.tsx" | head -30
```

This shows files with inline card styling.

- [ ] **Step 2: For each file, replace the most common card pattern**

The typical pattern to find and replace:

```tsx
// Old — ad-hoc card
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
  {content}
</div>

// New — shared Card
import { Card } from '../../components/ui/Card';

<Card>
  {content}
</Card>
```

Prioritize replacing in these pages (highest visibility):
1. `DashboardPage.tsx` — stat cards
2. `MembersPage.tsx` — member cards
3. `MeetingsPage.tsx` — meeting cards
4. `ProjectsPage.tsx` — project cards
5. `FinancePage.tsx` — transaction rows container

**Important:** Only replace cards where the class pattern exactly matches. Do NOT replace:
- Gradient header divs (they have custom colors)
- Modal containers (handled by Modal component)
- Dropdown containers

- [ ] **Step 3: TypeScript check**

```bash
cd mar-eac/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add mar-eac/frontend/src/pages/
git commit -m "feat(design): replace inline card divs with shared Card component"
```

---

## Task 4 — Typography standardization

**Files:**
- Modify: pages with inconsistent heading sizes

- [ ] **Step 1: Audit page title inconsistencies**

```bash
grep -rn 'text-3xl\|text-4xl\|text-xl font-bold\|text-2xl font-bold' \
  mar-eac/frontend/src/pages/ --include="*.tsx" | grep -v "gradient\|cover" | head -30
```

- [ ] **Step 2: Apply the standard page heading pattern**

Every main page section header should follow this pattern:
- Page section header (inside gradient banner): `text-2xl font-bold text-white`  
- Section titles within page (card headers): `text-base font-semibold text-gray-900 dark:text-white`
- Table column headers: `text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`

Find any `text-3xl` or `text-4xl` on standard page titles (NOT landing page or cover) and change to `text-2xl`.

Find any `text-base font-bold` section titles and standardize to `text-base font-semibold`.

- [ ] **Step 3: Commit**

```bash
git add mar-eac/frontend/src/pages/
git commit -m "feat(design): standardize page typography — consistent heading sizes"
```

---

## Task 5 — RTL audit + Cooperative/Association parity

**Files:**
- Modify: coop pages with visual inconsistencies

- [ ] **Step 1: Compare gradient headers between assoc and coop pages**

Read the gradient header from `MembersPage.tsx` (association) and compare with `CoopPage.tsx` (cooperative). They should use the same pattern:

```tsx
// Standard gradient header (should be same for all main pages)
<div className="rounded-2xl bg-gradient-to-br from-[COLOR-1] via-[COLOR-2] to-[COLOR-3] p-5 shadow-lg">
  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
    <Icon size={24} />
    {title}
  </h2>
</div>
```

The color scheme should follow this allocation (no page should use a unique one-off color):
- Blue (`from-blue-600 to-blue-700`): Members, Meetings, Documents
- Green (`from-emerald-500 to-teal-600`): Finance, Projects
- Amber (`from-amber-500 to-orange-400`): Reminders
- Purple (`from-purple-600 to-indigo-600`): Reports, Analytics
- Teal (`from-teal-500 to-cyan-600`): Water, Cooperative pages
- Gray-blue (`from-slate-600 to-slate-700`): Settings, Activity

Fix any coop page that uses a unique color not in this list.

- [ ] **Step 2: Check RTL flex/grid layouts**

```bash
grep -rn 'flex-row\|space-x-' mar-eac/frontend/src/pages/ --include="*.tsx" | head -20
```

In RTL layouts, `space-x-4` may appear reversed. Replace with `gap-4` (direction-agnostic) where found.

- [ ] **Step 3: Verify build is clean**

```bash
cd mar-eac/frontend && npx vite build --mode development 2>&1 | tail -5
```

Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 4: Final commit + push**

```bash
git add mar-eac/frontend/src/pages/ mar-eac/frontend/src/components/
git commit -m "feat(design): RTL audit + coop/assoc visual parity — consistent product feel"
git push origin main
```
