import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search, ShoppingCart, X, Plus, Minus, Package, Truck,
  ShieldCheck, RefreshCw, Menu, Star
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
  { key: 'زيت أركان',               icon: '🫒', bg: '#f3eeff', color: '#6c3fc5' },
  { key: 'العسل',                    icon: '🍯', bg: '#fef9ec', color: '#92400e' },
  { key: 'الزعفران',                 icon: '🌸', bg: '#fdf2f8', color: '#86198f' },
  { key: 'المنسوجات والسجاد',       icon: '🪡', bg: '#fff7ed', color: '#9a3412' },
  { key: 'الفخار والخزف',           icon: '🏺', bg: '#fdf4ff', color: '#7c3aed' },
  { key: 'منتجات التجميل الطبيعية', icon: '💄', bg: '#eff6ff', color: '#1e40af' },
  { key: 'التمر',                    icon: '🌴', bg: '#f0fdf4', color: '#166534' },
  { key: 'منتجات الجلد',            icon: '👜', bg: '#fff7ed', color: '#9a3412' },
];

const CATEGORY_ICONS: Record<string, string> = {
  ...Object.fromEntries(CATEGORY_CARDS.map(c => [c.key, c.icon])),
  'ملابس': '👗', 'أحذية': '👟', 'إلكترونيات': '📱', 'غذاء': '🍯', 'زراعة': '🌿',
  'صناعة تقليدية': '🏺', 'مجوهرات': '💍', 'رياضة': '⚽', 'منزل': '🏠', 'جمال': '💄',
  'زيت الزيتون': '🫒', 'الأعشاب الطبية': '🌿', 'اللوز': '🥜', 'المربى والمعلبات': '🍓',
  'منتجات الألبان': '🥛', 'الخضروات والفواكه': '🥦', 'التطريز والخياطة': '🧵',
  'الخشب والنجارة': '🪵', 'الحلي والمجوهرات': '💍', 'الحناء': '🌺',
  'الملابس التقليدية': '👗', 'السجاد والزرابي': '🪡', 'الحرير والنسيج': '🧶',
  'الأرغان والزيوت': '🫒', 'النباتات العطرية': '🌿', 'المنتجات البيولوجية': '🌱',
};

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

export function StorePage() {
  const [products, setProducts]       = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [bundles, setBundles]         = useState<Bundle[]>([]);
  const [orgs, setOrgs]               = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selCat, setSelCat]           = useState('');
  const [selOrg, setSelOrg]           = useState('');
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]       = useState(false);
  const [detailProduct, setDetail]    = useState<Product | null>(null);
  const [checkoutOpen, setCheckout]   = useState(false);
  const [orderForm, setOrderForm]     = useState({ clientName: '', clientPhone: '', clientAddress: '' });
  const [placing, setPlacing]         = useState(false);
  const [orderSuccess, setSuccess]    = useState<string | null>(null);
  const [orderError, setOrderError]   = useState<string | null>(null);
  const [mobileMenu, setMobileMenu]   = useState(false);
  const countdown                     = useCountdown();

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
    const bundleItems = bundle.items
      .map(item => {
        const product = products.find(p => p.nameAr === item.product.nameAr || p.name === item.product.name);
        return product ? { product, quantity: item.quantity } : null;
      })
      .filter(Boolean) as CartItem[];
    setCart(prev => {
      let next = [...prev];
      for (const bi of bundleItems) {
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
        {showSoldBadge && (p.sold ?? 0) > 0 && (
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
      <div className="text-white text-xs py-1.5 text-center flex items-center justify-center gap-3 flex-wrap"
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
            <button key={cat.key}
              onClick={() => { setSelCat(cat.key === selCat ? '' : cat.key); document.getElementById('all-products')?.scrollIntoView({ behavior: 'smooth' }); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${selCat === cat.key ? 'border-purple-500 shadow-md scale-105' : 'border-transparent hover:border-purple-200'}`}
              style={{ background: selCat === cat.key ? cat.bg : 'white' }}>
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-center leading-tight font-medium" style={{ color: cat.color, fontSize: '10px' }}>{cat.key.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── 4. Packs ── */}
      {bundles.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-8">
          <h2 className="font-black text-gray-900 mb-3">🎁 الباقات الأكثر طلباً</h2>
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

      {/* ── 6. All Products ── */}
      <section id="all-products" className="max-w-7xl mx-auto px-4 mt-8 pb-16">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-black text-gray-900 text-lg">
              {selCat ? selCat : 'جميع المنتجات'}
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
              <p className="text-xs text-purple-600 font-medium mb-1">
                {detailProduct.organization.nameAr || detailProduct.organization.name}
                {detailProduct.organization.cityAr ? ` · ${detailProduct.organization.cityAr}` : ''}
              </p>
              <h2 className="font-black text-gray-900 text-xl mb-1">{detailProduct.nameAr || detailProduct.name}</h2>
              {detailProduct.description && <p className="text-sm text-gray-500 mb-3">{detailProduct.description}</p>}
              <div className="flex items-center justify-between mb-4">
                <div><span className="text-3xl font-black text-purple-700">{detailProduct.sellingPrice}</span><span className="text-gray-500 mr-1">درهم / {detailProduct.unit}</span></div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${detailProduct.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {detailProduct.stock > 0 ? `متوفر: ${detailProduct.stock}` : 'نفد'}
                </span>
              </div>
              {detailProduct.stock > 0 && (
                <button onClick={() => { addToCart(detailProduct); setDetail(null); }}
                  className="w-full py-3.5 text-white font-bold rounded-xl text-base transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                  + إضافة للسلة
                </button>
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
                <button onClick={() => { setCartOpen(false); setCheckout(true); }}
                  className="w-full py-3.5 text-white font-bold rounded-xl text-base transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#6c3fc5,#8b5cf6)' }}>
                  إتمام الطلب →
                </button>
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
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black"
                style={{ background: 'linear-gradient(135deg,#6c3fc5,#a78bfa)' }}><Package size={14} /></div>
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
