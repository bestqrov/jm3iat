# Store UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add order tracking page, WhatsApp confirmation on order placement, and a "track your order" CTA after checkout — so customers can follow their order without calling the coop.

**Architecture:** All changes are additive — one new public backend endpoint, one new frontend page, and a non-blocking WhatsApp notification injected into the existing `placeStoreOrder` handler. The tracking page is public (no auth), reachable at `/store/track/:orderNumber`. WhatsApp uses the same `sendWA` pattern already used in members/requests modules.

**Tech Stack:** Node.js/Express + Prisma (backend), React + TypeScript + TailwindCSS (frontend), Evolution API (WhatsApp), React Router v6

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/modules/store/store.controller.js` | Modify | Add `getOrderStatus` + inject WhatsApp notification in `placeStoreOrder` |
| `backend/src/modules/store/store.routes.js` | Modify | Register `GET /orders/:orderNumber` |
| `frontend/src/lib/api.ts` | Modify | Add `trackOrder` to `storeApi` |
| `frontend/src/pages/store/StoreTrackPage.tsx` | Create | Public order tracking page |
| `frontend/src/App.tsx` | Modify | Register `/store/track/:orderNumber?` route |
| `frontend/src/pages/store/StorePage.tsx` | Modify | Post-order success modal shows order number + "track" button; add tracking mini-form in footer |

---

## Task 1 — Backend: Order tracking endpoint

**Files:**
- Modify: `backend/src/modules/store/store.controller.js`
- Modify: `backend/src/modules/store/store.routes.js`

- [ ] **Step 1: Add `getOrderStatus` to store.controller.js**

Add this function after `placeStoreOrder` (before `module.exports`):

```js
// GET /api/store/orders/:orderNumber
const getOrderStatus = async (req, res) => {
  try {
    const order = await prisma.commerceOrder.findFirst({
      where: { orderNumber: req.params.orderNumber },
      select: {
        orderNumber: true,
        clientName: true,
        clientPhone: true,
        status: true,
        paymentStatus: true,
        totalAmount: true,
        trackingNumber: true,
        carrier: true,
        orderDate: true,
        shippedAt: true,
        deliveredAt: true,
        organization: { select: { name: true, nameAr: true, phone: true, cityAr: true } },
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            subtotal: true,
            product: { select: { name: true, nameAr: true, imageUrl: true } },
          },
        },
      },
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
```

Update `module.exports` at the bottom of the file:
```js
module.exports = { getStoreProducts, getStoreProduct, getStoreOrgs, getStoreCategories, placeStoreOrder, getOrderStatus };
```

- [ ] **Step 2: Register the route in store.routes.js**

```js
router.get('/orders/:orderNumber', ctrl.getOrderStatus);
```

Full file after change:
```js
const router = require('express').Router();
const ctrl   = require('./store.controller');

router.get('/products',              ctrl.getStoreProducts);
router.get('/products/:id',          ctrl.getStoreProduct);
router.get('/orgs',                  ctrl.getStoreOrgs);
router.get('/categories',            ctrl.getStoreCategories);
router.get('/orders/:orderNumber',   ctrl.getOrderStatus);
router.post('/orders',               ctrl.placeStoreOrder);

module.exports = router;
```

- [ ] **Step 3: Test manually**

```bash
# In one terminal, start the backend
cd mar-eac/backend && node src/server.js

# In another terminal, place a test order, then:
curl http://localhost:3001/api/store/orders/ORD-0001
# Expected: JSON with order fields, or {"message":"Order not found"} if no orders exist
```

- [ ] **Step 4: Commit**

```bash
git add mar-eac/backend/src/modules/store/store.controller.js mar-eac/backend/src/modules/store/store.routes.js
git commit -m "feat(store): add public GET /orders/:orderNumber tracking endpoint"
```

---

## Task 2 — Backend: WhatsApp confirmation on order placement

**Files:**
- Modify: `backend/src/modules/store/store.controller.js`

The pattern is copied from `requests.controller.js`. The `sendWA` function reads Evolution API config from DB/env and posts to `/message/sendText/{instance}`.

- [ ] **Step 1: Add `sendWA` helper at the top of store.controller.js**

Add after line 1 (`const prisma = ...`):

```js
const axios = require('axios');

const sendWA = async (phone, text, orgInstance) => {
  const rows = await prisma.platformSettings.findMany({
    where: { key: { in: ['evolution_api_url', 'evolution_api_key'] } },
  });
  const m = Object.fromEntries(rows.map(r => [r.key, r.value]));
  const evoUrl = m['evolution_api_url'] || process.env.EVOLUTION_API_URL || '';
  const evoKey = m['evolution_api_key'] || process.env.EVOLUTION_API_KEY || '';
  if (!evoUrl || !evoKey) return; // silently skip if not configured
  const instance = orgInstance || process.env.EVOLUTION_INSTANCE || 'main';
  return axios.post(
    `${evoUrl}/message/sendText/${instance}`,
    { number: phone.replace(/[\s\-\+]/g, ''), textMessage: { text } },
    { headers: { apikey: evoKey, 'Content-Type': 'application/json' }, timeout: 15000 }
  );
};
```

- [ ] **Step 2: Inject notifications after order creation in `placeStoreOrder`**

Find the line `res.status(201).json({ orderNumber: order.orderNumber, totalAmount: order.totalAmount });`
and replace the block from after the stock-deduction loop to that line with:

```js
    // WhatsApp: notify client
    if (clientPhone) {
      const clientMsg =
        `✅ وصل طلبك!\n` +
        `رقم الطلب: ${order.orderNumber}\n` +
        `المبلغ: ${order.totalAmount.toFixed(2)} درهم\n` +
        `الدفع: عند الاستلام\n` +
        `سيتواصل معك المورد لتأكيد التسليم.`;
      sendWA(clientPhone, clientMsg, null).catch(() => {});
    }

    // WhatsApp: notify cooperative
    const orgWa = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { phone: true, evolutionInstance: true },
    });
    if (orgWa?.phone) {
      const orgMsg =
        `🛒 طلب جديد من المتجر!\n` +
        `رقم الطلب: ${order.orderNumber}\n` +
        `العميل: ${clientName}\n` +
        `الهاتف: ${clientPhone || '-'}\n` +
        `المبلغ: ${order.totalAmount.toFixed(2)} درهم`;
      sendWA(orgWa.phone, orgMsg, orgWa.evolutionInstance).catch(() => {});
    }

    res.status(201).json({ orderNumber: order.orderNumber, totalAmount: order.totalAmount });
