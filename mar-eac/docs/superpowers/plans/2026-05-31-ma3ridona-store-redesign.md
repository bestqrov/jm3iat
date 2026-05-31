# Ma3ridona Store Redesign & Fulfillment Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing `/store` page into "معرضنا" (Ma3ridona) — a conversion-optimised Moroccan cooperative marketplace — and add a fulfillment operations dashboard + product bundle system for the super admin.

**Architecture:** Three independent layers: (1) store frontend rewrite with hardcoded category grid, countdown banner, best-sellers, and packs — all driven by existing backend + two new endpoints; (2) a new `StoreBundle` Prisma model with CRUD backend and pack-builder UI in SuperAdmin; (3) a `FulfillmentTab` in SuperAdmin that queries all `source=STORE` orders across orgs. Each layer is independently deployable.

**Tech Stack:** Node.js/Express + Prisma/MongoDB (backend), React + TypeScript + TailwindCSS + React Router v6 (frontend), Lucide icons.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/prisma/seed.js` | Modify | Add demo coop + 6 products (idempotent) |
| `backend/prisma/schema.prisma` | Modify | Add `StoreBundle` + `StoreBundleItem` models |
| `backend/src/modules/store/store.controller.js` | Modify | Add `getBestSellers`, `getBundles`, `createBundle`, `updateBundle`, `deleteBundle` |
| `backend/src/modules/store/store.routes.js` | Modify | Register 5 new routes |
| `frontend/src/lib/api.ts` | Modify | Add `storeApi.getBestSellers`, `storeApi.getBundles`, `bundleApi.*` |
| `frontend/src/pages/store/StorePage.tsx` | Rewrite | Full redesign: rename + 6 sections |
| `frontend/src/pages/store/StoreTrackPage.tsx` | No change | Already built |
| `frontend/src/pages/superadmin/tabs/FulfillmentTab.tsx` | Create | KPIs + order kanban + stock alerts |
| `frontend/src/pages/superadmin/tabs/BundlesTab.tsx` | Create | Bundle CRUD UI |
| `frontend/src/pages/superadmin/SuperAdminPage.tsx` | Modify | Register 2 new tabs + update ActiveTab type |

---

## Task 1 — Seed demo cooperative + 6 products

**Files:**
- Modify: `mar-eac/backend/prisma/seed.js`

- [ ] **Step 1: Add demo coop + products at the end of `main()` in seed.js**

After the existing sample org block, add:

```js
  // ── Demo cooperative for Ma3ridona store ─────────────────────────────────
  const demoCoopEmail = 'demo-coop@ma3ridona.ma';
  let demoCoop = await prisma.organization.findUnique({ where: { email: demoCoopEmail } });
  if (!demoCoop) {
    demoCoop = await prisma.organization.create({
      data: {
        name: 'Coopérative Démo Ma3ridona',
        nameAr: 'تعاونية معرضنا التجريبية',
        email: demoCoopEmail,
        phone: '0600000000',
        city: 'Tiznit',
        cityAr: 'تيزنيت',
        region: 'Souss-Massa',
        status: 'ACTIVE',
        modules: ['COMMERCE'],
        trialEndsAt: new Date('2030-01-01'),
      },
    });
    console.log('✅ Demo coop created');
  }

  const existingProducts = await prisma.commerceProduct.count({ where: { organizationId: demoCoop.id } });
  if (existingProducts === 0) {
    const demoProducts = [
      { name: 'Huile d\'Argan Pure 100ml', nameAr: 'زيت أركان نقي 100مل', category: 'زيت أركان', sellingPrice: 89, costPrice: 45, unit: 'flacon', stock: 24 },
      { name: 'Miel de l\'Atlas 250g',     nameAr: 'عسل الأطلس الجبلي 250غ', category: 'العسل', sellingPrice: 120, costPrice: 60, unit: 'bocal', stock: 18 },
      { name: 'Safran de Taliouine 1g',    nameAr: 'زعفران تالوين أصيل 1غ', category: 'الزعفران', sellingPrice: 65, costPrice: 30, unit: 'sachet', stock: 30 },
      { name: 'Tapis Berbère Tissé Main',  nameAr: 'سجادة بربرية يدوية', category: 'المنسوجات والسجاد', sellingPrice: 450, costPrice: 200, unit: 'pièce', stock: 8 },
      { name: 'Poterie Artisanale Tiznit', nameAr: 'فخار صافي تيزنيت', category: 'الفخار والخزف', sellingPrice: 180, costPrice: 80, unit: 'pièce', stock: 12 },
      { name: 'Huile d\'Olive Artisanale 500ml', nameAr: 'زيت الزيتون البلدي 500مل', category: 'زيت الزيتون', sellingPrice: 75, costPrice: 35, unit: 'bouteille', stock: 20 },
    ];

    for (const p of demoProducts) {
      const product = await prisma.commerceProduct.create({
        data: {
          organizationId: demoCoop.id,
          name: p.name, nameAr: p.nameAr,
          category: p.category,
          sellingPrice: p.sellingPrice, costPrice: p.costPrice,
          unit: p.unit, isActive: true,
        },
      });
      await prisma.commerceStockMovement.create({
        data: { organizationId: demoCoop.id, productId: product.id, type: 'IN', quantity: p.stock, reference: 'SEED' },
      });
    }
    console.log('✅ 6 demo products seeded');
  }
```

- [ ] **Step 2: Verify seed runs without error**

```bash
cd /Users/mac/Documents/jm3iat/mar-eac/backend
node prisma/seed.js
# Expected: "✅ Demo coop created" and "✅ 6 demo products seeded" (or "ℹ️ already exists" on re-run)
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/backend/prisma/seed.js
git commit -m "feat(seed): add demo cooperative + 6 Moroccan products for Ma3ridona store"
```

---

## Task 2 — Backend: getBestSellers endpoint

**Files:**
- Modify: `mar-eac/backend/src/modules/store/store.controller.js`
- Modify: `mar-eac/backend/src/modules/store/store.routes.js`

- [ ] **Step 1: Add `getBestSellers` to store.controller.js**

Add after `getStoreCategories` and before `placeStoreOrder`:

```js
// GET /api/store/best-sellers
const getBestSellers = async (req, res) => {
  try {
    // Group order items by product, sum quantities, top 4
    const topItems = await prisma.commerceOrderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 4,
      where: {
        order: {
          source: 'STORE',
          status: { in: ['CONFIRMED', 'SHIPPED', 'DELIVERED'] },
          organization: { modules: { has: 'COMMERCE' } },
        },
      },
    });

    if (topItems.length === 0) return res.json([]);

    const productIds = topItems.map(i => i.productId);
    const products = await prisma.commerceProduct.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: {
        id: true, name: true, nameAr: true, category: true,
        sellingPrice: true, unit: true, imageUrl: true,
        organization: { select: { id: true, name: true, nameAr: true, cityAr: true, logo: true } },
        stockMovements: { select: { type: true, quantity: true } },
      },
    });

    const result = products.map(p => {
      const stock = p.stockMovements.reduce((s, m) => {
        if (m.type === 'IN' || m.type === 'RETURN') return s + m.quantity;
        if (m.type === 'OUT') return s - m.quantity;
        if (m.type === 'ADJUST') return m.quantity;
        return s;
      }, 0);
      const sold = topItems.find(i => i.productId === p.id)?._sum?.quantity ?? 0;
      const { stockMovements, ...rest } = p;
      return { ...rest, stock, sold };
    });

    // preserve best-seller order
    result.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

