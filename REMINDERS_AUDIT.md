# Audit — Système de Rappels & Notifications
> تاريخ: 2026-06-02 | Projet: Mar E-A.C SaaS

---

## ملخص تنفيذي

الكود فيه **10 مشاكل** — واحدة منها حرجة (كراش كامل للـ cron)، وتلاتة عالية الخطورة.  
الأسوأ هو أن التذكيرات الشهرية تُرسل بشكل عشوائي بدون أي تحقق من البيانات ولا نوع المنظمة.

---

## الباقز المكتشفة

### 🔴 BUG #1 — CRITIQUE — `prisma` غير موجود في server.js
**الملف:** `backend/src/server.js` سطر ~135  
**المشكل:** الـ cron يستخدم `prisma.subscription.updateMany()` لكن `prisma` غير مستورد  
**التأثير:** كراش كامل عند تشغيل الـ cron — انتهاء صلاحية الـ trial لا يعمل أبداً  
```javascript
// ❌ الحالة الحالية — prisma غير موجود
cron.schedule('0 9 * * *', async () => {
  const { count } = await prisma.subscription.updateMany(...) // ReferenceError: prisma is not defined
});

// ✅ الإصلاح
const prisma = require('./config/database'); // يُضاف في أعلى server.js
```

---

### 🔴 BUG #2 — عالي — تذكيرات بدون تحقق من وجود البيانات
**الملف:** `backend/src/modules/reminders/reminders.controller.js`  
**الدالة:** `scheduleMonthlyReminders()`  
**المشكل:** 4 تذكيرات ثابتة تُرسل لكل منظمة بغض النظر عن:

| التذكير | ما لا يتم التحقق منه |
|---|---|
| `PROJECT_UPDATE` | هل عندها مشاريع أصلاً؟ |
| `WATER_READING` | هل عندها عدادات ماء؟ |
| `FUNDING_REQUEST` | هل نوع المنظمة يسمح بالتمويل؟ |
| `FINANCE_RECORD` | ✅ منطقي لكل المنظمات |

**التأثير:** cooperative بدون مشاريع تتلقى "حدّث مشروعك" — تجربة مستخدم سيئة جداً  
**المنطق الصحيح:**
```
ماعندهاش مشاريع  → تذكير "أنشئ مشروعك الأول"
عندها مشاريع      → تذكير "حدّث حالة مشاريعك"
ماعندهاش عدادات  → لا تذكير WATER_READING
```

---

### 🔴 BUG #3 — عالي — رسائل WhatsApp تفقد عند الفشل
**الملف:** `backend/src/modules/superadmin/superadmin.controller.js`  
**الدالة:** `executeActionsForOrg()`  
**المشكل:** إذا فشل `callEvolutionAPI()` يُسجَّل الخطأ ويُنسى — لا إعادة محاولة، لا قائمة انتظار  
**التأثير:** رسائل مهمة (تجديد اشتراك، تحذيرات) تختفي نهائياً  
```javascript
// ❌ الحالة الحالية
await callEvolutionAPI(phone, msgBody);
results.push({ type, orgId: org.id, status: 'SENT' });

// ✅ الإصلاح — يُسجَّل في WhatsAppMessage كـ FAILED ليُعاد لاحقاً
```

---

### 🟡 BUG #4 — متوسط — تذكير BUREAU_EXPIRY يصل للتعاونيات
**الملف:** `backend/src/modules/reminders/reminders.controller.js`  
**الدالة:** `scheduleBureauExpiryReminders()`  
**المشكل:** يبحث عن كل منظمة لديها `bureauCreationDate` — التعاونيات (CONVERTED) ليس لها مكتب  
```javascript
// ❌ الحالة الحالية
const orgs = await prisma.organization.findMany({
  where: { bureauCreationDate: { not: null } },
  include: { subscription: true },
});

// ✅ الإصلاح — تصفية التعاونيات
const orgs = await prisma.organization.findMany({
  where: {
    bureauCreationDate: { not: null },
    conversionStatus: { not: 'CONVERTED' }, // ← يُضاف
  },
  include: { subscription: true },
});
```

---

### 🟡 BUG #5 — متوسط — لا deduplication في التذكيرات الشهرية
**الملف:** `backend/src/modules/reminders/reminders.controller.js`  
**الدالة:** `scheduleMonthlyReminders()`  
**المشكل:** `createMany()` بدون أي فحص — إذا أعيد تشغيل الـ cron (restart أو خطأ) تُضاعَف التذكيرات  
**الإصلاح:** فحص `type + organizationId + شهر/سنة` قبل الإنشاء

---

### 🟡 BUG #6 — متوسط — INACTIVE_30D/60D تستهدف اشتراكات منتهية
**الملف:** `backend/src/modules/superadmin/superadmin.controller.js`  
**الدالة:** `resolveAutomationTargets()`  
**المشكل:** يستخدم `updatedAt` فقط — منظمات اشتراكها EXPIRED منذ أشهر ستتلقى "نفتقدك!"  
```javascript
// ❌ الحالة الحالية
case 'INACTIVE_30D': {
  return prisma.organization.findMany({
    where: { updatedAt: { lt: cutoff } }, // ← لا فلتر على الاشتراك
  });
}

// ✅ الإصلاح
case 'INACTIVE_30D': {
  return prisma.organization.findMany({
    where: {
      updatedAt: { lt: cutoff },
      subscription: { status: 'ACTIVE' }, // ← يُضاف
    },
  });
}
```

---

