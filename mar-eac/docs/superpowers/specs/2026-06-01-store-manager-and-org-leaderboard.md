# Store Manager Panel + Org Performance Leaderboard — Design Spec

**Date:** 2026-06-01
**Status:** Approved

---

## Overview

Two independent features built on top of the existing Ma3ridona platform:

1. **Store Manager Panel** — A dedicated WooCommerce-style interface for a hired store employee (`STORE_MANAGER` role) to manage products, stock, orders, and bundles independently from the SuperAdmin.
2. **Org Performance Leaderboard** — Per-section revenue ranking added to each SuperAdmin dashboard tab (Assoc/Coop/Store), with auto-generated advice tags so the superadmin can see who's performing well and who needs scaling support.

These two features are independent and can be implemented in parallel.

---

## Feature 1 — Store Manager Panel

### Business Context

The platform owners (SaaS) want to hire a dedicated store employee who handles day-to-day product and order management for the Ma3ridona store. This person needs a focused, familiar interface (WooCommerce-like) without access to association/coop management, billing, or superadmin settings. The SuperAdmin creates their account and credentials.

### Role & Auth

- New role: `STORE_MANAGER` added to the `UserRole` enum in `schema.prisma`
- SuperAdmin creates store manager accounts from the existing Users tab (add role option)
- Store manager logs in at `/login` (same login page), redirected to `/store-admin` after auth
- All existing auth middleware applies; routes protected by `requireRole('STORE_MANAGER', 'SUPER_ADMIN')`
- Store manager cannot access `/superadmin` routes

### Routes & Navigation

- New route: `/store-admin` → `StoreAdminPage`
- Protected: redirect to `/login` if not authenticated or not `STORE_MANAGER`/`SUPER_ADMIN`
- Sidebar tabs (6):
  - 📦 Products (default)
  - 🏷️ Categories
  - 📊 Stock
  - 🛒 Orders
  - 🎁 Bundles
  - 📈 Reports

### Products Tab (WooCommerce-style)

**List view** — table with columns:
| Checkbox | Image | Product (name AR + FR + SKU) | Category | Price (+ cost) | Stock badge | Active toggle | Actions |

- Compact rows, 20 per page, pagination at bottom
- **Filters bar**: search input + filter by category + filter by status (active/inactive/low stock) + filter by coop
- **Stock badges**: green `✓ N وحدة` / orange `⚠ N وحدات` (low: below threshold) / red `✗ نفد`
- **Active toggle**: inline, updates `isActive` on change without page reload
- Row opacity 65% for inactive products

**Edit / Add panel** — slide-in from left (`position: fixed`), does not navigate away:
- **صورة المنتج**: image preview (emoji fallback) + URL input field
- **المعلومات الأساسية**: nameAr, name (FR), description (textarea), category (select), organization (select, all coops with COMMERCE module), SKU
- **الأسعار**: sellingPrice + costPrice side by side + live margin display (green pill)
- **المخزون**: unit + low stock threshold (integer, saved as metadata)
- **الحالة**: active toggle with label "يظهر في المتجر للزوار"
- Footer: Cancel + Save buttons

**No backend schema changes for products** — all fields already exist (`name`, `nameAr`, `description`, `category`, `sku`, `costPrice`, `sellingPrice`, `unit`, `imageUrl`, `isActive`, `organizationId`).

### Categories Tab

Simple CRUD for category names (Arabic). Categories are stored as a free-text `category` field on `CommerceProduct` today. This tab shows distinct existing categories + allows adding new ones (just a name, no backend model needed — update is done by bulk-updating products). For now: read-only list of existing categories with counts.

### Stock Tab

Reuse existing stock movement logic from `CommercePage.tsx`. Shows movements table (product, type IN/OUT/ADJUST, quantity, date, reference). Add new movement form (product select, type, quantity, reference/notes).

Backend: reuse `GET /api/commerce/stock` and `POST /api/commerce/stock` endpoints — these are already auth-protected and org-scoped. For store manager, backend needs to accept cross-org requests (store manager acts on behalf of any org). New middleware: if `STORE_MANAGER`, allow without org check.

### Orders Tab

Reuse `FulfillmentTab` logic but scoped to the store manager panel. Shows all `source=STORE` orders across orgs. Store manager can update order status (PENDING → CONFIRMED → SHIPPED → DELIVERED) and add tracking number.

Backend: reuse existing fulfillment endpoints, same cross-org middleware exemption as Stock.

### Bundles Tab

