# Ma3ridona Store Redesign & Fulfillment Dashboard — Design Spec

## Business Context

Platform model: super admin onboards cooperatives who manage their products/stock via the existing dashboard. The platform (Ma3ridona / معرضنا) handles fulfillment, stock, delivery and sells cooperative products to end customers. Revenue comes from store orders only.

---

## Scope

Three deliverables, each buildable and testable independently:

1. **Store redesign** — public-facing `/store` page (conversion-optimized, "option C")
2. **Product bundle system** — super admin creates Packs (product bundles), exposed in store
3. **Fulfillment dashboard** — new tab in SuperAdmin: all orders pipeline + stock alerts

---

## 1. Store Redesign (`/store`)

### Rename
- Replace all "لخدمة نا" / "lkhdmano" occurrences in `StorePage.tsx` with **معرضنا** / **Ma3ridona**

### Page Sections (top to bottom)

**1.1 Header** (sticky)
- Logo: معرضنا + tagline "منتجات مغربية أصيلة"
- Search bar (full width on mobile)
- Cart button with badge
- Nav links: الرئيسية · المنتجات · التعاونيات · تتبع طلبي

**1.2 Flash Banner**
- Red/orange gradient strip
- Text: "⚡ عروض لوقت محدود"
- Countdown timer (24h rolling, resets midnight) — purely cosmetic, no backend

**1.3 Category Grid** (always visible, even with zero products)
- 8 hardcoded category cards in a 4×2 grid, each with emoji + label + colored background
- Clicking filters products (existing `selCat` logic)
- Categories: زيت أركان 🫒 · عسل 🍯 · زعفران 🌸 · نسيج 🪡 · فخار 🏺 · جمال 💄 · تمر 🌴 · جلد 👜

**1.4 Packs Section** (shown only if packs exist)
- Horizontal scroll of `StoreBundle` cards
- Each card: name · included products (names only) · bundle price · "وفّر X%" badge · "اشتري" button
- Tapping "اشتري" adds all bundle products to cart at once

**1.5 Best Sellers** (shown only if ≥2 products have been ordered)
- 2-column grid of top-4 products sorted by total `CommerceOrderItem.quantity` sold
- Product card additions vs current: discount badge (if price changed), "الأكثر طلباً" badge on #1, urgency label "باقي N" when stock ≤ 5

**1.6 All Products**
- Existing grid, filtered by selCat/selOrg/search
- Product card: same as current + urgency label when stock ≤ 5

### Mock Seed Data
Add to `backend/prisma/seed.js` — runs only if no `CommerceProduct` documents exist for the demo org:

6 products across 4 categories, attached to a demo cooperative org (created if not exists):

| Name (AR) | Category | Price | Stock |
|-----------|----------|-------|-------|
| زيت أركان نقي 100مل | زيت أركان | 89 | 24 |
| عسل الأطلس الجبلي 250غ | العسل | 120 | 18 |
| زعفران تالوين أصيل 1غ | الزعفران | 65 | 30 |
| سجادة بربرية يدوية | المنسوجات والسجاد | 450 | 8 |
| فخار صافي تيزنيت | الفخار والخزف | 180 | 12 |
| زيت الزيتون البلدي 500مل | زيت الزيتون | 75 | 20 |

Demo coop org: `{ name: 'Démo Coopérative', nameAr: 'تعاونية تجريبية', cityAr: 'الرباط', modules: ['COMMERCE'] }`

---

## 2. Product Bundle System

### New Prisma Model: `StoreBundle`

```prisma
model StoreBundle {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  nameAr      String?
  description String?
  imageUrl    String?
  bundlePrice Float
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  items       StoreBundleItem[]
}

model StoreBundleItem {
  id        String       @id @default(auto()) @map("_id") @db.ObjectId
  bundleId  String       @db.ObjectId
  productId String       @db.ObjectId
  quantity  Int          @default(1)
  bundle    StoreBundle  @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  product   CommerceProduct @relation(fields: [productId], references: [id], onDelete: NoAction, onUpdate: NoAction)
}
```