### 🟡 BUG #7 — متوسط — تداخل بين automation rules و trial reminders
**الملف:** `backend/src/server.js`  
**المشكل:** `processAutomationRules()` و `sendTrialExpiryReminders()` تعملان في نفس الوقت (09:00)  
إذا كانت هناك automation rule من نوع `TRIAL_EXPIRED` ستُرسَل رسالة مضاعفة  
**الإصلاح:** تشغيلهما بترتيب متسلسل مع فحص dedup (موجود جزئياً في sendTrialExpiryReminders)

---

### 🟠 BUG #8 — منخفض — SUSPEND غير معرّف في الـ schema
**الملف:** `backend/src/modules/superadmin/superadmin.controller.js`  
**الدالة:** `executeActionsForOrg()` → case 'SUSPEND'  
**المشكل:** يحاول تعيين `status: 'SUSPENDED'` لكن الـ schema لا يعرف هذه القيمة — قد يفشل صامتاً  
**الإصلاح:** إضافة 'SUSPENDED' إلى قيم Subscription.status المسموح بها

---

### 🟠 BUG #9 — منخفض — رسالة log مضللة
**الملف:** `backend/src/modules/reminders/reminders.controller.js`  
```javascript
// ❌ يقول "created for X orgs" لكن يتخطى EXPIRED/CANCELLED
console.log(`[Cron] Monthly reminders created for ${orgs.length} organizations`);

// ✅ الإصلاح
console.log(`[Cron] Monthly reminders created for ${activeCount}/${orgs.length} organizations`);
```

---

### 🟠 BUG #10 — منخفض — نافذة dedup ضعيفة للمكتب
**الملف:** `backend/src/modules/reminders/reminders.controller.js`  
**الدالة:** `scheduleBureauExpiryReminders()`  
**المشكل:** تفحص آخر 4 أيام فقط — إذا أخفق الـ cron وأُعيد تشغيله بعد 4+ أيام سيُرسَل مضاعف  
**الإصلاح:** استخدام `upsert` أو فحص نفس الشهر

---

## جدول الأولويات

| # | خطورة | الملف | المشكل الرئيسي | وقت الإصلاح |
|---|---|---|---|---|
| 1 | 🔴 CRITIQUE | server.js | `prisma` غير مستورد → كراش | 2 دقيقة |
| 2 | 🔴 عالي | reminders.controller | لا تحقق من وجود البيانات قبل التذكير | 1 ساعة |
| 3 | 🔴 عالي | superadmin.controller | رسائل WhatsApp تُفقد عند الفشل | 30 دقيقة |
| 4 | 🟡 متوسط | reminders.controller | BUREAU_EXPIRY يصل للتعاونيات | 5 دقائق |
| 5 | 🟡 متوسط | reminders.controller | لا deduplication شهري | 20 دقيقة |
| 6 | 🟡 متوسط | superadmin.controller | INACTIVE يستهدف اشتراكات منتهية | 10 دقائق |
| 7 | 🟡 متوسط | server.js | تداخل automation + trial reminders | 15 دقيقة |
| 8 | 🟠 منخفض | superadmin.controller | SUSPEND غير معرّف في schema | 10 دقائق |
| 9 | 🟠 منخفض | reminders.controller | log message مضلل | 2 دقيقة |
| 10 | 🟠 منخفض | reminders.controller | dedup window ضعيف للمكتب | 10 دقائق |

---

## النظام الذكي المقترح (بعد الإصلاح)

### مبادئ التصميم
1. **Context-aware** — كل تذكير يعلم نوع المنظمة وحالة البيانات
2. **Action-oriented** — "أنشئ" vs "حدّث" حسب ما هو موجود
3. **Progressive onboarding** — تذكيرات مرحلية للمنظمات الجديدة
4. **Non-intrusive** — dedup صارم، لا تكرار

### منطق التذكير الصحيح
```
التذكير           | الشرط
──────────────────────────────────────────────────────────────────────
PROJECT_UPDATE    | عدد المشاريع > 0 (association + cooperative)
PROJECT_CREATE    | عدد المشاريع = 0 (association + cooperative)
WATER_READING     | عدد العدادات > 0 (association فقط - نوع WATER/PRODUCTIVE_WATER)
FINANCE_RECORD    | دائماً ✅ (كل المنظمات)
FUNDING_REQUEST   | الباقة STANDARD أو PREMIUM (كل المنظمات)
BUREAU_EXPIRY     | conversionStatus ≠ 'CONVERTED' + bureauCreationDate موجود
STOCK_UPDATE      | cooperative فقط + عندها مواد في المخزن
MEMBER_RENEWAL    | كل المنظمات (موجود ✅ يعمل)
ONBOARDING_*      | منظمات < 30 يوم حسب خطوات الإكمال
```

### تذكيرات Onboarding الجديدة
```
اليوم 1   → أضف أعضاء منظمتك (عدد الأعضاء = 0)
اليوم 3   → سجل اجتماعك الأول (عدد الاجتماعات = 0)
اليوم 7   → ابدأ تتبع الشؤون المالية (عدد المعاملات = 0)
اليوم 14  → أنشئ مشروعك الأول (عدد المشاريع = 0)
اليوم 30  → اكتشف التقارير والإحصاءات
```

---

## الملفات المتأثرة

```
backend/src/server.js                              ← BUG #1, #7
backend/src/modules/reminders/reminders.controller.js ← BUG #2, #4, #5, #9, #10
backend/src/modules/superadmin/superadmin.controller.js ← BUG #3, #6, #8
```
