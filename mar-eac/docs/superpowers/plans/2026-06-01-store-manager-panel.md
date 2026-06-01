# Store Manager Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a dedicated WooCommerce-style `/store-admin` panel for a `STORE_MANAGER` employee to manage Ma3ridona store products, stock, orders, and bundles independently — with credentials issued by the SuperAdmin.

**Architecture:** New `STORE_MANAGER` string role added to the valid user roles. Backend: the `fulfillment` module (which already handles cross-org store data) is extended with product CRUD + stock movement endpoints, and its route protection is widened to accept `STORE_MANAGER` alongside `SUPER_ADMIN`. Same widening applied to bundle mutations in `store.routes.js`. Frontend: a single-page `StoreAdminPage` with a fixed sidebar and 6 tab components; accessed via `/store-admin`, protected by a `StoreAdminGuard` that checks for `STORE_MANAGER` or `SUPER_ADMIN` role.

**Tech Stack:** Node.js/Express + Prisma/MongoDB (backend), React + TypeScript + TailwindCSS + React Router v6 (frontend), existing `commerceApi` / `superadminApi` / `bundleApi` patterns.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/modules/fulfillment/fulfillment.controller.js` | Modify | Add `getProducts`, `createProduct`, `updateProduct`, `deleteProduct`, `toggleProduct`, `getStockMovements`, `addStockMovement`, `getCommerceOrgs` |
| `backend/src/modules/fulfillment/fulfillment.routes.js` | Modify | Widen role to `STORE_MANAGER`, register new routes |
| `backend/src/modules/store/store.routes.js` | Modify | Add `STORE_MANAGER` to bundle mutation routes |
| `frontend/src/contexts/AuthContext.tsx` | Modify | Add `STORE_MANAGER` to `UserRole` type, add `isStoreManager` flag |
| `frontend/src/lib/api.ts` | Modify | Add `storeManagerApi` (product/stock CRUD via fulfillment endpoints) |
| `frontend/src/App.tsx` | Modify | Add `StoreAdminGuard` component + `/store-admin` route |
| `frontend/src/pages/store-admin/StoreAdminPage.tsx` | Create | Main page: sidebar + tab switcher |
| `frontend/src/pages/store-admin/tabs/SAProductsTab.tsx` | Create | WooCommerce-style products table + slide-in edit panel |
| `frontend/src/pages/store-admin/tabs/SACategoriesTab.tsx` | Create | Read-only category list with product counts |
| `frontend/src/pages/store-admin/tabs/SAStockTab.tsx` | Create | Stock movements table + add movement form |
| `frontend/src/pages/store-admin/tabs/SAOrdersTab.tsx` | Create | Embed existing `FulfillmentTab` |
| `frontend/src/pages/store-admin/tabs/SABundlesTab.tsx` | Create | Embed existing `BundlesTab` |
| `frontend/src/pages/store-admin/tabs/SAReportsTab.tsx` | Create | KPIs + top 5 products by sales |

---

## Task 1 — Backend: Extend fulfillment controller with product & stock endpoints

**Files:**
- Modify: `mar-eac/backend/src/modules/fulfillment/fulfillment.controller.js`

Context: `fulfillment.controller.js` currently has `getOrders`, `updateOrder`, `getStockAlerts`. Append the new functions before `module.exports`.

- [ ] **Step 1: Add product + stock functions to fulfillment.controller.js**

Open `fulfillment.controller.js`. Find `module.exports` at the bottom. Insert all the following functions BEFORE it:

```js
// ── Cross-org product management (SUPER_ADMIN + STORE_MANAGER) ───────────────

