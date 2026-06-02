# SaaS Quality Initiative — Design Spec
**Date:** 2026-06-02  
**Project:** Mar E-A.C — Moroccan Associations & Cooperatives SaaS  
**Scope:** Integration Tests + UX Hardening + Design Consistency

---

## Context

The platform has 31 backend modules, 62 frontend pages, and zero automated tests. Users are non-tech-savvy leaders of Moroccan associations and cooperatives. Trust and smoothness are critical — a blank screen or a confusing error will cause churn. Design inconsistencies break the feeling of professionalism.

Three phases, executed sequentially:

---

## Phase 1 — Backend Integration Tests

### Goal
Cover the full organization lifecycle with automated API tests. Catch bugs before users do. Give confidence to ship UX changes without breaking the API contract.

### Stack
- **Jest** — test runner
- **Supertest** — HTTP assertions on the Express app
- **mongodb-memory-server** — in-memory MongoDB, no external DB needed, isolated per test run

### File Structure
```
mar-eac/backend/src/__tests__/
  setup.js              — spin up in-memory DB + Express app before all tests
  teardown.js           — drop DB, close connections after all tests
  helpers/
    factories.js        — createOrg(), createUser(), createMember() helpers
  auth.test.js          — registration, login, token expiry, 401/403 guards
  members.test.js       — CRUD, approve, renew, board members
  meetings.test.js      — create meeting, add attendees, add decisions
  finance.test.js       — transactions, categories, monthly summary
  projects.test.js      — CRUD, milestones, PROJECT_CREATE vs PROJECT_UPDATE logic
  reminders.test.js     — smart monthly logic (no water without meter, etc.)
  subscription.test.js  — plan gating, feature access per plan level
```

### Lifecycle Under Test (in order)
1. **Register** org → verify trial subscription created, 15-day expiry set
2. **Login** → JWT returned, invalid credentials → 401
3. **Auth guards** → protected route without token → 401, expired token → 401
4. **Plan gating** → BASIC org hits PREMIUM endpoint → 403
5. **Members** → create, list, update, approve, delete, renew
6. **Meetings** → create, add attendees, add decisions, list
7. **Finance** → create transaction, list with filters, monthly summary
8. **Projects** → create project, add milestone, update status, delete
9. **Reminders** → org with 0 projects gets PROJECT_CREATE not PROJECT_UPDATE; org with 0 water installations gets no WATER_READING; bureau expiry not sent to cooperative (conversionStatus=CONVERTED)
10. **Subscription** → upgrade plan, verify new features accessible, downgrade blocks premium features

### Key Test Assertions
- Every endpoint returns correct HTTP status codes (200, 201, 400, 401, 403, 404)
- Create operations return the created resource with correct fields
- Delete operations return 404 on subsequent GET
- Plan-gated endpoints return 403 for insufficient plans
- Cron logic (reminder smartness) verified via direct function call, not cron schedule

### Package additions (backend)
```json
"devDependencies": {
  "jest": "^29.7.0",
  "supertest": "^6.3.4",
  "mongodb-memory-server": "^9.1.6",
  "@types/jest": "^29.5.11"
}
```

```json
"scripts": {
  "test": "jest --runInBand --forceExit",
  "test:watch": "jest --watch --runInBand"
}
```

Jest config in `jest.config.js`:
```js
module.exports = {
  testEnvironment: 'node',
  globalSetup: './src/__tests__/setup.js',
  globalTeardown: './src/__tests__/teardown.js',
  testTimeout: 30000,
};
```

---

## Phase 2 — Frontend UX Hardening

### Goal
Eliminate all "blank screen" and "silent failure" scenarios. Non-tech users must always know what's happening — loading, empty, or error.

### 2a — Global React ErrorBoundary
**Problem:** No ErrorBoundary exists. A React crash shows a blank white screen with no explanation.  
**Solution:** Add `ErrorBoundary` class component wrapping `<App />` in main.tsx. Shows a friendly Arabic/French error page with a "reload" button.

**File:** `frontend/src/components/ErrorBoundary.tsx`

```
<ErrorBoundary>
  <App />        ← entire app is protected
</ErrorBoundary>
```

Error page shows:
- Icon + bilingual title: "حدث خطأ غير متوقع / Une erreur inattendue s'est produite"
- Reload button
- No technical details shown to user (logged to console only)

### 2b — Skeleton Loading Screens
**Problem:** Pages use `if (loading) return null` or a tiny spinner — users see blank content area while data loads.  
**Solution:** Shared `<Skeleton>` component + `<PageSkeleton>` variants for the 10 most-visited pages.