```

- [ ] **Step 3: Commit**

```bash
git add mar-eac/backend/src/modules/store/store.controller.js
git commit -m "feat(store): send WhatsApp confirmation to client and coop on order placement"
```

---

## Task 3 — Frontend: storeApi.trackOrder

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add `trackOrder` to `storeApi`**

Find the `storeApi` object (around line 616) and add one line:

```ts
export const storeApi = {
  getProducts:   (params?: any)                => publicApi2.get('/store/products', { params }),
  getProduct:    (id: string)                  => publicApi2.get(`/store/products/${id}`),
  getOrgs:       ()                            => publicApi2.get('/store/orgs'),
  getCategories: ()                            => publicApi2.get('/store/categories'),
  placeOrder:    (data: any)                   => publicApi2.post('/store/orders', data),
  trackOrder:    (orderNumber: string)         => publicApi2.get(`/store/orders/${orderNumber}`),
};
```

- [ ] **Step 2: Commit**

```bash
git add mar-eac/frontend/src/lib/api.ts
git commit -m "feat(store): add trackOrder to storeApi"
```

---

## Task 4 — Frontend: Order tracking page

**Files:**
- Create: `frontend/src/pages/store/StoreTrackPage.tsx`

This page is fully public (`/store/track/:orderNumber?`). It shows a stepper (PENDING → CONFIRMED → SHIPPED → DELIVERED) and item list.

- [ ] **Step 1: Create the file**

```tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Package, CheckCircle, Truck, MapPin, X, ChevronRight } from 'lucide-react';
import { storeApi } from '../../lib/api';

interface TrackOrder {
  orderNumber: string;
  clientName: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  trackingNumber?: string;
  carrier?: string;
  orderDate: string;
  shippedAt?: string;
  deliveredAt?: string;
  organization: { name: string; nameAr?: string; phone?: string; cityAr?: string };
  items: { quantity: number; unitPrice: number; subtotal: number; product: { name: string; nameAr?: string; imageUrl?: string } }[];
}