// GET /api/fulfillment/products?search=&category=&orgId=&status=&page=1&limit=20
const getProducts = async (req, res) => {
  try {
    const { search = '', category = '', orgId = '', status = '', page = '1', limit = '20' } = req.query;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit)));

    const where = { organization: { modules: { has: 'COMMERCE' } } };
    if (orgId)    where.organizationId = orgId;
    if (category) where.category = category;
    if (status === 'active')   where.isActive = true;
    if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name:   { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search } },
        { sku:    { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.commerceProduct.findMany({
        where,
        include: {
          organization: { select: { id: true, name: true, nameAr: true } },
          stockMovements: { select: { type: true, quantity: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.commerceProduct.count({ where }),
    ]);

    const products = items.map(p => {
      const stock = p.stockMovements.reduce((s, m) => {
        if (m.type === 'IN' || m.type === 'RETURN') return s + m.quantity;
        if (m.type === 'OUT') return s - m.quantity;
        if (m.type === 'ADJUST') return m.quantity;
        return s;
      }, 0);
      const { stockMovements, ...rest } = p;
      return { ...rest, stock };
    });

    res.json({ products, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/fulfillment/products
const createProduct = async (req, res) => {
  try {
    const { organizationId, name, nameAr, description, category, sku, costPrice, sellingPrice, commission, unit, imageUrl, isActive, initialStock } = req.body;
    if (!organizationId || !name || !sellingPrice) {
      return res.status(400).json({ message: 'organizationId, name, sellingPrice requis' });
    }
    const product = await prisma.commerceProduct.create({
      data: {
        organizationId,
        name, nameAr: nameAr || null,
        description: description || null,
        category: category || null,
        sku: sku || null,
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice),
        commission: parseFloat(commission) || 0,
        unit: unit || 'pièce',
        imageUrl: imageUrl || null,
        isActive: isActive !== false,
      },
    });
    if (initialStock && parseInt(initialStock) > 0) {
      await prisma.commerceStockMovement.create({
        data: {
          organizationId,
          productId: product.id,
          type: 'IN',
          quantity: parseInt(initialStock),
          reference: 'INITIAL',
        },
      });
    }
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/fulfillment/products/:id
const updateProduct = async (req, res) => {
  try {
    const { name, nameAr, description, category, sku, costPrice, sellingPrice, commission, unit, imageUrl, isActive, organizationId } = req.body;
    const data = {};
    if (name        !== undefined) data.name        = name;
    if (nameAr      !== undefined) data.nameAr      = nameAr || null;
    if (description !== undefined) data.description = description || null;
    if (category    !== undefined) data.category    = category || null;
    if (sku         !== undefined) data.sku         = sku || null;
    if (costPrice   !== undefined) data.costPrice   = parseFloat(costPrice) || 0;
    if (sellingPrice !== undefined) data.sellingPrice = parseFloat(sellingPrice);
    if (commission  !== undefined) data.commission  = parseFloat(commission) || 0;
    if (unit        !== undefined) data.unit        = unit;
    if (imageUrl    !== undefined) data.imageUrl    = imageUrl || null;
    if (isActive    !== undefined) data.isActive    = Boolean(isActive);
    if (organizationId !== undefined) data.organizationId = organizationId;

    const product = await prisma.commerceProduct.update({ where: { id: req.params.id }, data });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/fulfillment/products/:id
const deleteProduct = async (req, res) => {
  try {
    await prisma.commerceProduct.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/fulfillment/products/:id/toggle
const toggleProduct = async (req, res) => {
  try {
    const product = await prisma.commerceProduct.findUnique({ where: { id: req.params.id }, select: { isActive: true } });
    if (!product) return res.status(404).json({ message: 'Not found' });
    const updated = await prisma.commerceProduct.update({
      where: { id: req.params.id },
      data: { isActive: !product.isActive },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/fulfillment/stock-movements?productId=&orgId=&page=1
const getStockMovements = async (req, res) => {
  try {
    const { productId = '', orgId = '', page = '1' } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const where = {};
    if (productId) where.productId = productId;
    if (orgId)     where.organizationId = orgId;

    const [items, total] = await Promise.all([
      prisma.commerceStockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, nameAr: true, unit: true } },
          organization: { select: { name: true, nameAr: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * 30,
        take: 30,
      }),
      prisma.commerceStockMovement.count({ where }),
    ]);
    res.json({ movements: items, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/fulfillment/stock-movements
const addStockMovement = async (req, res) => {
  try {
    const { organizationId, productId, type, quantity, reference, notes } = req.body;
    if (!organizationId || !productId || !type || !quantity) {
      return res.status(400).json({ message: 'organizationId, productId, type, quantity requis' });
    }
    const movement = await prisma.commerceStockMovement.create({
      data: { organizationId, productId, type, quantity: parseInt(quantity), reference: reference || null, notes: notes || null },
    });
    res.status(201).json(movement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/fulfillment/commerce-orgs — list all orgs with COMMERCE module (for product org selector)
const getCommerceOrgs = async (req, res) => {
  try {
    const orgs = await prisma.organization.findMany({
      where: { modules: { has: 'COMMERCE' } },
      select: { id: true, name: true, nameAr: true, cityAr: true },
      orderBy: { name: 'asc' },
    });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

- [ ] **Step 2: Update `module.exports`**

Find `module.exports` in `fulfillment.controller.js` and replace it with:

```js
module.exports = {
  getOrders, updateOrder, getStockAlerts,
  getProducts, createProduct, updateProduct, deleteProduct, toggleProduct,
  getStockMovements, addStockMovement, getCommerceOrgs,
};
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/backend/src/modules/fulfillment/fulfillment.controller.js
git commit -m "feat(fulfillment): add cross-org product CRUD + stock movement endpoints"
```

---

## Task 2 — Backend: Update fulfillment and store routes

**Files:**
- Modify: `mar-eac/backend/src/modules/fulfillment/fulfillment.routes.js`
- Modify: `mar-eac/backend/src/modules/store/store.routes.js`

### fulfillment.routes.js

Current content:
```js
router.use(auth, requireRole('SUPER_ADMIN'));
router.get('/orders', ctrl.getOrders);
router.patch('/orders/:id', ctrl.updateOrder);
router.get('/stock-alerts', ctrl.getStockAlerts);
```

- [ ] **Step 1: Replace entire fulfillment.routes.js**

```js
const router = require('express').Router();
const ctrl   = require('./fulfillment.controller');
const { auth }        = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

router.use(auth, requireRole('SUPER_ADMIN', 'STORE_MANAGER'));

// Orders
router.get   ('/orders',             ctrl.getOrders);
router.patch ('/orders/:id',         ctrl.updateOrder);

// Stock alerts
router.get   ('/stock-alerts',       ctrl.getStockAlerts);

// Products (cross-org)
router.get   ('/products',           ctrl.getProducts);
router.post  ('/products',           ctrl.createProduct);
router.put   ('/products/:id',       ctrl.updateProduct);
router.delete('/products/:id',       ctrl.deleteProduct);
router.patch ('/products/:id/toggle',ctrl.toggleProduct);

// Stock movements (cross-org)
router.get   ('/stock-movements',    ctrl.getStockMovements);
router.post  ('/stock-movements',    ctrl.addStockMovement);

// Org list for product form selector
router.get   ('/commerce-orgs',      ctrl.getCommerceOrgs);

module.exports = router;
```

### store.routes.js — add STORE_MANAGER to bundle mutations

- [ ] **Step 2: Update bundle mutation routes in store.routes.js**

Find these 3 lines in `store.routes.js`:
```js
router.post  ('/bundles',     auth, requireRole('SUPER_ADMIN'), ctrl.createBundle);
router.put   ('/bundles/:id', auth, requireRole('SUPER_ADMIN'), ctrl.updateBundle);
router.delete('/bundles/:id', auth, requireRole('SUPER_ADMIN'), ctrl.deleteBundle);
```

Replace with:
```js
router.post  ('/bundles',     auth, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), ctrl.createBundle);
router.put   ('/bundles/:id', auth, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), ctrl.updateBundle);
router.delete('/bundles/:id', auth, requireRole('SUPER_ADMIN', 'STORE_MANAGER'), ctrl.deleteBundle);
```

- [ ] **Step 3: Test new routes manually**

```bash
cd /Users/mac/Documents/jm3iat/mar-eac/backend && node src/server.js &

# Use superadmin token:
curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3001/api/fulfillment/products?limit=3"
# Expected: { products: [...], total: N }

curl -H "Authorization: Bearer <TOKEN>" \
  "http://localhost:3001/api/fulfillment/commerce-orgs"
# Expected: [ { id, name, nameAr, cityAr }, ... ]

kill %1
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/backend/src/modules/fulfillment/fulfillment.routes.js \
        mar-eac/backend/src/modules/store/store.routes.js
git commit -m "feat(fulfillment): register product/stock routes, add STORE_MANAGER role to bundle + fulfillment routes"
```

---

## Task 3 — Frontend: Add STORE_MANAGER to AuthContext + api.ts

**Files:**
- Modify: `mar-eac/frontend/src/contexts/AuthContext.tsx`
- Modify: `mar-eac/frontend/src/lib/api.ts`

### AuthContext.tsx

- [ ] **Step 1: Add STORE_MANAGER to UserRole type**

Open `AuthContext.tsx`. Find this line (around line 4):
```ts
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PRESIDENT' | 'TREASURER' | 'SECRETARY' | 'MANAGER' | 'WATER_READER';
```

Replace with:
```ts
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'PRESIDENT' | 'TREASURER' | 'SECRETARY' | 'MANAGER' | 'WATER_READER' | 'STORE_MANAGER';
```

- [ ] **Step 2: Add `isStoreManager` to the context value**

Find the block that computes context values (around lines 194–216, the object with `isSuperAdmin`, `isWaterReader`, etc.). Add `isStoreManager`:

```ts
      isStoreManager: role === 'STORE_MANAGER',
```

Find the `isSuperAdmin: boolean` interface field declaration and add:
```ts
  isStoreManager: boolean;
```

Find the default context value object (around line 103) and add:
```ts
  isStoreManager: false,
```

### api.ts — storeManagerApi

- [ ] **Step 3: Add `storeManagerApi` to api.ts**

Open `frontend/src/lib/api.ts`. Find where `bundleApi` is exported (around line 627). Add after it:

```ts
export const storeManagerApi = {
  // Products
  getProducts:      (params?: any)              => api.get('/fulfillment/products', { params }),
  createProduct:    (data: any)                 => api.post('/fulfillment/products', data),
  updateProduct:    (id: string, data: any)     => api.put(`/fulfillment/products/${id}`, data),
  deleteProduct:    (id: string)                => api.delete(`/fulfillment/products/${id}`),
  toggleProduct:    (id: string)                => api.patch(`/fulfillment/products/${id}/toggle`),
  // Stock
  getStockMovements: (params?: any)             => api.get('/fulfillment/stock-movements', { params }),
  addStockMovement:  (data: any)                => api.post('/fulfillment/stock-movements', data),
  // Orgs list for product form
  getCommerceOrgs:  ()                          => api.get('/fulfillment/commerce-orgs'),
  // Reports (reuse existing)
  getStoreStats:    ()                          => api.get('/superadmin/stats', { params: { section: 'store' } }),
};
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/frontend/src/contexts/AuthContext.tsx mar-eac/frontend/src/lib/api.ts
git commit -m "feat(auth): add STORE_MANAGER role, isStoreManager flag, storeManagerApi client"
```

---

## Task 4 — Frontend: Route guard + /store-admin route in App.tsx

**Files:**
- Modify: `mar-eac/frontend/src/App.tsx`

- [ ] **Step 1: Add StoreAdminGuard and import**

Open `App.tsx`. Find the existing `SuperAdminGuard` component (around line 49):
```tsx
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />;
```

Add a new guard right after it:
```tsx
function StoreAdminGuard({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin, isStoreManager } = useAuth();
  return (isSuperAdmin || isStoreManager) ? <>{children}</> : <Navigate to="/login" replace />;
}
```

- [ ] **Step 2: Add StoreAdminPage import**

At the top of `App.tsx`, with the other page imports, add:
```tsx
import { StoreAdminPage } from './pages/store-admin/StoreAdminPage';
```

- [ ] **Step 3: Add login redirect for STORE_MANAGER**

Find where the app determines where to redirect after login. Typically this is in the auth flow or a `PrivateRoute` component. Find the `isSuperAdmin` redirect (likely sends to `/superadmin`) and add a parallel check:

```tsx
// Add this logic wherever the post-login redirect is decided.
// If user.role === 'STORE_MANAGER', redirect to '/store-admin' instead of '/dashboard'
```

Open `AuthContext.tsx`, find where navigation happens after login (the `login` function). After the existing `isSuperAdmin` check that redirects to `/superadmin`, add:

```ts
if (userData.role === 'STORE_MANAGER') {
  navigate('/store-admin');
  return;
}
```

> Note: If no redirect logic exists in AuthContext, find where the post-login redirect happens in `LoginPage.tsx` or wherever `login()` is called, and add the same check there.

- [ ] **Step 4: Register /store-admin route**

In `App.tsx`, find the `<Route path="/superadmin" ...>` block. Add the new route alongside it:

```tsx
<Route path="/store-admin" element={
  <StoreAdminGuard>
    <StoreAdminPage />
  </StoreAdminGuard>
} />
```

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/frontend/src/App.tsx mar-eac/frontend/src/contexts/AuthContext.tsx
git commit -m "feat(routing): add /store-admin route with StoreAdminGuard, redirect STORE_MANAGER on login"
```

---

## Task 5 — Frontend: StoreAdminPage shell

**Files:**
- Create: `mar-eac/frontend/src/pages/store-admin/StoreAdminPage.tsx`

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/mac/Documents/jm3iat/mar-eac/frontend/src/pages/store-admin/tabs
```

- [ ] **Step 2: Create StoreAdminPage.tsx**

```tsx
import React, { useState } from 'react';
import { Package, Tag, BarChart2, ShoppingCart, Gift, TrendingUp, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SAProductsTab }   from './tabs/SAProductsTab';
import { SACategoriesTab } from './tabs/SACategoriesTab';
import { SAStockTab }      from './tabs/SAStockTab';
import { SAOrdersTab }     from './tabs/SAOrdersTab';
import { SABundlesTab }    from './tabs/SABundlesTab';
import { SAReportsTab }    from './tabs/SAReportsTab';

type SATab = 'products' | 'categories' | 'stock' | 'orders' | 'bundles' | 'reports';

const NAV: { key: SATab; icon: React.ReactNode; labelAr: string }[] = [
  { key: 'products',   icon: <Package size={16} />,    labelAr: 'المنتجات' },
  { key: 'categories', icon: <Tag size={16} />,        labelAr: 'الفئات' },
  { key: 'stock',      icon: <BarChart2 size={16} />,  labelAr: 'المخزون' },
  { key: 'orders',     icon: <ShoppingCart size={16} />, labelAr: 'الطلبات' },
  { key: 'bundles',    icon: <Gift size={16} />,        labelAr: 'الباقات' },
  { key: 'reports',    icon: <TrendingUp size={16} />,  labelAr: 'التقارير' },
];

export function StoreAdminPage() {
  const [tab, setTab]   = useState<SATab>('products');
  const { logout }      = useAuth();
  const navigate        = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Sidebar */}
      <aside className="w-52 bg-indigo-950 flex-shrink-0 flex flex-col">
        <div className="px-4 py-5 border-b border-indigo-900">
          <div className="text-white font-black text-base">🏪 معرضنا</div>
          <div className="text-indigo-300 text-xs mt-0.5">مسؤول المتجر</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <button key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tab === item.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-300 hover:bg-indigo-900 hover:text-white'
              }`}>
              {item.icon}
              {item.labelAr}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-indigo-900">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-indigo-300 hover:text-red-400 hover:bg-indigo-900 transition-colors">
            <LogOut size={15} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {tab === 'products'   && <SAProductsTab />}
          {tab === 'categories' && <SACategoriesTab />}
          {tab === 'stock'      && <SAStockTab />}
          {tab === 'orders'     && <SAOrdersTab />}
          {tab === 'bundles'    && <SABundlesTab />}
          {tab === 'reports'    && <SAReportsTab />}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/frontend/src/pages/store-admin/StoreAdminPage.tsx
git commit -m "feat(store-admin): add StoreAdminPage shell with sidebar navigation"
```

---

## Task 6 — Frontend: SAProductsTab (WooCommerce-style)

**Files:**
- Create: `mar-eac/frontend/src/pages/store-admin/tabs/SAProductsTab.tsx`

This is the main tab. It has:
1. A filters bar (search + category + status + org)
2. A product table (20 rows per page, pagination)
3. A slide-in edit/add panel (position: fixed from left)

- [ ] **Step 1: Create SAProductsTab.tsx**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { storeManagerApi } from '../../../lib/api';

interface SAProduct {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  category?: string;
  sku?: string;
  costPrice: number;
  sellingPrice: number;
  commission: number;
  unit: string;
  imageUrl?: string;
  isActive: boolean;
  stock: number;
  organization: { id: string; name: string; nameAr?: string };
}

interface Org { id: string; name: string; nameAr?: string }

const CATEGORY_EMOJI: Record<string, string> = {
  'زيت أركان': '🫒', 'العسل': '🍯', 'الزعفران': '🌸',
  'المنسوجات والسجاد': '🪡', 'الفخار والخزف': '🏺',
  'منتجات التجميل الطبيعية': '💄', 'التمر': '🌴', 'منتجات الجلد': '👜',
};

const emptyForm = {
  organizationId: '', name: '', nameAr: '', description: '', category: '',
  sku: '', costPrice: '', sellingPrice: '', commission: '', unit: 'pièce',
  imageUrl: '', isActive: true, initialStock: '',
};

export function SAProductsTab() {
  const [products, setProducts]   = useState<SAProduct[]>([]);
  const [orgs, setOrgs]           = useState<Org[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrg, setFilterOrg] = useState('');

  // Edit panel
  const [panelOpen, setPanelOpen]   = useState(false);
  const [editing, setEditing]       = useState<SAProduct | null>(null);
  const [form, setForm]             = useState({ ...emptyForm });
  const [saving, setSaving]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await storeManagerApi.getProducts({
        search: searchQuery, category: filterCat, status: filterStatus,
        orgId: filterOrg, page, limit: 20,
      });
      setProducts(r.data.products);
      setTotal(r.data.total);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCat, filterStatus, filterOrg, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    storeManagerApi.getCommerceOrgs().then(r => setOrgs(r.data));
  }, []);

  // Distinct categories from loaded products (for filter dropdown)
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setPanelOpen(true);
  };

  const openEdit = (p: SAProduct) => {
    setEditing(p);
    setForm({
      organizationId: p.organization.id,
      name: p.name, nameAr: p.nameAr || '', description: p.description || '',
      category: p.category || '', sku: p.sku || '',
      costPrice: String(p.costPrice), sellingPrice: String(p.sellingPrice),
      commission: String(p.commission), unit: p.unit,
      imageUrl: p.imageUrl || '', isActive: p.isActive, initialStock: '',
    });
    setPanelOpen(true);
  };

  const handleToggle = async (p: SAProduct) => {
    await storeManagerApi.toggleProduct(p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('تأكيد الحذف؟')) return;
    await storeManagerApi.deleteProduct(id);
    load();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        await storeManagerApi.updateProduct(editing.id, form);
      } else {
        await storeManagerApi.createProduct(form);
      }
      setPanelOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof typeof form, val: any) => setForm(prev => ({ ...prev, [key]: val }));
  const margin = form.sellingPrice && form.costPrice
    ? (parseFloat(form.sellingPrice) - parseFloat(form.costPrice)).toFixed(2)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">المنتجات</h1>
          <p className="text-xs text-gray-500 mt-0.5">{total} منتج إجمالاً</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> إضافة منتج
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 flex-1 min-w-[200px]">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearchQuery(search); setPage(1); } }}
            placeholder="بحث..."
            className="flex-1 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
          <button onClick={() => { setSearchQuery(search); setPage(1); }}
            className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
            🔍
          </button>
        </div>
        <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">كل الفئات</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">مخفي</option>
        </select>
        <select value={filterOrg} onChange={e => { setFilterOrg(e.target.value); setPage(1); }}
          className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
          <option value="">كل التعاونيات</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.nameAr || o.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[40px_48px_1fr_100px_90px_80px_70px_60px] gap-0 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          {['', 'صورة', 'المنتج', 'الفئة', 'السعر', 'المخزون', 'الحالة', ''].map((h, i) => (
            <div key={i} className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</div>
          ))}
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">لا توجد منتجات</div>
        ) : (
          products.map(p => {
            const emoji = (p.category && CATEGORY_EMOJI[p.category]) || '📦';
            const stockBadge = p.stock <= 0
              ? { cls: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400', label: '✗ نفد' }
              : p.stock <= 5
              ? { cls: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400', label: `⚠ ${p.stock}` }
              : { cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', label: `✓ ${p.stock}` };

            return (
              <div key={p.id}
                className={`grid grid-cols-[40px_48px_1fr] md:grid-cols-[40px_48px_1fr_100px_90px_80px_70px_60px] gap-0 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0 items-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30 ${!p.isActive ? 'opacity-60' : ''}`}>
                <div><input type="checkbox" className="w-3.5 h-3.5 accent-indigo-600" /></div>
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="w-full h-full object-cover" /> : emoji}
                </div>
                <div className="px-2 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{p.nameAr || p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.name}</p>
                  {p.sku && <span className="inline-block text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded text-[10px] mt-0.5">{p.sku}</span>}
                </div>
                <div className="hidden md:block">
                  {p.category && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg">{p.category}</span>}
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-extrabold text-gray-900 dark:text-white">{p.sellingPrice} <span className="text-xs font-normal text-gray-400">د.م</span></p>
                  <p className="text-xs text-gray-400">تكلفة: {p.costPrice}</p>
                </div>
                <div className="hidden md:block">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${stockBadge.cls}`}>{stockBadge.label}</span>
                </div>
                <div className="hidden md:block">
                  <label className="relative inline-block w-9 h-5 cursor-pointer">
                    <input type="checkbox" className="sr-only" checked={p.isActive} onChange={() => handleToggle(p)} />
                    <span className={`block w-full h-full rounded-full transition-colors ${p.isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </span>
                  </label>
                </div>
                <div className="flex gap-1 justify-end">
                  <button onClick={() => openEdit(p)}
                    className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="w-7 h-7 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-200 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span>عرض {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} من {total}</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
              السابق
            </button>
            <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold">{page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Edit / Add panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex bg-black/40" onClick={e => { if (e.target === e.currentTarget) setPanelOpen(false); }}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full overflow-y-auto shadow-2xl flex flex-col" dir="rtl">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <h2 className="font-black text-gray-900 dark:text-white">
                {editing ? '✏️ تعديل المنتج' : '+ إضافة منتج'}
              </h2>
              <button onClick={() => setPanelOpen(false)} className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-5 space-y-5">
              {/* Image section */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">🖼️ صورة المنتج</p>
                <div className="w-full h-28 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700 mb-2 overflow-hidden">
                  {form.imageUrl
                    ? <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-4xl opacity-40">📦</span>}
                </div>
                <input value={form.imageUrl} onChange={e => f('imageUrl', e.target.value)}
                  placeholder="رابط الصورة https://..."
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
              </div>

              {/* Identity */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">📝 المعلومات الأساسية</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الاسم بالعربية</label>
                    <input value={form.nameAr} onChange={e => f('nameAr', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Nom en français</label>
                    <input value={form.name} onChange={e => f('name', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الوصف</label>
                    <textarea value={form.description} onChange={e => f('description', e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الفئة</label>
                      <input value={form.category} onChange={e => f('category', e.target.value)}
                        list="categories-list"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                      <datalist id="categories-list">
                        {categories.map(c => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">التعاونية</label>
                      <select value={form.organizationId} onChange={e => f('organizationId', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400">
                        <option value="">اختر...</option>
                        {orgs.map(o => <option key={o.id} value={o.id}>{o.nameAr || o.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">SKU</label>
                    <input value={form.sku} onChange={e => f('sku', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
              </div>

              {/* Prix */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">💰 الأسعار</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">سعر البيع (د.م)</label>
                    <input type="number" value={form.sellingPrice} onChange={e => f('sellingPrice', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">سعر الشراء (د.م)</label>
                    <input type="number" value={form.costPrice} onChange={e => f('costPrice', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                </div>
                {margin !== null && (
                  <div className="mt-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    ✓ هامش الربح: {margin} د.م
                  </div>
                )}
              </div>

              {/* Stock / unit */}
              <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">📦 المخزون</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الوحدة</label>
                    <input value={form.unit} onChange={e => f('unit', e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                  </div>
                  {!editing && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">مخزون أولي</label>
                      <input type="number" value={form.initialStock} onChange={e => f('initialStock', e.target.value)}
                        placeholder="0"
                        className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Statut */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">منتج نشط</p>
                  <p className="text-xs text-gray-400">يظهر في المتجر للزوار</p>
                </div>
                <label className="relative inline-block w-11 h-6 cursor-pointer">
                  <input type="checkbox" className="sr-only" checked={form.isActive} onChange={e => f('isActive', e.target.checked)} />
                  <span className={`block w-full h-full rounded-full transition-colors ${form.isActive ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </span>
                </label>
              </div>
            </div>

            {/* Panel footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button onClick={() => setPanelOpen(false)}
                className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700">
                إلغاء
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {saving ? 'جاري الحفظ...' : '💾 حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/frontend/src/pages/store-admin/tabs/SAProductsTab.tsx
git commit -m "feat(store-admin): add SAProductsTab — WooCommerce-style product table with slide-in edit panel"
```

---

## Task 7 — Frontend: Remaining tabs (Categories, Stock, Orders, Bundles, Reports)

**Files:**
- Create: `mar-eac/frontend/src/pages/store-admin/tabs/SACategoriesTab.tsx`
- Create: `mar-eac/frontend/src/pages/store-admin/tabs/SAStockTab.tsx`
- Create: `mar-eac/frontend/src/pages/store-admin/tabs/SAOrdersTab.tsx`
- Create: `mar-eac/frontend/src/pages/store-admin/tabs/SABundlesTab.tsx`
- Create: `mar-eac/frontend/src/pages/store-admin/tabs/SAReportsTab.tsx`

### SACategoriesTab.tsx

- [ ] **Step 1: Create SACategoriesTab.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import { storeManagerApi } from '../../../lib/api';

interface CatStat { name: string; count: number }

export function SACategoriesTab() {
  const [cats, setCats] = useState<CatStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeManagerApi.getProducts({ limit: 500 }).then(r => {
      const map: Record<string, number> = {};
      for (const p of r.data.products) {
        if (p.category) map[p.category] = (map[p.category] || 0) + 1;
      }
      setCats(Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-4">الفئات</h1>
      {loading ? (
        <div className="space-y-2">{Array.from({length: 5}).map((_, i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {cats.map(c => (
            <div key={c.name} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">
              <span className="font-semibold text-gray-900 dark:text-white">{c.name}</span>
              <span className="text-sm text-gray-400">{c.count} منتج</span>
            </div>
          ))}
          {cats.length === 0 && <p className="text-center text-gray-400 py-8">لا توجد فئات</p>}
        </div>
      )}
    </div>
  );
}
```

### SAStockTab.tsx

- [ ] **Step 2: Create SAStockTab.tsx**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { storeManagerApi } from '../../../lib/api';

interface Movement {
  id: string; type: string; quantity: number; reference?: string; notes?: string; createdAt: string;
  product: { name: string; nameAr?: string; unit: string };
  organization: { name: string; nameAr?: string };
}

interface Product { id: string; name: string; nameAr?: string; organization: { id: string } }

const TYPE_LABELS: Record<string, string> = { IN: '📥 وارد', OUT: '📤 صادر', ADJUST: '🔧 تعديل', RETURN: '↩️ إرجاع' };

export function SAStockTab() {
  const [movements, setMovements]     = useState<Movement[]>([]);
  const [products, setProducts]       = useState<Product[]>([]);
  const [orgs, setOrgs]               = useState<any[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ organizationId: '', productId: '', type: 'IN', quantity: '', reference: '', notes: '' });
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await storeManagerApi.getStockMovements({ page });
      setMovements(r.data.movements);
      setTotal(r.data.total);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([storeManagerApi.getProducts({ limit: 500 }), storeManagerApi.getCommerceOrgs()])
      .then(([pr, or]) => { setProducts(pr.data.products); setOrgs(or.data); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await storeManagerApi.addStockMovement(form);
      setShowForm(false);
      setForm({ organizationId: '', productId: '', type: 'IN', quantity: '', reference: '', notes: '' });
      load();
    } finally { setSaving(false); }
  };

  const f = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-gray-900 dark:text-white">المخزون</h1>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">
          <Plus size={16} /> حركة جديدة
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">التعاونية</label>
              <select value={form.organizationId} onChange={e => f('organizationId', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400">
                <option value="">اختر...</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.nameAr || o.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">المنتج</label>
              <select value={form.productId} onChange={e => f('productId', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400">
                <option value="">اختر...</option>
                {products.filter(p => !form.organizationId || p.organization.id === form.organizationId)
                  .map(p => <option key={p.id} value={p.id}>{p.nameAr || p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">النوع</label>
              <select value={form.type} onChange={e => f('type', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400">
                <option value="IN">📥 وارد</option>
                <option value="OUT">📤 صادر</option>
                <option value="ADJUST">🔧 تعديل</option>
                <option value="RETURN">↩️ إرجاع</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">الكمية</label>
              <input type="number" value={form.quantity} onChange={e => f('quantity', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">المرجع</label>
              <input value={form.reference} onChange={e => f('reference', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">ملاحظات</label>
              <input value={form.notes} onChange={e => f('notes', e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-700">إلغاء</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
              {saving ? '...' : 'حفظ'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
        ) : movements.map(m => (
          <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <span className="text-sm">{TYPE_LABELS[m.type] || m.type}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{m.product.nameAr || m.product.name}</p>
              <p className="text-xs text-gray-400">{m.organization.nameAr || m.organization.name} · {m.reference}</p>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">{m.quantity} {m.product.unit}</p>
            <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString('ar-MA')}</p>
          </div>
        ))}
        {!loading && movements.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">لا توجد حركات</p>}
      </div>

      {total > 30 && (
        <div className="flex justify-end gap-1 mt-3">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">السابق</button>
          <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">{page}</span>
          <button onClick={() => setPage(p => p+1)} disabled={page*30>=total} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-xs disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">التالي</button>
        </div>
      )}
    </div>
  );
}
```

### SAOrdersTab.tsx

- [ ] **Step 3: Create SAOrdersTab.tsx**

```tsx
import React from 'react';
import { FulfillmentTab } from '../../superadmin/tabs/FulfillmentTab';

export function SAOrdersTab() {
  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-4">الطلبات</h1>
      <FulfillmentTab />
    </div>
  );
}
```

### SABundlesTab.tsx

- [ ] **Step 4: Create SABundlesTab.tsx**

```tsx
import React from 'react';
import { BundlesTab } from '../../superadmin/tabs/BundlesTab';

export function SABundlesTab() {
  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-4">الباقات</h1>
      <BundlesTab />
    </div>
  );
}
```

### SAReportsTab.tsx

- [ ] **Step 5: Create SAReportsTab.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import { storeManagerApi } from '../../../lib/api';

export function SAReportsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeManagerApi.getStoreStats().then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({length:4}).map((_,i) => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl animate-pulse" />)}
    </div>
  );

  if (!stats) return null;

  const kpis = [
    { label: 'طلبات اليوم',    value: stats.todayOrders,                            color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'في الانتظار',    value: stats.pendingOrders,                           color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'رقم اليوم',      value: `${(stats.todayRevenue || 0).toFixed(0)} د.م`, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'إيرادات الشهر',  value: `${(stats.monthRevenue || 0).toFixed(0)} د.م`, color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ];

  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-4">التقارير</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className={`rounded-2xl p-4 ${k.bg}`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{k.label}</p>
            <p className={`text-2xl font-extrabold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit all tabs**

```bash
cd /Users/mac/Documents/jm3iat
git add mar-eac/frontend/src/pages/store-admin/tabs/
git commit -m "feat(store-admin): add SACategoriesTab, SAStockTab, SAOrdersTab, SABundlesTab, SAReportsTab"
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ `STORE_MANAGER` role (string, no schema migration needed — User.role is already String)
- ✅ SuperAdmin creates user from Users tab — existing `createUser` endpoint, role dropdown in existing form just needs `STORE_MANAGER` added as option (handled by AuthContext type change)
- ✅ Post-login redirect to `/store-admin` for STORE_MANAGER
- ✅ `/store-admin` route protected by `StoreAdminGuard`
- ✅ Store manager cannot access `/superadmin` (guard redirects elsewhere)
- ✅ Products tab: table + filters (search/category/status/org) + inline toggle + slide-in panel with all fields (imageUrl, description, nameAr, name, category, org, SKU, sellingPrice, costPrice, unit, initialStock, isActive)
- ✅ Categories tab: read-only list with counts
- ✅ Stock tab: movements table + add form
- ✅ Orders tab: embeds FulfillmentTab
- ✅ Bundles tab: embeds BundlesTab
- ✅ Reports tab: KPIs from store stats
- ✅ `STORE_MANAGER` added to fulfillment + bundle mutation routes
- ✅ No backend schema migration — role is free-text String already

**Placeholder scan:** All code blocks complete. No TBDs.

**Type consistency:** `storeManagerApi.getProducts()` returns `{ products: SAProduct[], total: number }` matching what `getProducts` in controller returns. `SAProduct.organization` shape `{ id, name, nameAr }` matches the `include` in `getProducts`. `storeManagerApi.getStoreStats()` calls `/superadmin/stats?section=store` matching `superadminApi.getStats('store')` pattern.

**Note on Users tab:** The SuperAdmin's existing "create user" form needs `STORE_MANAGER` added to the role dropdown options. Find `UsersTab.tsx` or equivalent in `frontend/src/pages/superadmin/tabs/` and add `'STORE_MANAGER'` to the role options array.