**Shared component:** `frontend/src/components/ui/Skeleton.tsx`
```tsx
<Skeleton className="h-4 w-3/4" />      // text line
<Skeleton className="h-32 w-full" />     // card block
```

**Pages getting skeletons (priority order):**
1. DashboardPage — stats cards + chart
2. MembersPage — table rows
3. FinancePage — transaction rows + summary cards
4. MeetingsPage — meeting cards
5. ProjectsPage — project cards
6. WaterPage — installation cards
7. ReportsPage — report list
8. RemindersPage — reminder cards
9. CoopPage — stats + table
10. SettingsPage — form fields

### 2c — Centralized Toast System
**Problem:** Some pages use `alert()`, some have inline error divs, some have nothing. No consistent feedback.  
**Solution:** Light `useToast` hook + `<Toaster>` component mounted once in App.tsx.

```tsx
const { toast } = useToast();
toast({ type: 'success', message: 'تم الحفظ بنجاح' });
toast({ type: 'error', message: 'حدث خطأ، حاول مرة أخرى' });
```

**File:** `frontend/src/components/ui/Toast.tsx` + `frontend/src/hooks/useToast.ts`

Replace all existing `alert()` calls and inline error divs with `toast()`.

### 2d — Empty States Audit
**Problem:** Some pages show blank space when data is empty, others show custom inline empty components (inconsistent).  
**Solution:** Audit all 62 pages, ensure every list/table uses the shared `<EmptyState>` component with:
- Relevant icon
- Bilingual title
- Action button where relevant (e.g., "أضف عضواً / Ajouter un membre")

Pages confirmed missing proper empty state (to be verified and fixed):
- ActivityPage
- CalendarPage
- AssetsPage
- RecurringPage
- CommercePage (uses inline function, replace with shared component)

---

## Phase 3 — Design Consistency

### Goal
Every page should feel like it belongs to the same product. No jarring color differences, inconsistent card styles, or mixed typography between association and cooperative views.

### 3a — Color Token Audit
**Problem:** Colors are scattered as Tailwind utilities with no central source of truth.  
**Solution:** Add CSS custom properties in `index.css` and use them via Tailwind config.

```css
:root {
  --color-primary:   210 100% 40%;   /* blue */
  --color-success:   142  76% 36%;   /* green */
  --color-danger:      0  84% 60%;   /* red */
  --color-warning:    45 100% 51%;   /* amber */
  --color-neutral:   220  14% 96%;   /* bg */
}
```

Audit all pages for hardcoded one-off colors (`text-blue-700`, `bg-indigo-600`, etc.) and replace with semantic tokens.

### 3b — Card Component Standard
**Problem:** Cards are styled inline per page — some have `rounded-xl`, some `rounded-2xl`, different shadows, different padding.  
**Solution:** Single `<Card>` component with consistent defaults.

**File:** `frontend/src/components/ui/Card.tsx`
```tsx
<Card>           // default: rounded-xl, shadow-sm, p-4
<Card size="lg"> // larger padding for dashboard stats
<Card flat>      // no shadow for nested cards
```

Audit and replace inline card divs across all main pages.

### 3c — RTL & Typography Consistency
**Problem:** Some pages have mixed Arabic/French text alignment issues, inconsistent heading sizes.  
**Solution:**
- All page titles: `text-2xl font-bold` (Arabic right-aligned)
- All section titles: `text-lg font-semibold`
- All table headers: `text-xs font-medium text-gray-500 uppercase`
- Ensure `dir="rtl"` is not broken by any flex/grid layout

### 3d — Cooperative vs Association Visual Parity
**Problem:** Coop pages (`/coop`) may have slightly different visual treatment than association pages.  
**Solution:** Audit color accents used in CoopPage, CoopProductionPage, CoopBoardPage, CoopProjectsPage against their association equivalents. All should use the same primary blue/green palette — no page-specific accent colors.

---

## Execution Order

```
Phase 1: Tests
  install jest + supertest + mongodb-memory-server
  setup.js + teardown.js + factories.js
  auth.test.js → members.test.js → meetings.test.js → finance.test.js
  projects.test.js → reminders.test.js → subscription.test.js
  npm test → all green

Phase 2: UX
  ErrorBoundary.tsx
  Skeleton.tsx + PageSkeleton variants
  Toast.tsx + useToast.ts
  Empty states audit + fixes

Phase 3: Design
  Color tokens in tailwind.config + index.css
  Card.tsx component
  RTL/typography audit
  Coop vs association parity
```

---

## Success Criteria

- `npm test` runs and all tests pass with no warnings
- No blank screens — every loading/empty/error state is handled
- Toast feedback on every create/update/delete action
- All 62 pages use consistent Card, EmptyState, and Skeleton components
- Coop and association pages are visually indistinguishable in quality
