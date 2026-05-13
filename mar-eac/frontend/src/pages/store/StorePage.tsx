import React, { useEffect, useState, useMemo } from 'react';
import { Search, ShoppingCart, X, Plus, Minus, ChevronDown, Store, MapPin, Package } from 'lucide-react';
import { storeApi } from '../../lib/api';

interface Product {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  category?: string;
  sellingPrice: number;
  unit: string;
  imageUrl?: string;
  stock: number;
  organization: { id: string; name: string; nameAr?: string; city?: string; cityAr?: string; logo?: string };
}

interface CartItem { product: Product; quantity: number }

export function StorePage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [orgs, setOrgs]             = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);

  const [search, setSearch]         = useState('');
  const [selOrg, setSelOrg]         = useState('');
  const [selCat, setSelCat]         = useState('');
  const [minPrice, setMinPrice]     = useState('');
  const [maxPrice, setMaxPrice]     = useState('');

  const [cart, setCart]             = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]     = useState(false);
  const [detailProduct, setDetail]  = useState<Product | null>(null);
  const [checkoutOpen, setCheckout] = useState(false);
  const [orderForm, setOrderForm]   = useState({ clientName: '', clientPhone: '', clientAddress: '' });
  const [placing, setPlacing]       = useState(false);
  const [orderSuccess, setSuccess]  = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([storeApi.getOrgs(), storeApi.getCategories()])
      .then(([o, c]) => { setOrgs(o.data); setCategories(c.data); });
    loadProducts();
  }, []);

  const loadProducts = async (params?: any) => {
    setLoading(true);
    try {
      const r = await storeApi.getProducts(params);
      setProducts(r.data);
    } finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !(p.nameAr || '').includes(search)) return false;
      if (selOrg && p.organization.id !== selOrg) return false;
      if (selCat && p.category !== selCat) return false;
      if (minPrice && p.sellingPrice < parseFloat(minPrice)) return false;
      if (maxPrice && p.sellingPrice > parseFloat(maxPrice)) return false;
      return true;
    });
  }, [products, search, selOrg, selCat, minPrice, maxPrice]);

  const cartTotal = cart.reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));

  const handlePlaceOrder = async () => {
    if (!orderForm.clientName || !orderForm.clientPhone) {
      setOrderError('الاسم والهاتف مطلوبان');
      return;
    }
    // Group by org
    const byOrg: Record<string, CartItem[]> = {};
    cart.forEach(item => {
      const oid = item.product.organization.id;
      if (!byOrg[oid]) byOrg[oid] = [];
      byOrg[oid].push(item);
    });

    setPlacing(true);
    setOrderError(null);
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
      setCart([]);
      setCheckout(false);
      setCartOpen(false);
    } catch (e: any) {
      setOrderError(e.response?.data?.message || 'حدث خطأ');
    } finally { setPlacing(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">المتجر العام</span>
            <span className="text-xs text-gray-400 hidden sm:block">منتجات التعاونيات المغربية</span>
          </div>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute right-3 top-2.5 text-gray-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن منتج..."
                className="w-full pr-9 pl-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
              />
            </div>
          </div>
          <button onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors">
            <ShoppingCart size={16} />
            <span className="hidden sm:block">السلة</span>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar filters */}
        <aside className="w-56 flex-shrink-0 hidden md:block space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <p className="font-semibold text-gray-700 text-sm">الفلاتر</p>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">التعاونية</label>
              <select value={selOrg} onChange={e => setSelOrg(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">الكل</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.nameAr || o.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">الفئة</label>
              <select value={selCat} onChange={e => setSelCat(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">الكل</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">السعر (درهم)</label>
              <div className="flex gap-2">
                <input value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="من"
                  type="number" className="w-1/2 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none" />
                <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="إلى"
                  type="number" className="w-1/2 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none" />
              </div>
            </div>

            {(selOrg || selCat || minPrice || maxPrice || search) && (
              <button onClick={() => { setSelOrg(''); setSelCat(''); setMinPrice(''); setMaxPrice(''); setSearch(''); }}
                className="w-full text-xs text-red-500 hover:text-red-700 py-1">مسح الفلاتر</button>
            )}
          </div>
        </aside>

        {/* Products grid */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{filtered.length} منتج</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="w-full h-36 bg-gray-200 rounded-lg mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p>لا توجد منتجات</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => setDetail(p)}>
                  <div className="w-full h-36 bg-gray-100 flex items-center justify-center overflow-hidden">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      : <span className="text-4xl">📦</span>}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-900 text-sm line-clamp-1">{p.nameAr || p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={10} />{p.organization.cityAr || p.organization.city || p.organization.nameAr || p.organization.name}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-bold text-emerald-600">{p.sellingPrice} <span className="text-xs font-normal">درهم</span></span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {p.stock > 0 ? `${p.stock} ${p.unit}` : 'نفد'}
                      </span>
                    </div>
                    {p.stock > 0 && (
                      <button onClick={e => { e.stopPropagation(); addToCart(p); }}
                        className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors">
                        + أضف للسلة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Product detail modal */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="w-full h-52 bg-gray-100 flex items-center justify-center overflow-hidden">
              {detailProduct.imageUrl
                ? <img src={detailProduct.imageUrl} alt={detailProduct.name} className="w-full h-full object-cover" />
                : <span className="text-6xl">📦</span>}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">{detailProduct.nameAr || detailProduct.name}</h2>
                  {detailProduct.nameAr && <p className="text-sm text-gray-400">{detailProduct.name}</p>}
                </div>
                <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 mt-1"><X size={20} /></button>
              </div>
              {detailProduct.description && (
                <p className="text-sm text-gray-600 mt-2">{detailProduct.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {detailProduct.category && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{detailProduct.category}</span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${detailProduct.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                  {detailProduct.stock > 0 ? `متوفر: ${detailProduct.stock} ${detailProduct.unit}` : 'غير متوفر'}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                {detailProduct.organization.logo && (
                  <img src={detailProduct.organization.logo} alt="" className="w-6 h-6 rounded-full object-cover" />
                )}
                <span>{detailProduct.organization.nameAr || detailProduct.organization.name}</span>
                {detailProduct.organization.cityAr && <span>· {detailProduct.organization.cityAr}</span>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-2xl font-bold text-emerald-600">{detailProduct.sellingPrice} <span className="text-base font-normal text-gray-500">درهم</span></span>
                {detailProduct.stock > 0 && (
                  <button onClick={() => { addToCart(detailProduct); setDetail(null); }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors text-sm">
                    + أضف للسلة
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-full max-w-sm bg-white flex flex-col shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">سلة التسوق ({cartCount})</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 py-10">السلة فارغة</p>
              ) : cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.product.imageUrl
                      ? <img src={item.product.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xl">📦</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.product.nameAr || item.product.name}</p>
                    <p className="text-xs text-gray-400">{item.product.sellingPrice} درهم / {item.product.unit}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => changeQty(item.product.id, -1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"><Minus size={12} /></button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button onClick={() => changeQty(item.product.id, 1)} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"><Plus size={12} /></button>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-400"><X size={14} /></button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-200 space-y-3">
                <div className="flex justify-between font-bold">
                  <span>المجموع</span>
                  <span className="text-emerald-600">{cartTotal.toFixed(2)} درهم</span>
                </div>
                <button onClick={() => { setCartOpen(false); setCheckout(true); }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors">
                  إتمام الطلب
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">تأكيد الطلب</h2>
              <button onClick={() => setCheckout(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">الاسم الكامل *</label>
                <input value={orderForm.clientName} onChange={e => setOrderForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="محمد الأمين..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">رقم الهاتف *</label>
                <input value={orderForm.clientPhone} onChange={e => setOrderForm(f => ({ ...f, clientPhone: e.target.value }))}
                  placeholder="06XXXXXXXX" type="tel"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">عنوان التسليم</label>
                <input value={orderForm.clientAddress} onChange={e => setOrderForm(f => ({ ...f, clientAddress: e.target.value }))}
                  placeholder="المدينة، الحي..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between text-sm text-gray-700">
                    <span>{item.product.nameAr || item.product.name} × {item.quantity}</span>
                    <span>{(item.product.sellingPrice * item.quantity).toFixed(2)} درهم</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-sm">
                  <span>المجموع</span>
                  <span className="text-emerald-600">{cartTotal.toFixed(2)} درهم</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                💵 الدفع عند الاستلام (COD) — سيتواصل معك المورد لتأكيد الطلب
              </p>

              {orderError && <p className="text-xs text-red-500">{orderError}</p>}
            </div>
            <div className="p-5 pt-0">
              <button onClick={handlePlaceOrder} disabled={placing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                {placing ? 'جاري الإرسال...' : 'تأكيد الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order success banner */}
      {orderSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 text-sm">
          <span>✅ تم إرسال الطلب بنجاح! رقم الطلب: <strong>{orderSuccess}</strong></span>
          <button onClick={() => setSuccess(null)}><X size={16} /></button>
        </div>
      )}
    </div>
  );
}
