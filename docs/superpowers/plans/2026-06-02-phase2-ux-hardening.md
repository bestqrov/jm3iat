# Phase 2 — Frontend UX Hardening

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate blank screens, silent failures, and missing feedback across all 62 pages — every loading, empty, and error state is handled visibly and consistently.

**Architecture:** Four layers added in order: (1) global ErrorBoundary wrapping the whole app, (2) shared Skeleton components replacing boolean `if (loading) return null`, (3) centralized Toast replacing scattered `alert()` calls, (4) EmptyState audit ensuring all list pages show the shared component.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS (already installed). No new npm packages needed.

---

## File Map

| File | Purpose |
|------|---------|
| `frontend/src/components/ErrorBoundary.tsx` | Class component — catches React crashes, shows bilingual error page |
| `frontend/src/main.tsx` | Wrap `<App />` with `<ErrorBoundary>` |
| `frontend/src/components/ui/Skeleton.tsx` | Skeleton, SkeletonCard, SkeletonTable, SkeletonStats primitives |
| `frontend/src/contexts/ToastContext.tsx` | ToastProvider + Toaster UI component |
| `frontend/src/hooks/useToast.ts` | `useToast()` hook — returns `{ toast }` |
| `frontend/src/App.tsx` | Mount `<ToastProvider>` around router |
| 10 page files | Replace `if (loading) return <spinner>` with skeleton variants |
| Pages with `alert()` | Replace with `toast()` calls |

---

## Task 1 — Global ErrorBoundary

**Files:**
- Create: `mar-eac/frontend/src/components/ErrorBoundary.tsx`
- Modify: `mar-eac/frontend/src/main.tsx`

- [ ] **Step 1: Read main.tsx to see current structure**

Read `mar-eac/frontend/src/main.tsx` — note exactly what's inside `ReactDOM.createRoot(...).render(...)`.

- [ ] **Step 2: Create ErrorBoundary.tsx**

```tsx
// mar-eac/frontend/src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6"
        >
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">⚠️</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              حدث خطأ غير متوقع
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Une erreur inattendue s&apos;est produite
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              إعادة تحميل الصفحة / Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 3: Wrap App in ErrorBoundary in main.tsx**

Read `mar-eac/frontend/src/main.tsx` then add the import and wrapper. The render call should look like:

```tsx
import { ErrorBoundary } from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd mar-eac/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add mar-eac/frontend/src/components/ErrorBoundary.tsx mar-eac/frontend/src/main.tsx
git commit -m "feat(ux): add global ErrorBoundary — no more blank screen on crash"
```

---

## Task 2 — Skeleton components

**Files:**
- Create: `mar-eac/frontend/src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Create Skeleton.tsx**

```tsx
// mar-eac/frontend/src/components/ui/Skeleton.tsx
import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
  />
);

export const SkeletonCard: React.FC = () => (
  <div className="card p-4 space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-2">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} className="h-8 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonStats: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card p-4 space-y-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    ))}
  </div>
);

export const SkeletonList: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd mar-eac/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add mar-eac/frontend/src/components/ui/Skeleton.tsx
git commit -m "feat(ux): add Skeleton, SkeletonCard, SkeletonTable, SkeletonStats components"
```

---

## Task 3 — Apply skeletons on 10 priority pages

**Files:**
- Modify: `mar-eac/frontend/src/pages/dashboard/DashboardPage.tsx`
- Modify: `mar-eac/frontend/src/pages/members/MembersPage.tsx`
- Modify: `mar-eac/frontend/src/pages/finance/FinancePage.tsx`
- Modify: `mar-eac/frontend/src/pages/meetings/MeetingsPage.tsx`
- Modify: `mar-eac/frontend/src/pages/projects/ProjectsPage.tsx`
- Modify: `mar-eac/frontend/src/pages/water/WaterPage.tsx`
- Modify: `mar-eac/frontend/src/pages/reports/ReportsPage.tsx`
- Modify: `mar-eac/frontend/src/pages/reminders/RemindersPage.tsx`
- Modify: `mar-eac/frontend/src/pages/coop/CoopPage.tsx`
- Modify: `mar-eac/frontend/src/pages/settings/SettingsPage.tsx`

**The pattern to apply in each page:**

For pages with stats cards (Dashboard, Finance, Members):

Find the `if (loading)` block and replace `return null` / `return <spinner>` with:

```tsx
import { SkeletonStats, SkeletonTable } from '../../components/ui/Skeleton';

// Before (old):
if (loading) return <div className="flex justify-center py-12"><div className="spinner" /></div>;

// After (new):
if (loading) return (
  <div className="space-y-6">
    <SkeletonStats count={4} />
    <SkeletonTable rows={5} cols={4} />
  </div>
);
```

For pages with card lists (Meetings, Projects, Reminders):

```tsx
import { SkeletonList } from '../../components/ui/Skeleton';

if (loading) return <SkeletonList rows={4} />;
```

For pages with forms/settings:

```tsx
import { Skeleton } from '../../components/ui/Skeleton';

if (loading) return (
  <div className="space-y-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="space-y-1">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
  </div>
);
```

- [ ] **Step 1: Apply skeleton to DashboardPage.tsx**

Read the file, find the `loading` guard, replace with `<SkeletonStats count={4} />`.

- [ ] **Step 2: Apply skeleton to MembersPage.tsx**

Read the file, find the `loading` guard, replace with `<SkeletonStats count={3} />` + `<SkeletonTable rows={5} cols={5} />`.

- [ ] **Step 3: Apply skeleton to FinancePage.tsx**