Embed the existing `BundlesTab` component directly. No changes needed.

### Reports Tab

Simple KPIs only (reuse `StoreDashboardTab` data):
- Orders today / this month
- Revenue today / this month
- Top 5 products by sales (table)

### Backend Changes Summary

| Change | File |
|--------|------|
| Add `STORE_MANAGER` to `UserRole` enum | `schema.prisma` |
| Add redirect logic for `STORE_MANAGER` role on login | `frontend/src/App.tsx` (or auth context) |
| New route `/store-admin` + `StoreAdminPage` | `frontend/src/App.tsx` |
| Cross-org middleware exemption for `STORE_MANAGER` | `backend/src/middleware/auth.js` |
| New page component | `frontend/src/pages/store-admin/StoreAdminPage.tsx` |

---

## Feature 2 — Org Performance Leaderboard

### Business Context

The SuperAdmin needs to see at a glance which organizations (associations or coops) are generating revenue and which need scaling support — without navigating to each org individually. The leaderboard is added directly to the existing dashboard tabs (no new tabs).

### Backend — New Endpoint

```
GET /api/superadmin/org-performance?section=assoc|coop|store&page=1&limit=20&search=
```

**Response shape:**
```json
{
  "orgs": [
    {
      "id": "...",
      "name": "تعاونية تيزنيت",
      "nameAr": "...",
      "cityAr": "تيزنيت",
      "monthRevenue": 12400,
      "lastMonthRevenue": 9800,
      "advice": "top",
      "adviceLabel": "🔥 Top",
      "rank": 1
    }
  ],
  "total": 47,
  "needsAttention": [ ...same shape, orgs with advice = "zero" | "critical_drop" ]
}
```

**Revenue definition per section:**
- `assoc` → sum of `Payment.amount` where `Payment.organizationId` = org, this month, status PAID
- `coop` → same as assoc (subscription payments)
- `store` → sum of `CommerceOrder.totalAmount` where `source=STORE`, `organizationId` = org, this month, status not CANCELLED

**Auto-advice rules (evaluated in order):**
| Rule | Tag | Label |
|------|-----|-------|
| monthRevenue = 0 | `zero` | 🚨 ما خدم والو |
| monthRevenue < 20% of section average AND monthRevenue > 0 | `weak` | ⚠️ ضعيف |
| lastMonthRevenue > 0 AND monthRevenue < lastMonthRevenue × 0.5 | `critical_drop` | 📉 انخفاض كبير |
| monthRevenue ≥ top org revenue × 0.8 | `top` | 🔥 Top |
| else | `ok` | ✅ عادي |

Rules are mutually exclusive, evaluated top-to-bottom. `zero` takes priority over `critical_drop`.

### Frontend — `OrgPerformanceLeaderboard` Component

Reusable component added to all 3 dashboard tabs below existing KPI cards.

**Props:** `section: 'assoc' | 'coop' | 'store'`

**Layout:**
1. **"تحتاج تدخل" alert section** (only if needsAttention.length > 0): compact list of orgs with 🚨/📉 tags + "تواصل" button (opens phone/WhatsApp link)
2. **Search input** (filters within current page)
3. **Ranked list**: compact cards, 20 per page
   - Rank number (🥇🥈🥉 for top 3, numbers for rest)
   - Org name + city
   - Relative progress bar (max = top org revenue)
   - Revenue amount
   - Advice tag badge

**File:** `frontend/src/components/superadmin/OrgPerformanceLeaderboard.tsx`

**Integration points:**
- `AssocDashboardTab.tsx` — add `<OrgPerformanceLeaderboard section="assoc" />`
- `CoopDashboardTab.tsx` — add `<OrgPerformanceLeaderboard section="coop" />`
- `StoreDashboardTab.tsx` — add `<OrgPerformanceLeaderboard section="store" />`

### API Client

Add to `superadminApi` in `frontend/src/lib/api.ts`:
```ts
getOrgPerformance: (section: string, page = 1, search = '') =>
  api.get('/superadmin/org-performance', { params: { section, page, limit: 20, search } }),
```

---

## Out of Scope

- Product variants (sizes, colors) — future feature
- Image file upload (only URL input for now)
- Categories as a separate DB model — free-text field is sufficient
- Store manager creating other user accounts
- Real-time notifications for store manager

---

## Implementation Order

Both features are independent. Recommended order:
1. Feature 2 (Leaderboard) — smaller, additive, no new roles or routes
2. Feature 1 (Store Manager) — larger, requires schema migration and new page
