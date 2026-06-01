# Org Performance Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ranked revenue leaderboard with auto-generated advice tags to each SuperAdmin dashboard tab (Assoc / Coop / Store) so the superadmin can see at a glance who performs well and who needs scaling support.

**Architecture:** One new backend endpoint `GET /api/superadmin/org-performance` computes per-org revenue for the current month, assigns advice tags using threshold rules, and returns a paginated ranked list plus a `needsAttention` array. A single reusable `OrgPerformanceLeaderboard` React component consumes this endpoint and is embedded at the bottom of the three existing dashboard tabs.

**Tech Stack:** Node.js/Express + Prisma/MongoDB (backend), React + TypeScript + TailwindCSS (frontend)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/modules/superadmin/superadmin.controller.js` | Modify | Add `getOrgPerformance` function |
| `backend/src/modules/superadmin/superadmin.routes.js` | Modify | Register `GET /org-performance` route |
| `frontend/src/lib/api.ts` | Modify | Add `getOrgPerformance` to `superadminApi` |
| `frontend/src/components/superadmin/OrgPerformanceLeaderboard.tsx` | Create | Ranked list UI with advice tags, search, pagination |
| `frontend/src/pages/superadmin/tabs/AssocDashboardTab.tsx` | Modify | Embed leaderboard at bottom |
| `frontend/src/pages/superadmin/tabs/CoopDashboardTab.tsx` | Modify | Embed leaderboard at bottom |
| `frontend/src/pages/superadmin/tabs/StoreDashboardTab.tsx` | Modify | Embed leaderboard at bottom |

---

## Task 1 — Backend: `getOrgPerformance` endpoint

**Files:**
- Modify: `mar-eac/backend/src/modules/superadmin/superadmin.controller.js`

Context: the controller already has `getStats`. Append `getOrgPerformance` before the `module.exports` line at the bottom. The existing `module.exports` line is the last line of the file — find it and extend it.

Key data facts you need:
- **Assoc** orgs: `{ conversionStatus: { not: 'CONVERTED' } }` — revenue from `Payment.amount` (paidAt this month)
- **Coop** orgs: `{ conversionStatus: 'CONVERTED' }` — same Payment query
- **Store** orgs: `{ modules: { has: 'COMMERCE' } }` — revenue from `CommerceOrder.totalAmount` (source=STORE, status≠CANCELLED, createdAt this month)

- [ ] **Step 1: Add `getOrgPerformance` to superadmin.controller.js**

Find the line `module.exports = { getStats,` at the bottom of `superadmin.controller.js`. Insert the following function BEFORE that line:

```js
// GET /api/superadmin/org-performance?section=assoc|coop|store&page=1&limit=20&search=
const getOrgPerformance = async (req, res) => {
  try {
    const { section = 'assoc', page = '1', limit = '20', search = '' } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const now           = new Date();
    const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const orgWhere =
      section === 'coop'  ? { conversionStatus: 'CONVERTED' } :
      section === 'store' ? { modules: { has: 'COMMERCE' }  } :
      /* assoc */           { conversionStatus: { not: 'CONVERTED' } };

    // Fetch all matching orgs
    let orgs = await prisma.organization.findMany({
      where: orgWhere,
      select: { id: true, name: true, nameAr: true, cityAr: true, phone: true },
    });

    // Optional search filter
    if (search) {
      const q = search.toLowerCase();
      orgs = orgs.filter(o =>
        o.name.toLowerCase().includes(q) ||
        (o.nameAr || '').includes(search) ||
        (o.cityAr || '').toLowerCase().includes(q)
      );
    }

    // Compute revenue per org
    const revenueMap = {}; // orgId → { monthRevenue, lastMonthRevenue }

    if (section === 'store') {
      const [thisMonth, lastMonth] = await Promise.all([
        prisma.commerceOrder.findMany({
          where: { source: 'STORE', status: { not: 'CANCELLED' }, createdAt: { gte: startOfMonth } },
          select: { organizationId: true, totalAmount: true },
        }),
        prisma.commerceOrder.findMany({
          where: { source: 'STORE', status: { not: 'CANCELLED' }, createdAt: { gte: startOfLastMonth, lt: startOfMonth } },
          select: { organizationId: true, totalAmount: true },
        }),
      ]);
      for (const o of thisMonth) {
        if (!revenueMap[o.organizationId]) revenueMap[o.organizationId] = { monthRevenue: 0, lastMonthRevenue: 0 };
        revenueMap[o.organizationId].monthRevenue += o.totalAmount;
      }
      for (const o of lastMonth) {
        if (!revenueMap[o.organizationId]) revenueMap[o.organizationId] = { monthRevenue: 0, lastMonthRevenue: 0 };
        revenueMap[o.organizationId].lastMonthRevenue += o.totalAmount;
      }
    } else {
      const [thisMonth, lastMonth] = await Promise.all([
        prisma.payment.findMany({
          where: { organization: orgWhere, paidAt: { gte: startOfMonth } },
          select: { organizationId: true, amount: true },
        }),
        prisma.payment.findMany({
          where: { organization: orgWhere, paidAt: { gte: startOfLastMonth, lt: startOfMonth } },
          select: { organizationId: true, amount: true },
        }),
      ]);
      for (const p of thisMonth) {
        if (!revenueMap[p.organizationId]) revenueMap[p.organizationId] = { monthRevenue: 0, lastMonthRevenue: 0 };
        revenueMap[p.organizationId].monthRevenue += p.amount;
      }
      for (const p of lastMonth) {
        if (!revenueMap[p.organizationId]) revenueMap[p.organizationId] = { monthRevenue: 0, lastMonthRevenue: 0 };
        revenueMap[p.organizationId].lastMonthRevenue += p.amount;
      }
    }

    // Compute thresholds
    const revenues   = orgs.map(o => revenueMap[o.id]?.monthRevenue || 0);
    const avg        = revenues.length > 0 ? revenues.reduce((s, v) => s + v, 0) / revenues.length : 0;
    const topRevenue = revenues.length > 0 ? Math.max(...revenues) : 0;

    const getAdvice = (monthRevenue, lastMonthRevenue) => {
      if (monthRevenue === 0)
        return { advice: 'zero', adviceLabel: '🚨 ما خدم والو' };
      if (avg > 0 && monthRevenue < avg * 0.2)
        return { advice: 'weak', adviceLabel: '⚠️ ضعيف' };
      if (lastMonthRevenue > 0 && monthRevenue < lastMonthRevenue * 0.5)
        return { advice: 'critical_drop', adviceLabel: '📉 انخفاض كبير' };
      if (topRevenue > 0 && monthRevenue >= topRevenue * 0.8)
        return { advice: 'top', adviceLabel: '🔥 Top' };
      return { advice: 'ok', adviceLabel: '✅ عادي' };
    };

    // Sort and rank
    const allSorted = orgs
      .map(o => {
        const rev = revenueMap[o.id] || { monthRevenue: 0, lastMonthRevenue: 0 };
        return { ...o, ...rev, ...getAdvice(rev.monthRevenue, rev.lastMonthRevenue) };
      })
      .sort((a, b) => b.monthRevenue - a.monthRevenue)
      .map((o, i) => ({ ...o, rank: i + 1 }));

    const needsAttention = allSorted.filter(o => o.advice === 'zero' || o.advice === 'critical_drop');
    const total  = allSorted.length;
    const paged  = allSorted.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ orgs: paged, total, needsAttention });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
```

- [ ] **Step 2: Add `getOrgPerformance` to `module.exports`**

Find the last line of `superadmin.controller.js`, which starts with `module.exports = {`. Add `getOrgPerformance` to it:

```js
module.exports = { getStats, getAnalytics, getFeatureUsage, getAIInsights,
  getOrganizations, getOrganizationDetail, updateSubscription, deleteOrganization,
  getSubscriptions, getPayments, getUsers, createUser, updateUser, deleteUser,
  getSettings, updateSettings, getPromos, createPromo, updatePromo, deletePromo,
  getDowngradeRequests, approveDowngrade, rejectDowngrade,
  getConversionRequests, approveConversion, rejectConversion,
  activateAsCoop, deactivateAsCoop,
  getOrgPerformance,
};
```

> Note: The exact list of existing exports may differ. Open the file, find the `module.exports` line, and append `, getOrgPerformance` before the closing `}`. Do not remove existing exports.

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/backend/src/modules/superadmin/superadmin.controller.js
git commit -m "feat(superadmin): add getOrgPerformance endpoint with auto-advice tags"
```

---

## Task 2 — Backend: Register the route

**Files:**
- Modify: `mar-eac/backend/src/modules/superadmin/superadmin.routes.js`

Context: All superadmin routes use `router.use(auth, requireRole('SUPER_ADMIN'))` already applied at the top. Just add one line.

- [ ] **Step 1: Add route**

Open `superadmin.routes.js`. Find any `router.get('/stats', ...)` line and add the new route right after it:

```js
router.get('/org-performance', ctrl.getOrgPerformance);
```

- [ ] **Step 2: Test the endpoint manually**

```bash
# Start backend
cd /Users/mac/Documents/jm3iat/mar-eac/backend && node src/server.js &

# Get a superadmin token first (login with superadmin credentials), then:
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3001/api/superadmin/org-performance?section=assoc&page=1&limit=5"
# Expected: { orgs: [...], total: N, needsAttention: [...] }

curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3001/api/superadmin/org-performance?section=store"
# Expected: { orgs: [...], total: N, needsAttention: [...] }

kill %1
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/backend/src/modules/superadmin/superadmin.routes.js
git commit -m "feat(superadmin): register GET /org-performance route"
```

---

## Task 3 — Frontend: API client

**Files:**
- Modify: `mar-eac/frontend/src/lib/api.ts`

Context: `superadminApi` is exported around line 276. It currently ends with several methods. Add one line.

- [ ] **Step 1: Add `getOrgPerformance` to `superadminApi`**

Open `frontend/src/lib/api.ts`. Find the `superadminApi` object. Add this line after `getStats`:

```ts
  getOrgPerformance: (section: string, page = 1, search = '') =>
    api.get('/superadmin/org-performance', { params: { section, page, limit: 20, search } }),
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/frontend/src/lib/api.ts
git commit -m "feat(superadmin): add getOrgPerformance to superadminApi client"
```

---

## Task 4 — Frontend: `OrgPerformanceLeaderboard` component

**Files:**
- Create: `mar-eac/frontend/src/components/superadmin/OrgPerformanceLeaderboard.tsx`

- [ ] **Step 1: Create the directory if needed**

```bash
mkdir -p /Users/mac/Documents/jm3iat/mar-eac/frontend/src/components/superadmin
```

- [ ] **Step 2: Create the component file**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { superadminApi } from '../../lib/api';

interface OrgPerf {
  id: string;
  name: string;
  nameAr?: string;
  cityAr?: string;
  phone?: string;
  monthRevenue: number;
  lastMonthRevenue: number;
  advice: 'top' | 'weak' | 'zero' | 'critical_drop' | 'ok';
  adviceLabel: string;
  rank: number;
}

interface LeaderboardData {
  orgs: OrgPerf[];
  total: number;
  needsAttention: OrgPerf[];
}

const ADVICE_STYLE: Record<string, string> = {
  top:           'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ok:            'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  weak:          'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  zero:          'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  critical_drop: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
};

function rankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return String(rank);
}

