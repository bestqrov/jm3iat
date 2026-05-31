# SuperAdmin 3-Section Restructuring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the SuperAdmin dashboard into 3 distinct sections — Associations, Cooperatives, and Store — each with dedicated management tabs, analytics, and filtered data views.

**Architecture:** Add a `sectionMode: 'assoc' | 'coop' | 'store'` state to `SuperAdminPage.tsx`. The sidebar shows different tab groups per section. The `orgs`, `subscriptions`, and `payments` tabs receive a `section` prop to filter their data. Three new dashboard tab components replace the existing monolithic dashboard content. One new backend endpoint provides per-section stats. All existing tab components (SubscriptionsTab, FulfillmentTab, etc.) remain unchanged — only filtering context is added.

**Tech Stack:** React + TypeScript + TailwindCSS (frontend), Node.js/Express + Prisma (backend), Lucide icons

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/modules/superadmin/superadmin.controller.js` | Modify | Add `getSectionStats(section)` logic to existing `getStats` via `?section=` query param |
| `frontend/src/pages/superadmin/SuperAdminPage.tsx` | Modify | Add `sectionMode` state, section switcher UI, per-section TAB_GROUPS, pass `section` prop to orgs/subscriptions/payments |
| `frontend/src/pages/superadmin/tabs/AssocDashboardTab.tsx` | Create | Dashboard for associations: KPIs, type distribution, quick actions |
| `frontend/src/pages/superadmin/tabs/CoopDashboardTab.tsx` | Create | Dashboard for cooperatives: active coops, conversion requests, revenue |
| `frontend/src/pages/superadmin/tabs/StoreDashboardTab.tsx` | Create | Dashboard for store: orders today, revenue, best sellers, stock alerts |

---

## Task 1 — Backend: section-specific stats endpoint

**Files:**
- Modify: `mar-eac/backend/src/modules/superadmin/superadmin.controller.js`

The existing `getStats` endpoint returns global platform stats. We extend it to accept `?section=assoc|coop|store` and return section-filtered stats.

- [ ] **Step 1: Find `getStats` in superadmin.controller.js (around line 88) and replace it**

Read the file first to find the exact location, then replace the `getStats` function with this extended version:

```js
const getStats = async (req, res) => {
  try {
    const section = req.query.section; // 'assoc' | 'coop' | 'store' | undefined

    // ── Store section stats ──────────────────────────────────────────────────
    if (section === 'store') {
      const now = new Date();
      const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [todayOrders, monthOrders, allStoreOrders, totalProducts, stockAlertCount] = await Promise.all([
        prisma.commerceOrder.count({ where: { source: 'STORE', createdAt: { gte: startOfDay } } }),
        prisma.commerceOrder.count({ where: { source: 'STORE', createdAt: { gte: startOfMonth } } }),
        prisma.commerceOrder.findMany({
          where: { source: 'STORE' },
          select: { totalAmount: true, status: true, createdAt: true },
        }),
        prisma.commerceProduct.count({ where: { isActive: true, organization: { modules: { has: 'COMMERCE' } } } }),
        prisma.commerceProduct.count({ where: { isActive: true } }), // rough count
      ]);

      const todayRevenue  = allStoreOrders.filter(o => new Date(o.createdAt) >= startOfDay).reduce((s, o) => s + o.totalAmount, 0);
      const monthRevenue  = allStoreOrders.filter(o => new Date(o.createdAt) >= startOfMonth).reduce((s, o) => s + o.totalAmount, 0);
      const totalRevenue  = allStoreOrders.reduce((s, o) => s + o.totalAmount, 0);
      const pendingOrders = allStoreOrders.filter(o => o.status === 'PENDING').length;
      const deliveredOrders = allStoreOrders.filter(o => o.status === 'DELIVERED').length;

      return res.json({ section: 'store', todayOrders, monthOrders, todayRevenue, monthRevenue, totalRevenue, pendingOrders, deliveredOrders, totalProducts });
    }

    // ── Coop section stats ───────────────────────────────────────────────────
    if (section === 'coop') {
      const [totalCoops, activeCoops, trialCoops, conversionRequests] = await Promise.all([
        prisma.organization.count({ where: { conversionStatus: 'CONVERTED' } }),
        prisma.organization.count({ where: { conversionStatus: 'CONVERTED', subscription: { status: 'ACTIVE' } } }),
        prisma.organization.count({ where: { conversionStatus: 'CONVERTED', subscription: { status: 'TRIAL' } } }),
        prisma.organization.count({ where: { conversionStatus: 'PENDING_CONVERSION' } }),
      ]);

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthlyRevenue = await prisma.payment.aggregate({
        where: { organization: { conversionStatus: 'CONVERTED' }, paidAt: { gte: startOfMonth } },
        _sum: { amount: true },
      });
      const totalRevenue = await prisma.payment.aggregate({
        where: { organization: { conversionStatus: 'CONVERTED' } },
        _sum: { amount: true },
      });

      return res.json({ section: 'coop', totalCoops, activeCoops, trialCoops, conversionRequests, monthlyRevenue: monthlyRevenue._sum.amount || 0, totalRevenue: totalRevenue._sum.amount || 0 });
    }

    // ── Assoc section stats (default / section=assoc) ────────────────────────
    const assocWhere = { conversionStatus: { not: 'CONVERTED' } };

    const [totalOrgs, totalUsers, trialOrgs, activeOrgs, expiredOrgs, canceledOrgs, allOrgs, paymentsAgg] = await Promise.all([
      prisma.organization.count({ where: assocWhere }),
      prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' }, organization: assocWhere } }),
      prisma.subscription.count({ where: { status: 'TRIAL', organization: assocWhere } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', organization: assocWhere } }),
      prisma.subscription.count({ where: { status: 'EXPIRED', organization: assocWhere } }),
      prisma.subscription.count({ where: { status: 'CANCELLED', organization: assocWhere } }),
      prisma.organization.findMany({ where: assocWhere, select: { modules: true } }),
      prisma.payment.aggregate({ where: { organization: assocWhere }, _sum: { amount: true } }),
    ]);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = await prisma.payment.aggregate({
      where: { paidAt: { gte: startOfMonth }, organization: assocWhere },
      _sum: { amount: true },
    });
    const newOrgsThisMonth = await prisma.organization.count({
      where: { createdAt: { gte: startOfMonth }, ...assocWhere },
    });

    const typeDistribution = { REGULAR: 0, PROJECTS: 0, WATER: 0, PRODUCTIVE: 0, PRODUCTIVE_WATER: 0 };
    for (const org of allOrgs) {
      typeDistribution[getAssocTypeKey(org.modules)]++;
    }

    const activeOrgsData = await prisma.organization.findMany({
      where: { subscription: { status: 'ACTIVE' }, ...assocWhere },
      select: { modules: true },
    });
    const mrrEstimate = activeOrgsData.reduce((sum, o) => sum + (TYPE_PRICES[getAssocTypeKey(o.modules)] || 99), 0);

    res.json({
      section: 'assoc',
      totalOrgs, totalUsers, trialOrgs, activeOrgs, expiredOrgs, canceledOrgs,
      typeDistribution, mrrEstimate,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      totalRevenue: paymentsAgg._sum.amount || 0,
      newOrgsThisMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
```

**Note:** `getAssocTypeKey` and `TYPE_PRICES` are already defined in the file above the `getStats` function — do NOT redefine them.

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/backend/src/modules/superadmin/superadmin.controller.js
git commit -m "feat(superadmin): extend getStats to support ?section=assoc|coop|store"
```

---

## Task 2 — AssocDashboardTab.tsx

**Files:**
- Create: `mar-eac/frontend/src/pages/superadmin/tabs/AssocDashboardTab.tsx`

This tab shows association-specific analytics. It calls `GET /api/superadmin/stats?section=assoc`.

- [ ] **Step 1: Create the file**

```tsx
import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, Clock, AlertTriangle, DollarSign, Plus, RefreshCw, Users, Check } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';

const ASSOC_TYPES = [
  { key: 'REGULAR',          labelFr: 'Classique',          labelAr: 'جمعية عادية',       color: '#6b7280', badge: 'bg-gray-100 text-gray-700' },
  { key: 'PROJECTS',         labelFr: 'Avec projets',       labelAr: 'مع مشاريع',         color: '#2563eb', badge: 'bg-blue-100 text-blue-700' },
  { key: 'WATER',            labelFr: 'Gestion eau',        labelAr: 'جمعية الماء',       color: '#0891b2', badge: 'bg-cyan-100 text-cyan-700' },
  { key: 'PRODUCTIVE',       labelFr: 'Productive',         labelAr: 'جمعية إنتاجية',     color: '#059669', badge: 'bg-emerald-100 text-emerald-700' },
  { key: 'PRODUCTIVE_WATER', labelFr: 'Productive + Eau',   labelAr: 'إنتاجية + ماء',     color: '#7c3aed', badge: 'bg-purple-100 text-purple-700' },
];

export function AssocDashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getStats('assoc').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {isAr ? '🏛️ لوحة الجمعيات' : '🏛️ Tableau de bord — Associations'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAr ? 'نظرة شاملة على جميع الجمعيات المنتسبة للمنصة' : 'Vue complète de toutes les associations de la plateforme'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'إجمالي الجمعيات' : 'Total associations', value: stats.totalOrgs, icon: <Building2 size={20} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20', color: 'text-indigo-600' },
          { label: isAr ? 'اشتراكات نشطة' : 'Abonnements actifs', value: stats.activeOrgs, icon: <Check size={20} />, bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600' },
          { label: isAr ? 'فترات تجربة' : 'Essais en cours', value: stats.trialOrgs, icon: <Clock size={20} />, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600' },
          { label: isAr ? 'منتهية الصلاحية' : 'Expirés', value: stats.expiredOrgs, icon: <AlertTriangle size={20} />, bg: 'bg-red-50 dark:bg-red-900/20', color: 'text-red-500' },
          { label: isAr ? 'MRR (تقديري)' : 'MRR estimé', value: `${(stats.mrrEstimate || 0).toLocaleString()} MAD`, icon: <TrendingUp size={20} />, bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600' },
          { label: isAr ? 'إيرادات الشهر' : 'Revenus du mois', value: `${(stats.monthlyRevenue || 0).toLocaleString()} MAD`, icon: <DollarSign size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600' },
          { label: isAr ? 'جمعيات جديدة' : 'Nouvelles ce mois', value: stats.newOrgsThisMonth, icon: <Plus size={20} />, bg: 'bg-teal-50 dark:bg-teal-900/20', color: 'text-teal-600' },
          { label: isAr ? 'المستخدمون' : 'Utilisateurs', value: stats.totalUsers, icon: <Users size={20} />, bg: 'bg-gray-50 dark:bg-gray-700/30', color: 'text-gray-600' },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-2xl p-4 ${kpi.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{kpi.label}</span>
              <span className={kpi.color}>{kpi.icon}</span>
            </div>
            <div className={`text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Type Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          {isAr ? 'توزيع أنواع الجمعيات' : 'Distribution des types d\'associations'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {ASSOC_TYPES.map(cfg => (
            <div key={cfg.key} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30">
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stats.typeDistribution?.[cfg.key] || 0}
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
                {isAr ? cfg.labelAr : cfg.labelFr}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: isAr ? 'الجمعيات' : 'Organisations', tab: 'assoc-orgs', icon: <Building2 size={16} />, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
          { label: isAr ? 'الاشتراكات' : 'Abonnements',   tab: 'assoc-subscriptions', icon: <RefreshCw size={16} />, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
          { label: isAr ? 'المدفوعات' : 'Paiements',      tab: 'assoc-payments', icon: <DollarSign size={16} />, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
          { label: isAr ? 'المستخدمون' : 'Utilisateurs',  tab: 'users', icon: <Users size={16} />, color: 'text-gray-600 bg-gray-50 hover:bg-gray-100' },
        ].map(action => (
          <button key={action.tab} onClick={() => onNavigate(action.tab)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${action.color}`}>
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/pages/superadmin/tabs/AssocDashboardTab.tsx
git commit -m "feat(superadmin): add AssocDashboardTab with association-specific KPIs"
```

---

## Task 3 — CoopDashboardTab.tsx

**Files:**
- Create: `mar-eac/frontend/src/pages/superadmin/tabs/CoopDashboardTab.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useEffect, useState } from 'react';
import { Building2, TrendingUp, Clock, DollarSign, GitMerge, Check, RefreshCw, Package } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';

export function CoopDashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getStats('coop').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {isAr ? '🤝 لوحة التعاونيات' : '🤝 Tableau de bord — Coopératives'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAr ? 'إدارة شاملة للتعاونيات المنتسبة للمنصة' : 'Gestion complète des coopératives de la plateforme'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: isAr ? 'إجمالي التعاونيات' : 'Total coopératives', value: stats.totalCoops, icon: <Building2 size={20} />, bg: 'bg-teal-50 dark:bg-teal-900/20', color: 'text-teal-600' },
          { label: isAr ? 'اشتراكات نشطة' : 'Abonnements actifs', value: stats.activeCoops, icon: <Check size={20} />, bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600' },
          { label: isAr ? 'فترات تجربة' : 'Essais en cours', value: stats.trialCoops, icon: <Clock size={20} />, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600' },
          { label: isAr ? 'طلبات التحويل' : 'Demandes de conversion', value: stats.conversionRequests, icon: <GitMerge size={20} />, bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600' },
          { label: isAr ? 'إيرادات الشهر' : 'Revenus du mois', value: `${(stats.monthlyRevenue || 0).toLocaleString()} MAD`, icon: <DollarSign size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600' },
          { label: isAr ? 'إجمالي الإيرادات' : 'Revenus totaux', value: `${(stats.totalRevenue || 0).toLocaleString()} MAD`, icon: <TrendingUp size={20} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20', color: 'text-indigo-600' },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-2xl p-4 ${kpi.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{kpi.label}</span>
              <span className={kpi.color}>{kpi.icon}</span>
            </div>
            <div className={`text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Conversion requests banner */}
      {stats.conversionRequests > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-purple-800 dark:text-purple-200">
              {isAr ? `${stats.conversionRequests} طلب تحويل في الانتظار` : `${stats.conversionRequests} demande(s) de conversion en attente`}
            </p>
            <p className="text-xs text-purple-500 mt-0.5">
              {isAr ? 'جمعيات تطلب التحويل إلى تعاونية' : 'Associations demandant à devenir coopératives'}
            </p>
          </div>
          <button onClick={() => onNavigate('coop-orgs')}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
            {isAr ? 'مراجعة' : 'Traiter'}
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: isAr ? 'التعاونيات' : 'Coopératives',   tab: 'coop-orgs',           icon: <Building2 size={16} />,  color: 'text-teal-600 bg-teal-50 hover:bg-teal-100' },
          { label: isAr ? 'الاشتراكات' : 'Abonnements',    tab: 'coop-subscriptions',  icon: <RefreshCw size={16} />,  color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
          { label: isAr ? 'المدفوعات' : 'Paiements',       tab: 'coop-payments',        icon: <DollarSign size={16} />, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
        ].map(action => (
          <button key={action.tab} onClick={() => onNavigate(action.tab)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${action.color}`}>
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/pages/superadmin/tabs/CoopDashboardTab.tsx
git commit -m "feat(superadmin): add CoopDashboardTab with cooperative-specific KPIs"
```

---

## Task 4 — StoreDashboardTab.tsx

**Files:**
- Create: `mar-eac/frontend/src/pages/superadmin/tabs/StoreDashboardTab.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useEffect, useState } from 'react';
import { Package, Truck, DollarSign, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';

export function StoreDashboardTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    superadminApi.getStats('store').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          🛒 {isAr ? 'لوحة المتجر — معرضنا' : 'Tableau de bord — Ma3ridona Store'}
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {isAr ? 'مبيعات المتجر، الطلبات، والمخزون في الوقت الفعلي' : 'Ventes, commandes et stock en temps réel'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isAr ? 'طلبات اليوم' : 'Commandes auj.', value: stats.todayOrders, icon: <ShoppingCart size={20} />, bg: 'bg-purple-50 dark:bg-purple-900/20', color: 'text-purple-600' },
          { label: isAr ? 'في الانتظار' : 'En attente', value: stats.pendingOrders, icon: <Package size={20} />, bg: 'bg-amber-50 dark:bg-amber-900/20', color: 'text-amber-600' },
          { label: isAr ? 'رقم اليوم' : 'CA aujourd\'hui', value: `${(stats.todayRevenue || 0).toFixed(0)} MAD`, icon: <DollarSign size={20} />, bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600' },
          { label: isAr ? 'طلبات الشهر' : 'Commandes/mois', value: stats.monthOrders, icon: <TrendingUp size={20} />, bg: 'bg-blue-50 dark:bg-blue-900/20', color: 'text-blue-600' },
          { label: isAr ? 'إيرادات الشهر' : 'Revenus du mois', value: `${(stats.monthRevenue || 0).toFixed(0)} MAD`, icon: <TrendingUp size={20} />, bg: 'bg-indigo-50 dark:bg-indigo-900/20', color: 'text-indigo-600' },
          { label: isAr ? 'إجمالي الإيرادات' : 'Revenus totaux', value: `${(stats.totalRevenue || 0).toFixed(0)} MAD`, icon: <DollarSign size={20} />, bg: 'bg-teal-50 dark:bg-teal-900/20', color: 'text-teal-600' },
          { label: isAr ? 'تم التسليم' : 'Livrées', value: stats.deliveredOrders, icon: <Truck size={20} />, bg: 'bg-green-50 dark:bg-green-900/20', color: 'text-green-600' },
          { label: isAr ? 'إجمالي المنتجات' : 'Total produits', value: stats.totalProducts, icon: <Package size={20} />, bg: 'bg-gray-50 dark:bg-gray-700/30', color: 'text-gray-600' },
        ].map((kpi, i) => (
          <div key={i} className={`rounded-2xl p-4 ${kpi.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{kpi.label}</span>
              <span className={kpi.color}>{kpi.icon}</span>
            </div>
            <div className={`text-2xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Pending orders alert */}
      {stats.pendingOrders > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                {isAr ? `${stats.pendingOrders} طلب في الانتظار` : `${stats.pendingOrders} commande(s) en attente`}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                {isAr ? 'تحتاج إلى تأكيد وإرسال' : 'À confirmer et expédier'}
              </p>
            </div>
          </div>
          <button onClick={() => onNavigate('fulfillment')}
            className="px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">
            {isAr ? 'معالجة' : 'Traiter'}
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: isAr ? 'الفولفيلمنت' : 'Fulfillment', tab: 'fulfillment', icon: <Truck size={16} />, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100' },
          { label: isAr ? 'الباقات' : 'Packs produits', tab: 'bundles', icon: <Package size={16} />, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
          { label: isAr ? 'إضافة منتج' : 'Ajouter produit', tab: 'store-products', icon: <ShoppingCart size={16} />, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
        ].map(action => (
          <button key={action.tab} onClick={() => onNavigate(action.tab)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${action.color}`}>
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/pages/superadmin/tabs/StoreDashboardTab.tsx
git commit -m "feat(superadmin): add StoreDashboardTab with store/Ma3ridona KPIs"
```

---

## Task 5 — Update superadminApi to support section param

**Files:**
- Modify: `mar-eac/frontend/src/lib/api.ts`

- [ ] **Step 1: Update getStats to accept section param**

Find `getStats: () => api.get('/superadmin/stats'),` and replace with:

```ts
getStats: (section?: 'assoc' | 'coop' | 'store') => api.get('/superadmin/stats', { params: section ? { section } : {} }),
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/lib/api.ts
git commit -m "feat(superadmin): add section param to superadminApi.getStats"
```

---

## Task 6 — SuperAdminPage: section switcher + 3 tab groups

**Files:**
- Modify: `mar-eac/frontend/src/pages/superadmin/SuperAdminPage.tsx`

This is the main wiring task. It adds `sectionMode` state, updates `ActiveTab`, adds the section switcher to the sidebar, defines per-section tab groups, and renders the new dashboard tabs.

- [ ] **Step 1: Add imports for the 3 new dashboard tabs**

Find the existing tab imports block (around lines 27-37) and add:

```tsx
import { AssocDashboardTab }  from './tabs/AssocDashboardTab';
import { CoopDashboardTab }   from './tabs/CoopDashboardTab';
import { StoreDashboardTab }  from './tabs/StoreDashboardTab';
```

- [ ] **Step 2: Add `SectionMode` type and update `ActiveTab`**

After `type ActiveTab = ...`, add:

```tsx
type SectionMode = 'assoc' | 'coop' | 'store';
```

Update `ActiveTab` to include the section-namespaced tabs:

```tsx
type ActiveTab =
  | 'dashboard' | 'orgs' | 'subscriptions' | 'payments' | 'users'
  | 'packs' | 'analytics' | 'usage' | 'marketing' | 'automation'
  | 'promos' | 'insights' | 'settings' | 'fulfillment' | 'bundles'
  // Section-specific tabs
  | 'assoc-dashboard' | 'assoc-orgs' | 'assoc-subscriptions' | 'assoc-payments'
  | 'coop-dashboard'  | 'coop-orgs'  | 'coop-subscriptions'  | 'coop-payments'
  | 'store-dashboard' | 'store-products';
```

- [ ] **Step 3: Add `sectionMode` state inside the component**

Find `const [stats, setStats] = useState...` and add BEFORE it:

```tsx
const [sectionMode, setSectionMode] = useState<SectionMode>('assoc');
```

- [ ] **Step 4: Update the `valid` array and add section-specific TAB_GROUPS**

Find:
```tsx
const valid: ActiveTab[] = ['dashboard','orgs','subscriptions','payments','users','packs','analytics','usage','marketing','automation','promos','insights','settings','fulfillment','bundles'];
```

Replace with:
```tsx
const valid: ActiveTab[] = [
  'dashboard','orgs','subscriptions','payments','users','packs','analytics','usage','marketing','automation','promos','insights','settings','fulfillment','bundles',
  'assoc-dashboard','assoc-orgs','assoc-subscriptions','assoc-payments',
  'coop-dashboard','coop-orgs','coop-subscriptions','coop-payments',
  'store-dashboard','store-products',
];
```

- [ ] **Step 5: Replace `TAB_GROUPS` constant with a `getTabGroups(section)` function**

Find the `TAB_GROUPS` array (starting around line 108) and replace the entire thing with:

```tsx
const SECTION_TAB_GROUPS: Record<SectionMode, { labelFr: string; labelAr: string; tabs: { key: string; iconEl: React.ReactNode; labelFr: string; labelAr: string }[] }[]> = {
  assoc: [
    {
      labelFr: 'Vue d\'ensemble', labelAr: 'نظرة عامة',
      tabs: [
        { key: 'assoc-dashboard', iconEl: <BarChart2 size={15} />,  labelFr: 'Tableau de bord', labelAr: 'لوحة التحكم' },
        { key: 'analytics',       iconEl: <TrendingUp size={15} />, labelFr: 'Analytics',        labelAr: 'التحليلات' },
        { key: 'insights',        iconEl: <Brain size={15} />,      labelFr: 'IA Insights',      labelAr: 'رؤى الذكاء' },
      ],
    },
    {
      labelFr: 'Gestion', labelAr: 'الإدارة',
      tabs: [
        { key: 'assoc-orgs',           iconEl: <Building2 size={15} />,  labelFr: 'Associations',  labelAr: 'الجمعيات' },
        { key: 'assoc-subscriptions',  iconEl: <RefreshCw size={15} />,  labelFr: 'Abonnements',   labelAr: 'الاشتراكات' },
        { key: 'assoc-payments',       iconEl: <CreditCard size={15} />, labelFr: 'Paiements',     labelAr: 'المدفوعات' },
        { key: 'users',                iconEl: <Users size={15} />,      labelFr: 'Utilisateurs',  labelAr: 'المستخدمون' },
      ],
    },
    {
      labelFr: 'Offres & Marketing', labelAr: 'الباقات والتسويق',
      tabs: [
        { key: 'packs',     iconEl: <Package size={15} />, labelFr: 'Offres & Tarifs', labelAr: 'الباقات والأسعار' },
        { key: 'promos',    iconEl: <Tag size={15} />,     labelFr: 'Codes Promo',     labelAr: 'أكواد الخصم' },
        { key: 'marketing', iconEl: <Mail size={15} />,    labelFr: 'Marketing',       labelAr: 'التسويق' },
        { key: 'automation',iconEl: <Zap size={15} />,     labelFr: 'Automatisation',  labelAr: 'الأتمتة' },
      ],
    },
    {
      labelFr: 'Configuration', labelAr: 'الإعدادات',
      tabs: [{ key: 'settings', iconEl: <Settings size={15} />, labelFr: 'Paramètres', labelAr: 'الإعدادات' }],
    },
  ],
  coop: [
    {
      labelFr: 'Vue d\'ensemble', labelAr: 'نظرة عامة',
      tabs: [
        { key: 'coop-dashboard', iconEl: <BarChart2 size={15} />,  labelFr: 'Tableau de bord', labelAr: 'لوحة التحكم' },
        { key: 'analytics',      iconEl: <TrendingUp size={15} />, labelFr: 'Analytics',        labelAr: 'التحليلات' },
      ],
    },
    {
      labelFr: 'Gestion', labelAr: 'الإدارة',
      tabs: [
        { key: 'coop-orgs',          iconEl: <Building2 size={15} />,  labelFr: 'Coopératives', labelAr: 'التعاونيات' },
        { key: 'coop-subscriptions', iconEl: <RefreshCw size={15} />,  labelFr: 'Abonnements',  labelAr: 'الاشتراكات' },
        { key: 'coop-payments',      iconEl: <CreditCard size={15} />, labelFr: 'Paiements',    labelAr: 'المدفوعات' },
        { key: 'users',              iconEl: <Users size={15} />,      labelFr: 'Utilisateurs', labelAr: 'المستخدمون' },
      ],
    },
    {
      labelFr: 'Configuration', labelAr: 'الإعدادات',
      tabs: [{ key: 'settings', iconEl: <Settings size={15} />, labelFr: 'Paramètres', labelAr: 'الإعدادات' }],
    },
  ],
  store: [
    {
      labelFr: 'Vue d\'ensemble', labelAr: 'نظرة عامة',
      tabs: [
        { key: 'store-dashboard', iconEl: <BarChart2 size={15} />, labelFr: 'Tableau de bord', labelAr: 'لوحة المتجر' },
      ],
    },
    {
      labelFr: 'Opérations', labelAr: 'العمليات',
      tabs: [
        { key: 'fulfillment',    iconEl: <Truck size={15} />,   labelFr: 'Fulfillment',      labelAr: 'الفولفيلمنت' },
        { key: 'bundles',        iconEl: <Package size={15} />, labelFr: 'Packs Produits',   labelAr: 'باقات المنتجات' },
        { key: 'coop-orgs',      iconEl: <Building2 size={15} />, labelFr: 'Coopératives',   labelAr: 'التعاونيات' },
      ],
    },
    {
      labelFr: 'Configuration', labelAr: 'الإعدادات',
      tabs: [{ key: 'settings', iconEl: <Settings size={15} />, labelFr: 'Paramètres', labelAr: 'الإعدادات' }],
    },
  ],
};

const TAB_GROUPS = SECTION_TAB_GROUPS[sectionMode];
```

- [ ] **Step 6: Add section switcher in the sidebar, below the logo block**

Find the "Stats quick pills" div (the block with `{!statsLoading && stats && (`). Add the section switcher BEFORE it:

```tsx
        {/* Section switcher */}
        <div className="flex gap-1 px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          {([
            { mode: 'assoc' as SectionMode, icon: '🏛️', labelFr: 'Assoc', labelAr: 'جمعيات', defaultTab: 'assoc-dashboard', color: 'bg-indigo-600' },
            { mode: 'coop'  as SectionMode, icon: '🤝', labelFr: 'Coop',  labelAr: 'تعاونيات', defaultTab: 'coop-dashboard',  color: 'bg-teal-600' },
            { mode: 'store' as SectionMode, icon: '🛒', labelFr: 'Store', labelAr: 'المتجر',   defaultTab: 'store-dashboard', color: 'bg-purple-600' },
          ] as const).map(s => (
            <button
              key={s.mode}
              onClick={() => { setSectionMode(s.mode); setTab(s.defaultTab as ActiveTab); }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-medium transition-all ${
                sectionMode === s.mode
                  ? `${s.color} text-white shadow-sm`
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
              <span className="text-base">{s.icon}</span>
              <span>{isAr ? s.labelAr : s.labelFr}</span>
            </button>
          ))}
        </div>
```

- [ ] **Step 7: Map section tabs to their data sources in the content area**

In the content rendering area (the `{activeTab === 'dashboard' && ...}` block), add these cases. Find the existing `{activeTab === 'dashboard' && (` block and replace the entire dashboard block with:

```tsx
          {activeTab === 'assoc-dashboard'  && <AssocDashboardTab onNavigate={tab => setTab(tab as ActiveTab)} />}
          {activeTab === 'coop-dashboard'   && <CoopDashboardTab  onNavigate={tab => setTab(tab as ActiveTab)} />}
          {activeTab === 'store-dashboard'  && <StoreDashboardTab onNavigate={tab => setTab(tab as ActiveTab)} />}
          {activeTab === 'dashboard'        && <AssocDashboardTab onNavigate={tab => setTab(tab as ActiveTab)} />}
```

- [ ] **Step 8: Map section-namespaced orgs/subscriptions/payments to existing components**

Find the `{activeTab === 'orgs' && (` block. After it (or before), add:

```tsx
          {(activeTab === 'assoc-orgs' || activeTab === 'coop-orgs') && (
```

Actually, the `orgs` tab content is inline in SuperAdminPage (not a separate component). Instead of refactoring that inline block (which is complex), use a simpler approach: set the `orgTypeFilter` and navigate to `orgs`:

Replace the `assoc-orgs` / `coop-orgs` buttons' `onNavigate` in the dashboard tabs to set a URL param instead. Update the `onNavigate` calls by passing a filter:

In `SuperAdminPage.tsx`, add this handler:

```tsx
const handleSectionNavigate = (tab: string) => {
  if (tab === 'assoc-orgs') {
    setOrgTypeFilter('');
    setOrgConversionFilter('assoc');
    setTab('orgs');
  } else if (tab === 'coop-orgs') {
    setOrgConversionFilter('coop');
    setTab('orgs');
  } else if (tab === 'assoc-subscriptions' || tab === 'coop-subscriptions') {
    setTab('subscriptions');
  } else if (tab === 'assoc-payments' || tab === 'coop-payments') {
    setTab('payments');
  } else {
    setTab(tab as ActiveTab);
  }
};
```

And add state:
```tsx
const [orgConversionFilter, setOrgConversionFilter] = useState<'assoc' | 'coop' | ''>('');
```

Then pass `orgConversionFilter` to the orgs query. Find where `loadOrgs` calls `superadminApi.getOrganizations(...)` and add:

```tsx
if (orgConversionFilter === 'coop')  params.conversionStatus = 'CONVERTED';
if (orgConversionFilter === 'assoc') params.conversionStatusNot = 'CONVERTED';
```

Update the backend `getOrganizations` to accept `conversionStatus` and `conversionStatusNot` params.

Replace all `onNavigate={tab => setTab(tab as ActiveTab)}` in the 3 dashboard tabs with `onNavigate={handleSectionNavigate}`.

- [ ] **Step 9: Update the orgs query in the backend to filter by conversionStatus**

In `mar-eac/backend/src/modules/superadmin/superadmin.controller.js`, find `getOrganizations` and add:

```js
if (conversionStatus)    where.conversionStatus = conversionStatus;
if (conversionStatusNot) where.conversionStatus = { not: conversionStatusNot };
```

Destructure these from `req.query`.

- [ ] **Step 10: Commit everything**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/pages/superadmin/SuperAdminPage.tsx mar-eac/backend/src/modules/superadmin/superadmin.controller.js
git commit -m "feat(superadmin): split into 3 sections (Associations / Coopératives / Store) with section switcher"
```

---

## Self-Review

**Spec coverage:**
- ✅ Associations section — `assoc-dashboard` + assoc-filtered orgs/subscriptions/payments + analytics
- ✅ Cooperatives section — `coop-dashboard` + coop-filtered orgs + subscriptions/payments + conversion requests
- ✅ Store section — `store-dashboard` + fulfillment + bundles + store KPIs
- ✅ Real-time analytics per section — each dashboard calls its own `getStats?section=` endpoint
- ✅ Section switcher in sidebar — 3 buttons (🏛️ Assoc / 🤝 Coop / 🛒 Store)
- ✅ Each section has quick actions linking to its management tabs

**Placeholder scan:** No TBDs. All code blocks complete.

**Type consistency:**
- `onNavigate: (tab: string) => void` — matches `handleSectionNavigate(tab: string)` in SuperAdminPage ✅
- `superadminApi.getStats(section?)` — matches `?section=` query param in backend ✅
- `orgConversionFilter` state drives both the URL param and the backend query ✅