const STEPS = [
  { key: 'PENDING',   label: 'في الانتظار',  icon: '🕐' },
  { key: 'CONFIRMED', label: 'تم التأكيد',   icon: '✅' },
  { key: 'SHIPPED',   label: 'في الطريق',    icon: '🚚' },
  { key: 'DELIVERED', label: 'تم التسليم',   icon: '🎉' },
];

function stepIndex(status: string) {
  const i = STEPS.findIndex(s => s.key === status);
  return i === -1 ? 0 : i;
}

export function StoreTrackPage() {
  const { orderNumber: paramOrder } = useParams<{ orderNumber?: string }>();
  const navigate = useNavigate();
  const [input, setInput]   = useState(paramOrder || '');
  const [order, setOrder]   = useState<TrackOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => { if (paramOrder) handleTrack(paramOrder); }, [paramOrder]);

  const handleTrack = async (num?: string) => {
    const q = (num || input).trim().toUpperCase();
    if (!q) return;
    setLoading(true); setError(''); setOrder(null);
    try {
      const r = await storeApi.trackOrder(q);
      setOrder(r.data);
    } catch {
      setError('لم يتم العثور على الطلب. تأكد من رقم الطلب.');
    } finally { setLoading(false); }
  };

  const activeStep = order ? stepIndex(order.status) : -1;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl" style={{ fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(90deg,#6c3fc5,#8b5cf6)' }} className="text-white text-xs py-1.5 text-center">
        🚚 تتبع طلبك في أي وقت
      </div>
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/store')} className="text-gray-500 hover:text-purple-600">
            <ChevronRight size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#6c3fc5,#a78bfa)' }}>
              <Package size={16} />
            </div>
            <span className="font-black text-gray-900">تتبع الطلب</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Search bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-bold text-gray-700 mb-3">أدخل رقم الطلب</p>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTrack()}
              placeholder="مثال: ORD-0001"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
            <button
              onClick={() => handleTrack()}
              disabled={loading}
              className="px-5 py-2.5 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
              {loading ? '...' : <Search size={18} />}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1">
              <X size={12} /> {error}
            </p>
          )}
        </div>

        {/* Result */}
        {order && (
          <>
            {/* Status stepper */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="font-black text-gray-900">طلب {order.orderNumber}</p>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' :
                  order.status === 'CANCELLED' ? 'bg-red-50 text-red-500' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {STEPS.find(s => s.key === order.status)?.label || order.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-6">{order.organization.nameAr || order.organization.name}</p>

              {order.status !== 'CANCELLED' && order.status !== 'RETURNED' && (
                <div className="relative flex justify-between">
                  {/* Progress bar */}
                  <div className="absolute top-5 right-5 left-5 h-1 bg-gray-100 rounded-full z-0">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ background: 'linear-gradient(90deg,#6c3fc5,#8b5cf6)', width: `${(activeStep / (STEPS.length - 1)) * 100}%` }} />
                  </div>
                  {STEPS.map((step, i) => (
                    <div key={step.key} className="flex flex-col items-center gap-2 z-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                        i <= activeStep ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'
                      }`}>
                        {step.icon}
                      </div>
                      <p className={`text-xs font-medium text-center leading-tight ${i <= activeStep ? 'text-purple-700' : 'text-gray-400'}`}>
                        {step.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {order.trackingNumber && (
                <div className="mt-5 bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
                  <Truck size={16} className="text-purple-500" />
                  <span className="text-gray-600">رقم التتبع:</span>
                  <span className="font-bold text-gray-900">{order.trackingNumber}</span>
                  {order.carrier && <span className="text-gray-400">· {order.carrier}</span>}
                </div>
              )}
            </div>

            {/* Order items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="font-bold text-gray-800 text-sm">المنتجات</p>
              </div>
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-gray-50 last:border-0">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {item.product.imageUrl
                      ? <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xl">📦</span>}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.product.nameAr || item.product.name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × {item.unitPrice} درهم</p>
                  </div>
                  <p className="font-bold text-purple-700 text-sm">{item.subtotal.toFixed(2)} درهم</p>
                </div>
              ))}
              <div className="flex justify-between items-center px-5 py-3 bg-gray-50 font-black">
                <span className="text-gray-700">المجموع</span>
                <span className="text-purple-700">{order.totalAmount.toFixed(2)} درهم</span>
              </div>
            </div>

            {/* Coop contact */}
            {order.organization.phone && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{order.organization.nameAr || order.organization.name}</p>
                  {order.organization.cityAr && <p className="text-xs text-gray-400">{order.organization.cityAr}</p>}
                </div>
                <a href={`tel:${order.organization.phone}`}
                  className="text-xs px-4 py-2 rounded-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                  اتصل
                </a>
              </div>
            )}
          </>
        )}

        {!order && !loading && !error && (
          <div className="text-center py-16 text-gray-300">
            <Package size={56} className="mx-auto mb-3 opacity-30" />
            <p className="text-gray-400 font-medium">أدخل رقم الطلب للبحث</p>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add mar-eac/frontend/src/pages/store/StoreTrackPage.tsx
git commit -m "feat(store): add StoreTrackPage for public order tracking"
```

---

## Task 5 — Frontend: Register route + post-order UX

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/store/StorePage.tsx`

- [ ] **Step 1: Add route in App.tsx**

Find the line `<Route path="/store" element={<StorePage />} />` and add the import + route:

Add import at the top with the other store imports:
```tsx
import { StoreTrackPage } from './pages/store/StoreTrackPage';
```

Add route below the store route:
```tsx
<Route path="/store" element={<StorePage />} />
<Route path="/store/track" element={<StoreTrackPage />} />
<Route path="/store/track/:orderNumber" element={<StoreTrackPage />} />
```

- [ ] **Step 2: Improve post-order success UX in StorePage.tsx**

Find the order success toast block (currently just a slim toast at the bottom). Replace it with a proper modal:

Find this block in StorePage.tsx:
```tsx
      {/* ── Order success toast ── */}
      {orderSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-sm"
          style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
          <span>✅ تم إرسال طلبك بنجاح!</span>
          <span className="font-black">رقم: {orderSuccess}</span>
          <button onClick={() => setSuccess(null)} className="opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}
```

Replace with:
```tsx
      {/* ── Order success modal ── */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <h2 className="font-black text-gray-900 text-xl mb-1">تم إرسال طلبك!</h2>
              <p className="text-gray-500 text-sm mb-4">سيتواصل معك المورد قريباً لتأكيد التسليم</p>
              <div className="bg-purple-50 rounded-xl px-4 py-3 mb-5">
                <p className="text-xs text-purple-500 mb-0.5">رقم طلبك</p>
                <p className="font-black text-purple-700 text-2xl tracking-wider">{orderSuccess}</p>
              </div>
              <p className="text-xs text-gray-400 mb-4">احتفظ بهذا الرقم لتتبع طلبك</p>
              <div className="flex flex-col gap-2">
                <a
                  href={`/store/track/${orderSuccess}`}
                  className="w-full py-3 text-white font-bold rounded-xl text-sm text-center block"
                  style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                  تتبع طلبك →
                </a>
                <button onClick={() => setSuccess(null)}
                  className="w-full py-3 text-gray-500 font-medium rounded-xl text-sm border border-gray-200 hover:bg-gray-50">
                  متابعة التسوق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
```

- [ ] **Step 3: Add "تتبع طلبي" link in store footer**

Find the footer "روابط سريعة" section and add one link:

```tsx
              <div className="space-y-2 text-sm text-gray-400">
                <p className="hover:text-white cursor-pointer" onClick={() => window.scrollTo(0,0)}>الرئيسية</p>
                <p className="hover:text-white cursor-pointer" onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}>المنتجات</p>
                <a href="/store/track" className="block hover:text-white">تتبع طلبي</a>
              </div>
```

- [ ] **Step 4: Commit**

```bash
git add mar-eac/frontend/src/App.tsx mar-eac/frontend/src/pages/store/StorePage.tsx
git commit -m "feat(store): register track route, upgrade post-order success to modal with track CTA"
```

---

## Self-Review

**Spec coverage:**
- ✅ Order tracking endpoint `GET /store/orders/:orderNumber`
- ✅ WhatsApp confirmation to client
- ✅ WhatsApp notification to coop
- ✅ Public tracking page at `/store/track/:orderNumber`
- ✅ Post-order modal with tracking CTA
- ✅ Footer "تتبع طلبي" link
- ✅ `storeApi.trackOrder` wired up

**Placeholder scan:** No TBDs, no "implement later", all code blocks complete.

**Type consistency:** `TrackOrder` interface matches exactly what the backend `getOrderStatus` returns. `storeApi.trackOrder(orderNumber)` called with the string from URL params — matches.