### Backend Routes (`/api/store/bundles`)

All public (no auth):
- `GET /api/store/bundles` — active bundles with items + product names/prices
- `POST /api/store/bundles` — super admin only (auth + role check)
- `PUT /api/store/bundles/:id` — super admin only
- `DELETE /api/store/bundles/:id` — super admin only

Bundle "price" is the bundle total. Discount % = `(sum of individual prices - bundlePrice) / sum * 100`.

### Pack Builder UI (SuperAdmin)

New sub-tab "الباقات" inside the existing store/commerce section of SuperAdmin:
- Table of existing bundles (name · products count · price · active toggle)
- "إضافة باقة" modal:
  - Name (AR + FR)
  - Product multi-select (search by name, shows org + price)
  - Bundle price field (auto-suggests sum of products)
  - Active toggle

---

## 3. Fulfillment Dashboard (SuperAdmin Tab)

### New tab: "الفولفيلمنت" in SuperAdmin sidebar

### Sections

**3.1 KPI Strip** (4 cards, live)
- طلبات اليوم (count, source=STORE, today)
- في الانتظار (status=PENDING)
- رقم اليوم د.م (sum totalAmount today)
- في التوصيل (status=SHIPPED)

**3.2 Order Pipeline (Kanban)**
4 columns: انتظار · تأكيد · في الطريق · وصل
Each column shows order cards: orderNumber · clientName · totalAmount
Clicking a card opens order detail slide-over:
- Client info (name, phone, address)
- Items list
- Status update buttons (move to next step)
- Tracking number input (for SHIPPED)

**3.3 Quick Actions**
- "تأكيد الكل" — bulk confirm all PENDING orders
- "تصدير Excel" — all orders today as CSV

**3.4 Stock Alerts**
- Products where computed stock ≤ 10
- Shows: product name · coop name · stock count · color-coded badge (red ≤ 3, orange ≤ 10)

### Data source
All `CommerceOrder` with `source = 'STORE'`, across all organizations.

---

## File Map

| File | Action |
|------|--------|
| `frontend/src/pages/store/StorePage.tsx` | Rewrite (rename + sections A–F) |
| `backend/prisma/schema.prisma` | Add StoreBundle + StoreBundleItem models |
| `backend/prisma/seed.js` | Add demo coop + 6 products |
| `backend/src/modules/store/store.controller.js` | Add getBundles, createBundle, updateBundle, deleteBundle |
| `backend/src/modules/store/store.routes.js` | Register bundle routes |
| `frontend/src/lib/api.ts` | Add storeApi.getBundles, bundleApi CRUD |
| `frontend/src/pages/superadmin/tabs/FulfillmentTab.tsx` | Create — fulfillment dashboard |
| `frontend/src/pages/superadmin/tabs/BundlesTab.tsx` | Create — pack builder UI |
| `frontend/src/pages/superadmin/SuperAdminPage.tsx` | Register 2 new tabs |

---

## Self-Review

**Placeholder scan:** No TBDs. Seed data is explicit. Schema fields are complete.

**Internal consistency:**
- Bundle discount % is derived (not stored) — computed at query time from product prices
- Best sellers sort uses `CommerceOrderItem` aggregate — no new fields needed
- Countdown timer is cosmetic (client-side only) — no backend state

**Scope check:** Three independent sub-deliverables. Each can be planned and shipped separately. Recommended order: 1 (store redesign + seed) → 3 (fulfillment dashboard) → 2 (bundles, depends on schema migration).

**Ambiguity check:**
- "Best sellers" = sorted by sum of `quantity` across all delivered+shipped orders for that product
- "Pack/bundle" in this spec = `StoreBundle` model (NOT the existing `Pack` subscription model)
- Flash countdown is purely cosmetic — resets to 24h on page load, no server state