export function OrgPerformanceLeaderboard({ section }: { section: 'assoc' | 'coop' | 'store' }) {
  const [data, setData]       = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [query, setQuery]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await superadminApi.getOrgPerformance(section, page, query);
      setData(r.data);
    } finally {
      setLoading(false);
    }
  }, [section, page, query]);

  useEffect(() => { load(); }, [load]);

  const topRevenue = data?.orgs?.[0]?.monthRevenue || 1;

  const sectionLabel =
    section === 'store' ? 'أداء التعاونيات في المتجر' :
    section === 'coop'  ? 'أداء التعاونيات' :
    'أداء الجمعيات';

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
        📊 {sectionLabel}
      </h3>

      {/* Needs attention */}
      {(data?.needsAttention?.length ?? 0) > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-3">
            ⚠️ تحتاج تدخل ({data!.needsAttention.length})
          </p>
          <div className="space-y-2">
            {data!.needsAttention.map(org => (
              <div key={org.id}
                className="flex items-center justify-between gap-2 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 border border-red-100 dark:border-red-800">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{org.nameAr || org.name}</p>
                  {org.cityAr && <p className="text-xs text-gray-400">{org.cityAr}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0 ${ADVICE_STYLE[org.advice]}`}>
                  {org.adviceLabel}
                </span>
                {org.phone && (
                  <a href={`https://wa.me/${org.phone.replace(/\D/g, '')}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors flex-shrink-0">
                    تواصل
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { setQuery(search); setPage(1); } }}
          placeholder="ابحث بالاسم أو المدينة..."
          className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-purple-400"
        />
        <button
          onClick={() => { setQuery(search); setPage(1); }}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
          بحث
        </button>
      </div>

      {/* Ranked list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {data?.orgs.map(org => (
            <div key={org.id}
              className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-3 py-2.5 hover:border-purple-200 dark:hover:border-purple-700 transition-colors">
              <div className="w-8 text-center text-sm font-bold text-gray-500 flex-shrink-0">
                {rankEmoji(org.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {org.nameAr || org.name}
                </p>
                {org.cityAr && <p className="text-xs text-gray-400">{org.cityAr}</p>}
              </div>
              <div className="w-20 hidden sm:block flex-shrink-0">
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${topRevenue > 0 ? Math.round((org.monthRevenue / topRevenue) * 100) : 0}%` }} />
                </div>
              </div>
              <div className="text-sm font-extrabold text-gray-900 dark:text-white min-w-[80px] text-right flex-shrink-0">
                {org.monthRevenue.toLocaleString()} <span className="text-xs font-normal text-gray-400">د.م</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-lg font-semibold flex-shrink-0 ${ADVICE_STYLE[org.advice]}`}>
                {org.adviceLabel}
              </span>
            </div>
          ))}

          {data?.orgs.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">لا توجد نتائج</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > 20 && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
          <span>{data.total} إجمالي</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              السابق
            </button>
            <span className="px-3 py-1.5 bg-purple-600 text-white rounded-lg font-bold">{page}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * 20 >= data.total}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              التالي
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/frontend/src/components/superadmin/OrgPerformanceLeaderboard.tsx
git commit -m "feat(superadmin): add OrgPerformanceLeaderboard component"
```

---

## Task 5 — Frontend: Integrate into the 3 dashboard tabs

**Files:**
- Modify: `mar-eac/frontend/src/pages/superadmin/tabs/AssocDashboardTab.tsx`
- Modify: `mar-eac/frontend/src/pages/superadmin/tabs/CoopDashboardTab.tsx`
- Modify: `mar-eac/frontend/src/pages/superadmin/tabs/StoreDashboardTab.tsx`

### AssocDashboardTab.tsx

- [ ] **Step 1: Add import**

At the top of `AssocDashboardTab.tsx`, add after the existing imports:

```tsx
import { OrgPerformanceLeaderboard } from '../../../components/superadmin/OrgPerformanceLeaderboard';
```

- [ ] **Step 2: Add component at bottom of returned JSX**

Find the closing `</div>` of the outermost `<div className="space-y-6">` in `AssocDashboardTab.tsx` (it's right before the final `);` of the return). Add the leaderboard before that closing tag:

```tsx
      <OrgPerformanceLeaderboard section="assoc" />
```

### CoopDashboardTab.tsx

- [ ] **Step 3: Add import**

```tsx
import { OrgPerformanceLeaderboard } from '../../../components/superadmin/OrgPerformanceLeaderboard';
```

- [ ] **Step 4: Add component**

Same pattern — add before the closing `</div>` of the `<div className="space-y-6">`:

```tsx
      <OrgPerformanceLeaderboard section="coop" />
```

### StoreDashboardTab.tsx

- [ ] **Step 5: Add import**

```tsx
import { OrgPerformanceLeaderboard } from '../../../components/superadmin/OrgPerformanceLeaderboard';
```

- [ ] **Step 6: Add component**

```tsx
      <OrgPerformanceLeaderboard section="store" />
```

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/frontend/src/pages/superadmin/tabs/AssocDashboardTab.tsx \
        mar-eac/frontend/src/pages/superadmin/tabs/CoopDashboardTab.tsx \
        mar-eac/frontend/src/pages/superadmin/tabs/StoreDashboardTab.tsx
git commit -m "feat(superadmin): embed OrgPerformanceLeaderboard in all 3 dashboard tabs"
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ `GET /api/superadmin/org-performance?section=assoc|coop|store&page&limit&search`
- ✅ Revenue definition correct per section (Payment for assoc/coop, CommerceOrder for store)
- ✅ Auto-advice rules: zero → weak → critical_drop → top → ok, mutually exclusive top-to-bottom
- ✅ `needsAttention` array (zero + critical_drop orgs)
- ✅ Compact cards with rank emoji, name, city, progress bar, revenue, advice tag
- ✅ Search + pagination (20 per page)
- ✅ "تواصل" WhatsApp link uses `org.phone`
- ✅ Embedded in all 3 tabs

**Placeholder scan:** No TBDs, all code blocks complete.

**Type consistency:** `OrgPerf.advice` values match `ADVICE_STYLE` keys. `superadminApi.getOrgPerformance(section, page, query)` matches component usage.