Replace loading guard with `<SkeletonStats count={3} />` + `<SkeletonTable rows={6} cols={4} />`.

- [ ] **Step 4: Apply skeleton to MeetingsPage.tsx, ProjectsPage.tsx, RemindersPage.tsx**

For each: replace loading guard with `<SkeletonList rows={4} />`.

- [ ] **Step 5: Apply skeleton to WaterPage.tsx, ReportsPage.tsx, CoopPage.tsx**

For WaterPage + CoopPage: `<SkeletonStats count={3} />` + `<SkeletonList rows={3} />`.
For ReportsPage: `<SkeletonList rows={4} />`.

- [ ] **Step 6: Apply skeleton to SettingsPage.tsx**

Use the form skeleton (6 field placeholders).

- [ ] **Step 7: TypeScript check**

```bash
cd mar-eac/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add mar-eac/frontend/src/pages/
git commit -m "feat(ux): replace loading spinners with skeleton screens on 10 pages"
```

---

## Task 4 — Centralized Toast system

**Files:**
- Create: `mar-eac/frontend/src/contexts/ToastContext.tsx`
- Create: `mar-eac/frontend/src/hooks/useToast.ts`
- Modify: `mar-eac/frontend/src/App.tsx`

- [ ] **Step 1: Create ToastContext.tsx**

```tsx
// mar-eac/frontend/src/contexts/ToastContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (opts: { type: ToastType; message: string }) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-green-500 flex-shrink-0" />,
  error:   <XCircle    size={18} className="text-red-500 flex-shrink-0" />,
  warning: <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />,
  info:    <Info       size={18} className="text-blue-500 flex-shrink-0" />,
};

const BG: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  error:   'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  info:    'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
};

const Toaster: React.FC<{ toasts: ToastItem[]; remove: (id: string) => void }> = ({ toasts, remove }) => (
  <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 max-w-sm w-full" dir="rtl">
    {toasts.map(t => (
      <div
        key={t.id}
        className={`flex items-start gap-3 p-3 rounded-xl border shadow-lg text-sm transition-all ${BG[t.type]}`}
      >
        {ICONS[t.type]}
        <span className="flex-1 text-gray-800 dark:text-gray-200">{t.message}</span>
        <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X size={14} />
        </button>
      </div>
    ))}
  </div>
);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback(({ type, message }: { type: ToastType; message: string }) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster toasts={toasts} remove={remove} />
    </ToastContext.Provider>
  );
};
```

- [ ] **Step 2: Create useToast.ts**

```typescript
// mar-eac/frontend/src/hooks/useToast.ts
export { useToast } from '../contexts/ToastContext';
```

- [ ] **Step 3: Mount ToastProvider in App.tsx**

Read `mar-eac/frontend/src/App.tsx`. Find the outermost component (likely `<ThemeProvider>` or `<AuthProvider>`) and wrap the router content with `<ToastProvider>`:

```tsx
import { ToastProvider } from './contexts/ToastContext';

// Inside App return, wrap around <RouterProvider> or <Routes>:
<ToastProvider>
  <RouterProvider router={router} />
</ToastProvider>
```

- [ ] **Step 4: TypeScript check**

```bash
cd mar-eac/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Replace alert() calls with toast()**

Search for all `alert(` usages in frontend:

```bash
grep -rn "alert(" mar-eac/frontend/src/pages/ --include="*.tsx"
```

For each file found, replace:
```tsx
// Old
alert('تم الحفظ بنجاح');

// New (add import at top of file)
import { useToast } from '../../hooks/useToast';
const { toast } = useToast();
// ...
toast({ type: 'success', message: 'تم الحفظ بنجاح' });
```

- [ ] **Step 6: Commit**

```bash
git add mar-eac/frontend/src/contexts/ToastContext.tsx \
        mar-eac/frontend/src/hooks/useToast.ts \
        mar-eac/frontend/src/App.tsx \
        mar-eac/frontend/src/pages/
git commit -m "feat(ux): centralized Toast system — replace all alert() calls"
```

---

## Task 5 — Empty states audit

**Files:**
- Modify: any page missing proper EmptyState component

- [ ] **Step 1: Find pages without EmptyState**

```bash
grep -rL "EmptyState" mar-eac/frontend/src/pages/ --include="*.tsx"
```

This lists pages that do NOT import/use EmptyState.

- [ ] **Step 2: For each page in the list, check if it renders lists/tables**

For any page that renders a list without EmptyState, add the shared component. The pattern:

```tsx
import { EmptyState } from '../../components/ui/EmptyState';
import { FileText } from 'lucide-react'; // choose relevant icon

// Inside the render, where data list is empty:
{items.length === 0 ? (
  <EmptyState
    icon={<FileText size={28} />}
    title={lang === 'ar' ? 'لا توجد عناصر' : 'Aucun élément'}
  />
) : (
  items.map(item => <ItemCard key={item.id} item={item} />)
)}
```

Priority pages to check (likely missing):
- `ActivityPage.tsx` — activity logs list
- `CalendarPage.tsx` — events list
- `AssetsPage.tsx` — assets list
- `RecurringPage.tsx` — recurring payments list
- `CommercePage.tsx` — uses inline EmptyState function instead of shared component

For CommercePage: find the inline `const EmptyState = ...` function definition and delete it, then import from `'../../components/ui/EmptyState'`.

- [ ] **Step 3: TypeScript check**

```bash
cd mar-eac/frontend && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add mar-eac/frontend/src/pages/
git commit -m "feat(ux): standardize EmptyState across all list pages"
git push origin main
```