Update `module.exports`:
```js
module.exports = { getStoreProducts, getStoreProduct, getStoreOrgs, getStoreCategories, placeStoreOrder, getOrderStatus, getBestSellers };
```

- [ ] **Step 2: Register route in store.routes.js**

```js
const router = require('express').Router();
const ctrl   = require('./store.controller');

router.get('/products',              ctrl.getStoreProducts);
router.get('/products/:id',          ctrl.getStoreProduct);
router.get('/orgs',                  ctrl.getStoreOrgs);
router.get('/categories',            ctrl.getStoreCategories);
router.get('/best-sellers',          ctrl.getBestSellers);
router.get('/orders/:orderNumber',   ctrl.getOrderStatus);
router.post('/orders',               ctrl.placeStoreOrder);

module.exports = router;
```

- [ ] **Step 3: Test the endpoint**

```bash
# Start backend
cd /Users/mac/Documents/jm3iat/mar-eac/backend && node src/server.js &

curl http://localhost:3001/api/store/best-sellers
# Expected: [] (no orders yet) or array of products if orders exist
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/backend/src/modules/store/store.controller.js mar-eac/backend/src/modules/store/store.routes.js
git commit -m "feat(store): add GET /best-sellers endpoint sorted by sold quantity"
```

---

## Task 3 — Frontend: storeApi additions

**Files:**
- Modify: `mar-eac/frontend/src/lib/api.ts`

- [ ] **Step 1: Add `getBestSellers` and `getBundles` to storeApi**

Find the `storeApi` export and replace with:

```ts
export const storeApi = {
  getProducts:    (params?: any)         => publicApi2.get('/store/products', { params }),
  getProduct:     (id: string)           => publicApi2.get(`/store/products/${id}`),
  getOrgs:        ()                     => publicApi2.get('/store/orgs'),
  getCategories:  ()                     => publicApi2.get('/store/categories'),
  getBestSellers: ()                     => publicApi2.get('/store/best-sellers'),
  getBundles:     ()                     => publicApi2.get('/store/bundles'),
  placeOrder:     (data: any)            => publicApi2.post('/store/orders', data),
  trackOrder:     (orderNumber: string)  => publicApi2.get(`/store/orders/${orderNumber}`),
};

export const bundleApi = {
  list:    ()              => api.get('/store/bundles'),
  create:  (data: any)     => api.post('/store/bundles', data),
  update:  (id: string, data: any) => api.put(`/store/bundles/${id}`, data),
  remove:  (id: string)    => api.delete(`/store/bundles/${id}`),
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/lib/api.ts
git commit -m "feat(store): add getBestSellers, getBundles, bundleApi to api client"
```

---

## Task 4 — Rewrite StorePage.tsx

**Files:**
- Rewrite: `mar-eac/frontend/src/pages/store/StorePage.tsx`

This is a full file rewrite. The current file is 651 lines. Replace entirely.

- [ ] **Step 1: Write the new StorePage.tsx**

```tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search, ShoppingCart, X, Plus, Minus, Package, Truck,
  ShieldCheck, RefreshCw, Menu, Star, MapPin, ChevronRight
} from 'lucide-react';
import { storeApi } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: string; name: string; nameAr?: string; description?: string;
  category?: string; sellingPrice: number; unit: string; imageUrl?: string;
  stock: number; sold?: number;
  organization: { id: string; name: string; nameAr?: string; city?: string; cityAr?: string; logo?: string; phone?: string };
}
interface Bundle {
  id: string; name: string; nameAr?: string; bundlePrice: number;
  items: { quantity: number; product: { name: string; nameAr?: string; sellingPrice: number } }[];
}
interface CartItem { product: Product; quantity: number }

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_CARDS = [
  { key: 'زيت أركان',            icon: '🫒', bg: '#f3eeff', color: '#6c3fc5' },
  { key: 'العسل',                 icon: '🍯', bg: '#fef9ec', color: '#92400e' },
  { key: 'الزعفران',              icon: '🌸', bg: '#fdf2f8', color: '#86198f' },
  { key: 'المنسوجات والسجاد',    icon: '🪡', bg: '#fff7ed', color: '#9a3412' },
  { key: 'الفخار والخزف',        icon: '🏺', bg: '#fdf4ff', color: '#7c3aed' },
  { key: 'منتجات التجميل الطبيعية', icon: '💄', bg: '#eff6ff', color: '#1e40af' },
  { key: 'التمر',                  icon: '🌴', bg: '#f0fdf4', color: '#166534' },
  { key: 'منتجات الجلد',          icon: '👜', bg: '#fff7ed', color: '#9a3412' },
];

const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  CATEGORY_CARDS.map(c => [c.key, c.icon])
);

// Flash countdown — purely cosmetic, resets to 23h59m on load
function useCountdown() {
  const end = useMemo(() => Date.now() + 23 * 3600000 + 59 * 60000, []);
  const [left, setLeft] = useState(end - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(prev => Math.max(0, prev - 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(left / 3600000)).padStart(2, '0');
  const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StorePage() {
  const [products, setProducts]         = useState<Product[]>([]);
  const [bestSellers, setBestSellers]   = useState<Product[]>([]);
  const [bundles, setBundles]           = useState<Bundle[]>([]);
  const [orgs, setOrgs]                 = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [selCat, setSelCat]             = useState('');
  const [selOrg, setSelOrg]             = useState('');
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]         = useState(false);
  const [detailProduct, setDetail]      = useState<Product | null>(null);
  const [checkoutOpen, setCheckout]     = useState(false);
  const [orderForm, setOrderForm]       = useState({ clientName: '', clientPhone: '', clientAddress: '' });
  const [placing, setPlacing]           = useState(false);
  const [orderSuccess, setSuccess]      = useState<string | null>(null);
  const [orderError, setOrderError]     = useState<string | null>(null);
  const [mobileMenu, setMobileMenu]     = useState(false);
  const countdown                       = useCountdown();

  useEffect(() => {
    Promise.all([
      storeApi.getOrgs(),
      storeApi.getProducts(),
      storeApi.getBestSellers(),
      storeApi.getBundles(),
    ]).then(([o, p, b, bu]) => {
      setOrgs(o.data);
      setProducts(p.data);
      setBestSellers(b.data);
      setBundles(bu.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.nameAr || '').includes(search)) return false;
    if (selOrg && p.organization.id !== selOrg) return false;
    if (selCat && p.category !== selCat) return false;
    return true;
  }), [products, search, selOrg, selCat]);

  const cartTotal = cart.reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const addToCart = useCallback((p: Product, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      return ex ? prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)
                : [...prev, { product: p, quantity: 1 }];
    });
  }, []);

  const addBundleToCart = useCallback((bundle: Bundle) => {
    const bundleProducts = bundle.items
      .map(item => {
        const product = products.find(p => p.nameAr === item.product.nameAr || p.name === item.product.name);
        return product ? { product, quantity: item.quantity } : null;
      })
      .filter(Boolean) as CartItem[];
    setCart(prev => {
      let next = [...prev];
      for (const bi of bundleProducts) {
        const ex = next.find(i => i.product.id === bi.product.id);
        if (ex) next = next.map(i => i.product.id === bi.product.id ? { ...i, quantity: i.quantity + bi.quantity } : i);
        else next = [...next, bi];
      }
      return next;
    });
  }, [products]);

  const changeQty = (id: string, delta: number) =>
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));

  const handlePlaceOrder = async () => {
    if (!orderForm.clientName || !orderForm.clientPhone) { setOrderError('الاسم والهاتف مطلوبان'); return; }
    const byOrg: Record<string, CartItem[]> = {};
    cart.forEach(item => {
      const oid = item.product.organization.id;
      if (!byOrg[oid]) byOrg[oid] = [];
      byOrg[oid].push(item);
    });
    setPlacing(true); setOrderError(null);
    try {
      const numbers: string[] = [];
      for (const [orgId, items] of Object.entries(byOrg)) {
        const r = await storeApi.placeOrder({
          organizationId: orgId,
          clientName: orderForm.clientName,
          clientPhone: orderForm.clientPhone,
          clientAddress: orderForm.clientAddress,
          items: items.map(i => ({ productId: i.product.id, quantity: i.quantity })),
        });
        numbers.push(r.data.orderNumber);
      }
      setSuccess(numbers.join(' , '));
      setCart([]); setCheckout(false); setCartOpen(false);
    } catch (e: any) { setOrderError(e.response?.data?.message || 'حدث خطأ'); }
    finally { setPlacing(false); }
  };

  const PurpleBtn = ({ label, onClick, full = false }: { label: string; onClick: () => void; full?: boolean }) => (
    <button onClick={onClick}
      className={`${full ? 'w-full' : ''} py-3 text-white font-bold rounded-xl text-sm transition-all hover:opacity-90`}
      style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
      {label}
    </button>
  );

  const ProductCard = ({ p, showSoldBadge = false }: { p: Product; showSoldBadge?: boolean }) => (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group border border-gray-100"
      onClick={() => setDetail(p)}>
      <div className="relative w-full h-44 bg-gray-100 overflow-hidden">
        {p.imageUrl
          ? <img src={p.imageUrl} alt={p.nameAr || p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
              <span className="text-5xl">{CATEGORY_ICONS[p.category || ''] || '📦'}</span>
            </div>}
        {p.stock <= 5 && p.stock > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">باقي {p.stock}</span>
        )}
        {p.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white text-gray-700 text-xs font-bold px-3 py-1 rounded-full">نفد المخزون</span>
          </div>
        )}
        {showSoldBadge && p.sold && p.sold > 0 && (
          <span className="absolute top-2 left-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">⭐ الأكثر طلباً</span>
        )}
        {p.organization.logo && (
          <div className="absolute bottom-2 left-2 w-7 h-7 rounded-full border-2 border-white overflow-hidden bg-white shadow">
            <img src={p.organization.logo} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-gray-400 mb-0.5 truncate">{p.organization.nameAr || p.organization.name}{p.organization.cityAr ? ` · ${p.organization.cityAr}` : ''}</p>
        <p className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 mb-1">{p.nameAr || p.name}</p>
        <div className="flex items-center gap-0.5 mb-2">
          {[...Array(5)].map((_, i) => <Star key={i} size={11} className={i < 4 ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />)}
        </div>
        <div className="flex items-center justify-between">
          <div><span className="font-black text-purple-700 text-base">{p.sellingPrice}</span><span className="text-xs text-gray-500 mr-0.5">د.م</span></div>
          {p.stock > 0 && (
            <button onClick={e => { e.stopPropagation(); addToCart(p); }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-all"
              style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
              <Plus size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl" style={{ fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }}>

      {/* ── 1. Flash Banner ── */}
      <div className="text-white text-xs py-1.5 text-center flex items-center justify-center gap-3"
        style={{ background: 'linear-gradient(90deg,#dc2626,#ea580c)' }}>
        <span>⚡ عروض لوقت محدود</span>
        <span className="bg-white text-red-600 font-black px-2 py-0.5 rounded font-mono">{countdown}</span>
        <span>🚚 الدفع عند الاستلام · توصيل لجميع المدن</span>
      </div>

      {/* ── 2. Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{ background: 'linear-gradient(135deg,#6c3fc5,#a78bfa)' }}>
              <Package size={18} />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm leading-tight">معرضنا</p>
              <p className="text-xs text-gray-400 leading-tight">منتجات مغربية أصيلة</p>
            </div>
          </div>
          <div className="flex-1 relative">
            <Search size={15} className="absolute right-3 top-2.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full pr-9 pl-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-400 bg-gray-50 focus:bg-white transition-colors" />
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm text-gray-600">
            <button onClick={() => { setSelCat(''); setSelOrg(''); }} className="hover:text-purple-600 transition-colors">الرئيسية</button>
            <button onClick={() => document.getElementById('all-products')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-purple-600 transition-colors">المنتجات</button>
            <a href="/store/track" className="hover:text-purple-600 transition-colors">تتبع طلبي</a>
          </nav>
          <button onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all"
            style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
            <ShoppingCart size={16} />
            <span className="hidden sm:block">السلة</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{cartCount}</span>
            )}
          </button>
          <button className="md:hidden text-gray-500" onClick={() => setMobileMenu(v => !v)}><Menu size={22} /></button>
        </div>
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 flex gap-4 text-sm text-gray-600">
            <button onClick={() => { setSelCat(''); setSelOrg(''); setMobileMenu(false); }}>الرئيسية</button>
            <a href="/store/track" onClick={() => setMobileMenu(false)}>تتبع طلبي</a>
          </div>
        )}
      </header>

      {/* ── 3. Category Grid ── */}
      <section className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-gray-900">تسوّق حسب الفئة</h2>
          {selCat && <button onClick={() => setSelCat('')} className="text-xs text-purple-600 flex items-center gap-1"><X size={12} />مسح</button>}
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {CATEGORY_CARDS.map(cat => (
            <button key={cat.key} onClick={() => { setSelCat(cat.key === selCat ? '' : cat.key); document.getElementById('all-products')?.scrollIntoView({ behavior: 'smooth' }); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${selCat === cat.key ? 'border-purple-500 shadow-md scale-105' : 'border-transparent hover:border-purple-200'}`}
              style={{ background: selCat === cat.key ? cat.bg : 'white' }}>
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-xs font-medium text-center leading-tight" style={{ color: cat.color, fontSize: '10px' }}>{cat.key.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── 4. Packs ── */}
      {bundles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-gray-900">🎁 الباقات الأكثر طلباً</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {bundles.map(bundle => {
              const originalTotal = bundle.items.reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0);
              const discount = originalTotal > 0 ? Math.round((1 - bundle.bundlePrice / originalTotal) * 100) : 0;
              return (
                <div key={bundle.id} className="flex-shrink-0 w-52 rounded-2xl p-4 border border-amber-200"
                  style={{ background: 'linear-gradient(135deg,#fef3c7,#fde68a)' }}>
                  <div className="font-bold text-amber-900 text-sm mb-1">{bundle.nameAr || bundle.name}</div>
                  <div className="text-xs text-gray-500 mb-3 leading-relaxed">
                    {bundle.items.map(i => i.product.nameAr || i.product.name).join(' + ')}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-purple-700 text-lg">{bundle.bundlePrice}</span>
                      <span className="text-xs text-gray-500 mr-0.5">د.م</span>
                      {discount > 0 && <span className="block text-xs text-emerald-600 font-medium">وفّر {discount}%</span>}
                    </div>
                    <button onClick={() => addBundleToCart(bundle)}
                      className="px-3 py-1.5 text-white text-xs font-bold rounded-xl"
                      style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                      + سلة
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 5. Best Sellers ── */}
      {bestSellers.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-8">
          <h2 className="font-black text-gray-900 mb-3">🔥 الأكثر مبيعاً</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {bestSellers.map((p, idx) => <ProductCard key={p.id} p={p} showSoldBadge={idx === 0} />)}
          </div>
        </section>
      )}

      {/* ── Trust badges ── */}
      <section className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Truck size={18} />, label: 'توصيل سريع', sub: 'لجميع المدن' },
            { icon: <ShieldCheck size={18} />, label: 'دفع آمن', sub: 'عند الاستلام' },
            { icon: <RefreshCw size={18} />, label: 'إرجاع سهل', sub: 'خلال 7 أيام' },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 px-3 py-3 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-purple-600" style={{ background: '#f3eeff' }}>{b.icon}</div>
              <div><p className="text-xs font-bold text-gray-800">{b.label}</p><p className="text-xs text-gray-400">{b.sub}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Cooperatives row ── */}
      {orgs.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-gray-900">التعاونيات</h2>
            <span className="text-xs text-gray-400">{orgs.length} تعاونية</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {orgs.map(o => (
              <button key={o.id} onClick={() => setSelOrg(o.id === selOrg ? '' : o.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border transition-all min-w-[90px] ${selOrg === o.id ? 'border-purple-400 shadow-md' : 'bg-white border-gray-200 hover:border-purple-200'}`}
                style={selOrg === o.id ? { background: '#f3eeff' } : { background: 'white' }}>
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {o.logo ? <img src={o.logo} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">🏛️</span>}
                </div>
                <p className="text-xs font-medium text-gray-700 text-center leading-tight line-clamp-2">{o.nameAr || o.name}</p>
                {o.cityAr && <p className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin size={9} />{o.cityAr}</p>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 6. All Products ── */}
      <section id="all-products" className="max-w-7xl mx-auto px-4 mt-8 pb-16">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-gray-900 text-lg">
              {selCat || selOrg ? (selCat || orgs.find(o => o.id === selOrg)?.nameAr || 'المنتجات') : 'جميع المنتجات'}
            </h2>
            <p className="text-xs text-gray-400">{filtered.length} منتج</p>
          </div>
          {(selCat || selOrg || search) && (
            <button onClick={() => { setSelCat(''); setSelOrg(''); setSearch(''); }} className="text-xs text-purple-600 flex items-center gap-1">
              <X size={12} />مسح الفلاتر
            </button>
          )}
        </div>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-200" />
                <div className="p-3 space-y-2"><div className="h-3 bg-gray-200 rounded w-3/4" /><div className="h-4 bg-gray-100 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package size={52} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>

      {/* ── Product detail modal ── */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50" onClick={() => setDetail(null)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative w-full h-56 bg-gray-100">
              {detailProduct.imageUrl
                ? <img src={detailProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
                    <span className="text-7xl">{CATEGORY_ICONS[detailProduct.category || ''] || '📦'}</span>
                  </div>}
              <button onClick={() => setDetail(null)} className="absolute top-3 left-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-gray-600 shadow"><X size={16} /></button>
            </div>
            <div className="p-5">
              <p className="text-xs text-purple-600 font-medium mb-1">{detailProduct.organization.nameAr || detailProduct.organization.name}{detailProduct.organization.cityAr ? ` · ${detailProduct.organization.cityAr}` : ''}</p>
              <h2 className="font-black text-gray-900 text-xl mb-1">{detailProduct.nameAr || detailProduct.name}</h2>
              {detailProduct.description && <p className="text-sm text-gray-500 mb-3">{detailProduct.description}</p>}
              <div className="flex items-center justify-between mb-4">
                <div><span className="text-3xl font-black text-purple-700">{detailProduct.sellingPrice}</span><span className="text-gray-500 mr-1">درهم / {detailProduct.unit}</span></div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${detailProduct.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {detailProduct.stock > 0 ? `متوفر: ${detailProduct.stock}` : 'نفد'}
                </span>
              </div>
              {detailProduct.stock > 0 && (
                <PurpleBtn full label="+ إضافة للسلة" onClick={() => { addToCart(detailProduct); setDetail(null); }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Cart drawer ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-full max-w-sm bg-white flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-black text-gray-900 flex items-center gap-2"><ShoppingCart size={18} className="text-purple-600" />سلة التسوق ({cartCount})</h2>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-gray-400"><ShoppingCart size={40} className="mx-auto mb-3 opacity-20" /><p>السلة فارغة</p></div>
              ) : cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-14 h-14 rounded-xl bg-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.product.imageUrl ? <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">📦</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.product.nameAr || item.product.name}</p>
                    <p className="text-xs text-purple-600 font-medium">{item.product.sellingPrice} درهم</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => changeQty(item.product.id, -1)} className="w-7 h-7 rounded-full border border-gray-200 hover:border-purple-400 flex items-center justify-center"><Minus size={12} /></button>
                    <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                    <button onClick={() => changeQty(item.product.id, 1)} className="w-7 h-7 rounded-full border border-gray-200 hover:border-purple-400 flex items-center justify-center"><Plus size={12} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-400 mr-1"><X size={14} /></button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-100 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{cartCount} منتج</span>
                  <span className="font-black text-gray-900 text-base">{cartTotal.toFixed(2)} درهم</span>
                </div>
                <PurpleBtn full label="إتمام الطلب →" onClick={() => { setCartOpen(false); setCheckout(true); }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Checkout modal ── */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50" dir="rtl">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-black text-gray-900">تأكيد الطلب</h2>
              <button onClick={() => setCheckout(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {[
                { label: 'الاسم الكامل *', key: 'clientName', placeholder: 'محمد الأمين...', type: 'text' },
                { label: 'رقم الهاتف *', key: 'clientPhone', placeholder: '06XXXXXXXX', type: 'tel' },
                { label: 'عنوان التسليم', key: 'clientAddress', placeholder: 'المدينة، الحي...', type: 'text' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 block mb-1.5 font-medium">{f.label}</label>
                  <input value={(orderForm as any)[f.key]} onChange={e => setOrderForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} type={f.type}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
                </div>
              ))}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between items-center px-4 py-2.5 text-sm border-b border-gray-50 last:border-0">
                    <span className="text-gray-700">{item.product.nameAr || item.product.name} × {item.quantity}</span>
                    <span className="font-bold text-purple-600">{(item.product.sellingPrice * item.quantity).toFixed(2)} درهم</span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-4 py-3 bg-gray-50 font-black">
                  <span>المجموع</span><span className="text-purple-700 text-base">{cartTotal.toFixed(2)} درهم</span>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
                <span>💵</span><span>الدفع عند الاستلام — سيتواصل معك المورد لتأكيد الطلب</span>
              </div>
              {orderError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{orderError}</p>}
            </div>
            <div className="p-5 border-t border-gray-100">
              <button onClick={handlePlaceOrder} disabled={placing}
                className="w-full py-3.5 text-white font-bold rounded-xl text-base transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                {placing ? '⏳ جاري الإرسال...' : '✅ تأكيد الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order success modal ── */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4"><span className="text-3xl">✅</span></div>
              <h2 className="font-black text-gray-900 text-xl mb-1">تم إرسال طلبك!</h2>
              <p className="text-gray-500 text-sm mb-4">سيتواصل معك المورد قريباً لتأكيد التسليم</p>
              <div className="bg-purple-50 rounded-xl px-4 py-3 mb-5">
                <p className="text-xs text-purple-500 mb-0.5">رقم طلبك</p>
                <p className="font-black text-purple-700 text-2xl tracking-wider">{orderSuccess}</p>
              </div>
              <div className="flex flex-col gap-2">
                <a href={`/store/track/${orderSuccess}`}
                  className="w-full py-3 text-white font-bold rounded-xl text-sm text-center block"
                  style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                  تتبع طلبك →
                </a>
                <button onClick={() => setSuccess(null)} className="w-full py-3 text-gray-500 font-medium rounded-xl text-sm border border-gray-200 hover:bg-gray-50">
                  متابعة التسوق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-white mt-0 py-10 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{ background: 'linear-gradient(135deg,#6c3fc5,#a78bfa)' }}><Package size={14} /></div>
              <span className="font-black">معرضنا</span>
            </div>
            <p className="text-sm text-gray-400">منصة التسوق من التعاونيات المغربية الأصيلة. جودة عالية وأسعار مناسبة.</p>
          </div>
          <div>
            <p className="font-bold mb-3 text-sm">روابط سريعة</p>
            <div className="space-y-2 text-sm text-gray-400">
              <p className="hover:text-white cursor-pointer" onClick={() => window.scrollTo(0, 0)}>الرئيسية</p>
              <p className="hover:text-white cursor-pointer" onClick={() => document.getElementById('all-products')?.scrollIntoView({ behavior: 'smooth' })}>المنتجات</p>
              <a href="/store/track" className="block hover:text-white">تتبع طلبي</a>
            </div>
          </div>
          <div>
            <p className="font-bold mb-3 text-sm">تواصل معنا</p>
            <p className="text-sm text-gray-400">ma3ridona.ma</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
          © 2025 معرضنا · جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/pages/store/StorePage.tsx
git commit -m "feat(store): rewrite as Ma3ridona — category grid, flash banner, best-sellers, bundles, rename"
```

---

## Task 5 — Schema: StoreBundle + StoreBundleItem

**Files:**
- Modify: `mar-eac/backend/prisma/schema.prisma`

- [ ] **Step 1: Add models after `CommerceOrderProfit`**

Find the `model CommerceOrderProfit` block and add after it:

```prisma
model StoreBundle {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  nameAr      String?
  description String?
  bundlePrice Float
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  items       StoreBundleItem[]
}

model StoreBundleItem {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  bundleId  String   @db.ObjectId
  productId String   @db.ObjectId
  quantity  Int      @default(1)
  bundle    StoreBundle     @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  product   CommerceProduct @relation(fields: [productId], references: [id], onDelete: NoAction, onUpdate: NoAction)
}
```

Also add to `CommerceProduct` model (after `orderItems CommerceOrderItem[]`):
```prisma
  bundleItems StoreBundleItem[]
```

- [ ] **Step 2: Push schema + regenerate client**

```bash
cd /Users/mac/Documents/jm3iat/mar-eac/backend
npx prisma db push
npx prisma generate
# Expected: "Your database is now in sync with your Prisma schema"
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/backend/prisma/schema.prisma
git commit -m "feat(schema): add StoreBundle + StoreBundleItem models"
```

---

## Task 6 — Backend: Bundle CRUD

**Files:**
- Modify: `mar-eac/backend/src/modules/store/store.controller.js`
- Modify: `mar-eac/backend/src/modules/store/store.routes.js`

- [ ] **Step 1: Add bundle handlers to store.controller.js**

Add after `getBestSellers`:

```js
// GET /api/store/bundles  — public
const getBundles = async (req, res) => {
  try {
    const bundles = await prisma.storeBundle.findMany({
      where: { isActive: true },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, nameAr: true, sellingPrice: true, imageUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(bundles);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/store/bundles  — super admin only
const createBundle = async (req, res) => {
  try {
    const { name, nameAr, description, bundlePrice, isActive = true, items } = req.body;
    if (!name || !bundlePrice || !items?.length) {
      return res.status(400).json({ message: 'name, bundlePrice, items are required' });
    }
    const bundle = await prisma.storeBundle.create({
      data: {
        name, nameAr, description,
        bundlePrice: parseFloat(bundlePrice),
        isActive,
        items: {
          create: items.map(i => ({ productId: i.productId, quantity: i.quantity || 1 })),
        },
      },
      include: { items: { include: { product: { select: { name: true, nameAr: true, sellingPrice: true } } } } },
    });
    res.status(201).json(bundle);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/store/bundles/:id  — super admin only
const updateBundle = async (req, res) => {
  try {
    const { name, nameAr, description, bundlePrice, isActive, items } = req.body;
    // Delete old items and recreate
    await prisma.storeBundleItem.deleteMany({ where: { bundleId: req.params.id } });
    const bundle = await prisma.storeBundle.update({
      where: { id: req.params.id },
      data: {
        name, nameAr, description,
        bundlePrice: parseFloat(bundlePrice),
        isActive,
        items: items?.length ? { create: items.map(i => ({ productId: i.productId, quantity: i.quantity || 1 })) } : undefined,
      },
      include: { items: { include: { product: { select: { name: true, nameAr: true, sellingPrice: true } } } } },
    });
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/store/bundles/:id  — super admin only
const deleteBundle = async (req, res) => {
  try {
    await prisma.storeBundle.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

Update `module.exports`:
```js
module.exports = { getStoreProducts, getStoreProduct, getStoreOrgs, getStoreCategories, placeStoreOrder, getOrderStatus, getBestSellers, getBundles, createBundle, updateBundle, deleteBundle };
```

- [ ] **Step 2: Update store.routes.js**

```js
const router  = require('express').Router();
const ctrl    = require('./store.controller');
const { auth }        = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

// Public routes
router.get('/products',              ctrl.getStoreProducts);
router.get('/products/:id',          ctrl.getStoreProduct);
router.get('/orgs',                  ctrl.getStoreOrgs);
router.get('/categories',            ctrl.getStoreCategories);
router.get('/best-sellers',          ctrl.getBestSellers);
router.get('/bundles',               ctrl.getBundles);
router.get('/orders/:orderNumber',   ctrl.getOrderStatus);
router.post('/orders',               ctrl.placeStoreOrder);

// Protected — super admin only
router.post  ('/bundles',     auth, requireRole('SUPER_ADMIN'), ctrl.createBundle);
router.put   ('/bundles/:id', auth, requireRole('SUPER_ADMIN'), ctrl.updateBundle);
router.delete('/bundles/:id', auth, requireRole('SUPER_ADMIN'), ctrl.deleteBundle);

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/backend/src/modules/store/store.controller.js mar-eac/backend/src/modules/store/store.routes.js
git commit -m "feat(store): add bundle CRUD endpoints (public GET, superadmin POST/PUT/DELETE)"
```

---

## Task 7 — FulfillmentTab.tsx

**Files:**
- Create: `mar-eac/frontend/src/pages/superadmin/tabs/FulfillmentTab.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Package, Truck, DollarSign, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '../../../lib/api';

interface FOrder {
  id: string; orderNumber: string; clientName: string; clientPhone?: string;
  clientAddress?: string; totalAmount: number; status: string;
  trackingNumber?: string; carrier?: string; orderDate: string;
  organization: { name: string; nameAr?: string };
  items: { quantity: number; unitPrice: number; product: { name: string; nameAr?: string } }[];
}
interface StockAlert {
  id: string; name: string; nameAr?: string; stock: number;
  organization: { name: string; nameAr?: string };
}

const STATUS_COLS = [
  { key: 'PENDING',   label: 'انتظار',     bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   dot: '#f59e0b' },
  { key: 'CONFIRMED', label: 'تأكّد',       bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800',    dot: '#3b82f6' },
  { key: 'SHIPPED',   label: 'في الطريق',  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', dot: '#10b981' },
  { key: 'DELIVERED', label: 'وصل',         bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-800',  dot: '#8b5cf6' },
];

const NEXT: Record<string, string> = { PENDING: 'CONFIRMED', CONFIRMED: 'SHIPPED', SHIPPED: 'DELIVERED' };

export function FulfillmentTab() {
  const [orders, setOrders]         = useState<FOrder[]>([]);
  const [alerts, setAlerts]         = useState<StockAlert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState<FOrder | null>(null);
  const [trackInput, setTrackInput] = useState('');
  const [updating, setUpdating]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, alertsRes] = await Promise.all([
        api.get('/fulfillment/orders'),
        api.get('/fulfillment/stock-alerts'),
      ]);
      setOrders(ordersRes.data);
      setAlerts(alertsRes.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toDateString();
  const todayOrders   = orders.filter(o => new Date(o.orderDate).toDateString() === today);
  const pendingCount  = orders.filter(o => o.status === 'PENDING').length;
  const shippedCount  = orders.filter(o => o.status === 'SHIPPED').length;
  const todayRevenue  = todayOrders.reduce((s, o) => s + o.totalAmount, 0);

  const advanceStatus = async (order: FOrder, trackingNumber?: string) => {
    const next = NEXT[order.status];
    if (!next) return;
    setUpdating(true);
    try {
      await api.patch(`/fulfillment/orders/${order.id}`, { status: next, trackingNumber: trackingNumber || undefined });
      await load();
      setSelected(null);
    } finally { setUpdating(false); }
  };

  const bulkConfirm = async () => {
    const pending = orders.filter(o => o.status === 'PENDING');
    setUpdating(true);
    try {
      await Promise.all(pending.map(o => api.patch(`/fulfillment/orders/${o.id}`, { status: 'CONFIRMED' })));
      await load();
    } finally { setUpdating(false); }
  };

  const exportCsv = () => {
    const rows = [
      ['رقم الطلب', 'العميل', 'الهاتف', 'التعاونية', 'المبلغ', 'الحالة', 'التاريخ'],
      ...orders.map(o => [o.orderNumber, o.clientName, o.clientPhone || '', o.organization.nameAr || o.organization.name, o.totalAmount, o.status, o.orderDate]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `ma3ridona-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><RefreshCw size={24} className="animate-spin" /></div>;

  return (
    <div className="space-y-6" dir="rtl">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Package size={20} className="text-purple-600" />, label: 'طلبات اليوم', value: todayOrders.length, bg: 'bg-purple-50' },
          { icon: <Clock size={20} className="text-amber-600" />, label: 'في الانتظار', value: pendingCount, bg: 'bg-amber-50' },
          { icon: <DollarSign size={20} className="text-emerald-600" />, label: 'رقم اليوم د.م', value: `${todayRevenue.toFixed(0)}`, bg: 'bg-emerald-50' },
          { icon: <Truck size={20} className="text-blue-600" />, label: 'في التوصيل', value: shippedCount, bg: 'bg-blue-50' },
        ].map((k, i) => (
          <div key={i} className={`${k.bg} rounded-2xl p-4 flex items-center gap-3`}>
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">{k.icon}</div>
            <div><p className="text-2xl font-black text-gray-900">{k.value}</p><p className="text-xs text-gray-500">{k.label}</p></div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={bulkConfirm} disabled={updating || pendingCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors">
          <Package size={16} />تأكيد كل الانتظار ({pendingCount})
        </button>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          📊 تصدير CSV
        </button>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
          <RefreshCw size={16} />تحديث
        </button>
      </div>

      {/* Kanban */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3">📦 Pipeline الطلبات</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATUS_COLS.map(col => {
            const colOrders = orders.filter(o => o.status === col.key);
            return (
              <div key={col.key} className={`${col.bg} border ${col.border} rounded-2xl p-3`}>
                <div className={`text-xs font-bold ${col.text} mb-3 flex items-center justify-between`}>
                  <span>{col.label}</span>
                  <span className="bg-white rounded-full px-2 py-0.5 font-black">{colOrders.length}</span>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {colOrders.map(o => (
                    <div key={o.id} onClick={() => { setSelected(o); setTrackInput(o.trackingNumber || ''); }}
                      className="bg-white rounded-xl p-3 cursor-pointer hover:shadow-md transition-shadow border border-white hover:border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black text-gray-900">{o.orderNumber}</span>
                        <span className="text-xs text-gray-400">{new Date(o.orderDate).toLocaleDateString('ar-MA')}</span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{o.clientName}</p>
                      <p className="text-xs font-bold text-purple-600 mt-1">{o.totalAmount.toFixed(0)} د.م</p>
                      <p className="text-xs text-gray-400 truncate">{o.organization.nameAr || o.organization.name}</p>
                    </div>
                  ))}
                  {colOrders.length === 0 && <p className="text-xs text-gray-400 text-center py-4">لا توجد طلبات</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" />تنبيهات المخزون</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.map(a => (
              <div key={a.id} className={`flex items-center gap-3 rounded-xl p-3 border ${a.stock <= 3 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                <span className="text-2xl">📦</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{a.nameAr || a.name}</p>
                  <p className="text-xs text-gray-500">{a.organization.nameAr || a.organization.name}</p>
                </div>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${a.stock <= 3 ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                  باقي {a.stock}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order detail slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-sm bg-white flex flex-col shadow-2xl overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-black text-gray-900">{selected.orderNumber}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="p-4 space-y-4 flex-1">
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">العميل:</span> <span className="font-medium">{selected.clientName}</span></p>
                {selected.clientPhone && <p><span className="text-gray-500">الهاتف:</span> <a href={`tel:${selected.clientPhone}`} className="text-purple-600 font-medium">{selected.clientPhone}</a></p>}
                {selected.clientAddress && <p><span className="text-gray-500">العنوان:</span> <span className="font-medium">{selected.clientAddress}</span></p>}
                <p><span className="text-gray-500">التعاونية:</span> <span className="font-medium">{selected.organization.nameAr || selected.organization.name}</span></p>
              </div>
              <div className="border rounded-xl overflow-hidden">
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between px-3 py-2 text-sm border-b last:border-0">
                    <span>{item.product.nameAr || item.product.name} × {item.quantity}</span>
                    <span className="font-bold text-purple-600">{(item.unitPrice * item.quantity).toFixed(0)} د.م</span>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 bg-gray-50 font-black text-sm">
                  <span>المجموع</span><span className="text-purple-700">{selected.totalAmount.toFixed(0)} د.م</span>
                </div>
              </div>
              {selected.status === 'CONFIRMED' && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">رقم التتبع (اختياري)</label>
                  <input value={trackInput} onChange={e => setTrackInput(e.target.value)}
                    placeholder="AMEX-XXXX..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                </div>
              )}
            </div>
            <div className="p-4 border-t space-y-2">
              {NEXT[selected.status] && (
                <button onClick={() => advanceStatus(selected, trackInput || undefined)} disabled={updating}
                  className="w-full py-3 text-white font-bold rounded-xl text-sm disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                  {updating ? '...' : `تحديث إلى: ${STATUS_COLS.find(c => c.key === NEXT[selected.status])?.label}`}
                </button>
              )}
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
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/pages/superadmin/tabs/FulfillmentTab.tsx
git commit -m "feat(superadmin): add FulfillmentTab — order kanban, KPIs, stock alerts"
```

---

## Task 8 — Backend: Fulfillment API routes

**Files:**
- Create: `mar-eac/backend/src/modules/fulfillment/fulfillment.controller.js`
- Create: `mar-eac/backend/src/modules/fulfillment/fulfillment.routes.js`
- Modify: `mar-eac/backend/src/server.js`

- [ ] **Step 1: Create fulfillment.controller.js**

```js
const prisma = require('../../config/database');

// GET /api/fulfillment/orders — all STORE orders, newest first
const getOrders = async (req, res) => {
  try {
    const orders = await prisma.commerceOrder.findMany({
      where: { source: 'STORE' },
      include: {
        organization: { select: { name: true, nameAr: true } },
        items: {
          include: { product: { select: { name: true, nameAr: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/fulfillment/orders/:id — update status + optional trackingNumber
const updateOrder = async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const data = {};
    if (status) data.status = status;
    if (trackingNumber) data.trackingNumber = trackingNumber;
    if (status === 'SHIPPED') data.shippedAt = new Date();
    if (status === 'DELIVERED') data.deliveredAt = new Date();
    const order = await prisma.commerceOrder.update({ where: { id: req.params.id }, data });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/fulfillment/stock-alerts — products with stock <= 10
const getStockAlerts = async (req, res) => {
  try {
    const products = await prisma.commerceProduct.findMany({
      where: { isActive: true, organization: { modules: { has: 'COMMERCE' } } },
      select: {
        id: true, name: true, nameAr: true,
        organization: { select: { name: true, nameAr: true } },
        stockMovements: { select: { type: true, quantity: true } },
      },
    });
    const alerts = products
      .map(p => {
        const stock = p.stockMovements.reduce((s, m) => {
          if (m.type === 'IN' || m.type === 'RETURN') return s + m.quantity;
          if (m.type === 'OUT') return s - m.quantity;
          if (m.type === 'ADJUST') return m.quantity;
          return s;
        }, 0);
        const { stockMovements, ...rest } = p;
        return { ...rest, stock };
      })
      .filter(p => p.stock <= 10)
      .sort((a, b) => a.stock - b.stock);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getOrders, updateOrder, getStockAlerts };
```

- [ ] **Step 2: Create fulfillment.routes.js**

```js
const router = require('express').Router();
const ctrl   = require('./fulfillment.controller');
const { auth }        = require('../../middleware/auth');
const { requireRole } = require('../../middleware/roles');

router.use(auth, requireRole('SUPER_ADMIN'));

router.get   ('/orders',          ctrl.getOrders);
router.patch ('/orders/:id',      ctrl.updateOrder);
router.get   ('/stock-alerts',    ctrl.getStockAlerts);

module.exports = router;
```

- [ ] **Step 3: Register in server.js**

Find the section where routes are registered (look for `app.use('/api/store'`) and add:

```js
app.use('/api/fulfillment', require('./modules/fulfillment/fulfillment.routes'));
```

- [ ] **Step 4: Test**

```bash
# Login as super admin, get token, then:
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/fulfillment/orders
# Expected: [] or array of store orders

curl -H "Authorization: Bearer <token>" http://localhost:3001/api/fulfillment/stock-alerts
# Expected: array of products with stock <= 10
```

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/backend/src/modules/fulfillment/
git commit -m "feat(fulfillment): add GET /orders, PATCH /orders/:id, GET /stock-alerts endpoints"
```

---

## Task 9 — BundlesTab.tsx

**Files:**
- Create: `mar-eac/frontend/src/pages/superadmin/tabs/BundlesTab.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { bundleApi, api } from '../../../lib/api';

interface BundleProduct { id: string; name: string; nameAr?: string; sellingPrice: number; organizationId: string; organization: { nameAr?: string; name: string } }
interface BundleItem { productId: string; quantity: number; product: { name: string; nameAr?: string; sellingPrice: number } }
interface Bundle { id: string; name: string; nameAr?: string; bundlePrice: number; isActive: boolean; items: BundleItem[] }

const emptyForm = () => ({ name: '', nameAr: '', bundlePrice: '', isActive: true, items: [] as { productId: string; quantity: number }[] });

export function BundlesTab() {
  const [bundles, setBundles]       = useState<Bundle[]>([]);
  const [products, setProducts]     = useState<BundleProduct[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState<Bundle | null>(null);
  const [form, setForm]             = useState(emptyForm());
  const [saving, setSaving]         = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [b, p] = await Promise.all([
      bundleApi.list(),
      api.get('/store/products?all=true').catch(() => api.get('/store/products')),
    ]);
    setBundles(b.data);
    setProducts(p.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true); };
  const openEdit   = (b: Bundle) => {
    setEditing(b);
    setForm({ name: b.name, nameAr: b.nameAr || '', bundlePrice: String(b.bundlePrice), isActive: b.isActive, items: b.items.map(i => ({ productId: i.productId, quantity: i.quantity })) });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.bundlePrice || !form.items.length) return;
    setSaving(true);
    try {
      if (editing) await bundleApi.update(editing.id, form);
      else await bundleApi.create(form);
      await load();
      setShowModal(false);
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('حذف هذه الباقة؟')) return;
    await bundleApi.remove(id);
    await load();
  };

  const toggleItem = (productId: string) => {
    setForm(f => {
      const exists = f.items.find(i => i.productId === productId);
      return { ...f, items: exists ? f.items.filter(i => i.productId !== productId) : [...f.items, { productId, quantity: 1 }] };
    });
  };

  const filteredProducts = products.filter(p =>
    !productSearch || (p.nameAr || p.name).toLowerCase().includes(productSearch.toLowerCase())
  );

  const formTotal = form.items.reduce((s, i) => {
    const p = products.find(p => p.id === i.productId);
    return s + (p ? p.sellingPrice * i.quantity : 0);
  }, 0);

  if (loading) return <div className="text-center py-12 text-gray-400">جاري التحميل...</div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">🎁 الباقات</h2>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
          <Plus size={16} />إضافة باقة
        </button>
      </div>

      {bundles.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">🎁</span>
          <p>لا توجد باقات بعد — أضف باقتك الأولى</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bundles.map(b => {
            const originalTotal = b.items.reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0);
            const discount = originalTotal > 0 ? Math.round((1 - b.bundlePrice / originalTotal) * 100) : 0;
            return (
              <div key={b.id} className={`bg-white border-2 rounded-2xl p-4 ${b.isActive ? 'border-purple-200' : 'border-gray-200 opacity-60'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-black text-gray-900">{b.nameAr || b.name}</p>
                    <p className="text-xs text-gray-400">{b.items.length} منتجات</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(b)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"><Edit2 size={12} /></button>
                    <button onClick={() => remove(b.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 text-red-500"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mb-2">{b.items.map(i => i.product.nameAr || i.product.name).join(' · ')}</div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-purple-700">{b.bundlePrice} د.م</span>
                    {discount > 0 && <span className="mr-2 text-xs text-emerald-600">وفّر {discount}%</span>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {b.isActive ? 'نشط' : 'معطّل'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-black text-gray-900">{editing ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">الاسم (عربي) *</label>
                  <input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value, name: f.name || e.target.value }))}
                    placeholder="باقة الطبيعة المغربية" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">الاسم (فرنسي)</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Pack Nature Marocaine" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">سعر الباقة (د.م) *</label>
                <input type="number" value={form.bundlePrice} onChange={e => setForm(f => ({ ...f, bundlePrice: e.target.value }))}
                  placeholder="280"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400" />
                {formTotal > 0 && Number(form.bundlePrice) > 0 && (
                  <p className="text-xs text-emerald-600 mt-1">
                    مجموع المنتجات: {formTotal} د.م — خصم {Math.round((1 - Number(form.bundlePrice) / formTotal) * 100)}%
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-2">المنتجات *</label>
                <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                  placeholder="ابحث عن منتج..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400 mb-2" />
                <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
                  {filteredProducts.map(p => {
                    const selected = form.items.some(i => i.productId === p.id);
                    return (
                      <div key={p.id} onClick={() => toggleItem(p.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${selected ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'}`}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.nameAr || p.name}</p>
                          <p className="text-xs text-gray-400">{p.organization.nameAr || p.organization.name} · {p.sellingPrice} د.م</p>
                        </div>
                        {selected && <Check size={16} className="text-purple-600 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-1">{form.items.length} منتجات محددة</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">نشط (يظهر في المتجر)</span>
              </label>
            </div>
            <div className="p-4 border-t">
              <button onClick={save} disabled={saving || !form.nameAr || !form.bundlePrice || !form.items.length}
                className="w-full py-3 text-white font-bold rounded-xl text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                {saving ? '...' : editing ? 'حفظ التعديلات' : 'إنشاء الباقة'}
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
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/pages/superadmin/tabs/BundlesTab.tsx
git commit -m "feat(superadmin): add BundlesTab — bundle CRUD with product picker"
```

---

## Task 10 — Register new tabs in SuperAdminPage

**Files:**
- Modify: `mar-eac/frontend/src/pages/superadmin/SuperAdminPage.tsx`

- [ ] **Step 1: Add imports**

After the existing tab imports, add:
```tsx
import { FulfillmentTab } from './tabs/FulfillmentTab';
import { BundlesTab }     from './tabs/BundlesTab';
```

- [ ] **Step 2: Update ActiveTab type**

Find:
```tsx
type ActiveTab =
  | 'dashboard' | 'orgs' | 'subscriptions' | 'payments' | 'users'
  | 'packs' | 'analytics' | 'usage' | 'marketing' | 'automation'
  | 'promos' | 'insights' | 'settings';
```

Replace with:
```tsx
type ActiveTab =
  | 'dashboard' | 'orgs' | 'subscriptions' | 'payments' | 'users'
  | 'packs' | 'analytics' | 'usage' | 'marketing' | 'automation'
  | 'promos' | 'insights' | 'settings'
  | 'fulfillment' | 'bundles';
```

- [ ] **Step 3: Add to valid tabs array**

Find:
```tsx
const valid: ActiveTab[] = ['dashboard','orgs','subscriptions','payments','users','packs','analytics','usage','marketing','automation','promos','insights','settings'];
```

Replace with:
```tsx
const valid: ActiveTab[] = ['dashboard','orgs','subscriptions','payments','users','packs','analytics','usage','marketing','automation','promos','insights','settings','fulfillment','bundles'];
```

- [ ] **Step 4: Add tab group for Ma3ridona**

Find the tabs groups array (the section that has `labelAr: 'الإعدادات'`) and add a new group before it:

```tsx
    {
      labelAr: 'معرضنا',
      labelFr: 'Ma3ridona',
      tabs: [
        { key: 'fulfillment', iconEl: <Truck size={15} />,   labelFr: 'Fulfillment',  labelAr: 'الفولفيلمنت' },
        { key: 'bundles',     iconEl: <Package size={15} />, labelFr: 'Packs Produits', labelAr: 'باقات المنتجات' },
      ],
    },
```

You'll need to import `Truck` from lucide-react if not already imported.

- [ ] **Step 5: Register tab content**

After the last `{activeTab === 'settings' && <SettingsTab />}` line, add:
```tsx
{activeTab === 'fulfillment' && <FulfillmentTab />}
{activeTab === 'bundles'     && <BundlesTab />}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Documents/jm3iat && git add mar-eac/frontend/src/pages/superadmin/SuperAdminPage.tsx
git commit -m "feat(superadmin): register Fulfillment and Bundles tabs under Ma3ridona group"
```

---

## Task 11 — Push and verify

- [ ] **Step 1: Push all commits**

```bash
cd /Users/mac/Documents/jm3iat && git push
```

- [ ] **Step 2: Run seed on production (if Railway)**

```bash
# Via Railway CLI or dashboard: run seed
railway run node prisma/seed.js
# or trigger a deploy (seed runs on start)
```

- [ ] **Step 3: Verify store URL works**

Open `/store` — should show:
- ✅ Flash countdown banner (red/orange)
- ✅ Category grid (8 tiles, always visible)
- ✅ Packs section (empty until bundles created)
- ✅ Best sellers (empty until orders exist)
- ✅ 6 demo products (after seed runs)
- ✅ "معرضنا" name throughout

---

## Self-Review

**Spec coverage:**
- ✅ Rename to معرضنا — Task 4
- ✅ Category grid always visible — Task 4 (hardcoded CATEGORY_CARDS)
- ✅ Flash countdown banner — Task 4
- ✅ Best sellers sorted by sold quantity — Tasks 2 + 4
- ✅ Urgency "باقي N" badge when stock ≤ 5 — Task 4
- ✅ 6 mock products in seed — Task 1
- ✅ Bundles in store — Tasks 5, 6, 4
- ✅ Fulfillment dashboard KPIs — Task 7
- ✅ Kanban pipeline — Task 7
- ✅ Stock alerts — Tasks 7, 8
- ✅ Bundle builder UI — Task 9
- ✅ SuperAdmin tab registration — Task 10

**Placeholder scan:** No TBDs. All code blocks are complete.

**Type consistency:**
- `Bundle.items[].product` includes `sellingPrice` — used in discount calculation ✅
- `FOrder` interface matches what `GET /api/fulfillment/orders` returns (includes `items` with `product`) ✅
- `bundleApi` uses `api` (authenticated) not `publicApi2` — correct for admin CRUD ✅
- `storeApi.getBundles` uses `publicApi2` — correct for public display ✅
