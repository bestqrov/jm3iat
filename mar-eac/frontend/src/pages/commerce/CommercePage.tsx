import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { commerceApi } from '../../lib/api';
import {
  ShoppingCart, Package, Warehouse, TrendingUp, DollarSign,
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, Check,
  Truck, RotateCcw, AlertCircle, Search, Filter
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CommerceProduct {
  id: string;
  name: string;
  nameAr?: string;
  category?: string;
  sku?: string;
  costPrice: number;
  sellingPrice: number;
  commission: number;
  unit: string;
  isActive: boolean;
  stock: number;
}

interface StockMovement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
  date: string;
  product: { name: string; unit: string };
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  subtotal: number;
  product: { name: string; unit: string };
}

interface CommerceOrder {
  id: string;
  orderNumber: string;
  clientName: string;
  clientPhone?: string;
  clientAddress?: string;
  clientCity?: string;
  totalAmount: number;
  codAmount: number;
  shippingCost: number;
  status: string;
  paymentStatus: string;
  trackingNumber?: string;
  carrier?: string;
  notes?: string;
  orderDate: string;
  items: OrderItem[];
  profit?: { netProfit: number; isPaidOut: boolean };
}

interface OrderProfit {
  id: string;
  orderId: string;
  revenue: number;
  cogs: number;
  shippingCost: number;
  platformFee: number;
  netProfit: number;
  isPaidOut: boolean;
  order: {
    orderNumber: string;
    clientName: string;
    status: string;
    paymentStatus: string;
    orderDate: string;
    codAmount: number;
  };
}

interface CommercePayout {
  id: string;
  amount: number;
  ordersCount: number;
  method: string;
  reference?: string;
  notes?: string;
  status: string;
  periodStart?: string;
  periodEnd?: string;
  paidAt?: string;
  createdAt: string;
}

interface Stats {
  totalProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  returnedOrders: number;
  totalRevenue: number;
  totalProfit: number;
  unpaidProfit: number;
  codPending: number;
  totalPayouts: number;
}

type Tab = 'products' | 'warehouse' | 'orders' | 'profits' | 'payouts';

const STATUS_LABELS: Record<string, { ar: string; color: string }> = {
  PENDING:    { ar: 'معلق',     color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMED:  { ar: 'مؤكد',    color: 'bg-blue-100 text-blue-800' },
  SHIPPED:    { ar: 'مشحون',   color: 'bg-indigo-100 text-indigo-800' },
  DELIVERED:  { ar: 'مسلّم',   color: 'bg-green-100 text-green-800' },
  RETURNED:   { ar: 'مُرجع',   color: 'bg-orange-100 text-orange-800' },
  CANCELLED:  { ar: 'ملغى',    color: 'bg-red-100 text-red-800' },
};

const PAY_LABELS: Record<string, { ar: string; color: string }> = {
  UNPAID:        { ar: 'غير مدفوع',    color: 'bg-red-100 text-red-700' },
  COD_COLLECTED: { ar: 'COD محصّل',   color: 'bg-teal-100 text-teal-700' },
  PAID:          { ar: 'مدفوع',        color: 'bg-green-100 text-green-700' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function CommercePage() {
  const { lang } = useLanguage();
  const ar = lang === 'ar';

  const [tab, setTab] = useState<Tab>('products');
  const [stats, setStats] = useState<Stats | null>(null);

  // Products
  const [products, setProducts] = useState<CommerceProduct[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CommerceProduct | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', nameAr: '', category: '', sku: '',
    costPrice: '', sellingPrice: '', commission: '', unit: 'pièce',
  });

  // Warehouse
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [showStockForm, setShowStockForm] = useState(false);
  const [stockForm, setStockForm] = useState({
    productId: '', type: 'IN', quantity: '', unitCost: '', reference: '', notes: '',
  });

  // Orders
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState({
    clientName: '', clientPhone: '', clientAddress: '', clientCity: '',
    shippingCost: '0', carrier: '', notes: '',
    items: [{ productId: '', quantity: '1' }],
  });
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  // Profits
  const [profits, setProfits] = useState<OrderProfit[]>([]);

  // Payouts
  const [payouts, setPayouts] = useState<CommercePayout[]>([]);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '', method: 'BANK_TRANSFER', reference: '', notes: '',
    periodStart: '', periodEnd: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStats = useCallback(async () => {
    try {
      const res = await commerceApi.getStats();
      setStats(res.data);
    } catch {}
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await commerceApi.getProducts();
    setProducts(res.data);
  }, []);

  const loadMovements = useCallback(async () => {
    const res = await commerceApi.getStock();
    setMovements(res.data);
  }, []);

  const loadOrders = useCallback(async () => {
    const res = await commerceApi.getOrders();
    setOrders(res.data);
  }, []);

  const loadProfits = useCallback(async () => {
    const res = await commerceApi.getProfits();
    setProfits(res.data);
  }, []);

  const loadPayouts = useCallback(async () => {
    const res = await commerceApi.getPayouts();
    setPayouts(res.data);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (tab === 'products') loadProducts();
    else if (tab === 'warehouse') { loadProducts(); loadMovements(); }
    else if (tab === 'orders') { loadProducts(); loadOrders(); }
    else if (tab === 'profits') loadProfits();
    else if (tab === 'payouts') loadPayouts();
  }, [tab, loadProducts, loadMovements, loadOrders, loadProfits, loadPayouts]);

  // ── Product handlers ──────────────────────────────────────────────────────

  const openProductForm = (p?: CommerceProduct) => {
    if (p) {
      setEditingProduct(p);
      setProductForm({
        name: p.name, nameAr: p.nameAr || '', category: p.category || '',
        sku: p.sku || '', costPrice: String(p.costPrice), sellingPrice: String(p.sellingPrice),
        commission: String(p.commission), unit: p.unit,
      });
    } else {
      setEditingProduct(null);
      setProductForm({ name: '', nameAr: '', category: '', sku: '', costPrice: '', sellingPrice: '', commission: '', unit: 'pièce' });
    }
    setShowProductForm(true);
  };

  const saveProduct = async () => {
    setLoading(true); setError('');
    try {
      if (editingProduct) {
        await commerceApi.updateProduct(editingProduct.id, productForm);
      } else {
        await commerceApi.createProduct(productForm);
      }
      setShowProductForm(false);
      loadProducts(); loadStats();
    } catch (e: any) {
      setError(e.response?.data?.message || 'خطأ في الحفظ');
    } finally { setLoading(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('هل تريد حذف المنتج؟')) return;
    await commerceApi.deleteProduct(id);
    loadProducts(); loadStats();
  };

  // ── Stock handlers ────────────────────────────────────────────────────────

  const saveStock = async () => {
    setLoading(true); setError('');
    try {
      await commerceApi.addStock(stockForm);
      setShowStockForm(false);
      setStockForm({ productId: '', type: 'IN', quantity: '', unitCost: '', reference: '', notes: '' });
      loadMovements(); loadProducts(); loadStats();
    } catch (e: any) {
      setError(e.response?.data?.message || 'خطأ في الحفظ');
    } finally { setLoading(false); }
  };

  // ── Order handlers ────────────────────────────────────────────────────────

  const addOrderItem = () => setOrderForm(f => ({ ...f, items: [...f.items, { productId: '', quantity: '1' }] }));
  const removeOrderItem = (i: number) => setOrderForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateOrderItem = (i: number, field: string, value: string) =>
    setOrderForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [field]: value } : it) }));

  const saveOrder = async () => {
    setLoading(true); setError('');
    try {
      await commerceApi.createOrder({
        ...orderForm,
        items: orderForm.items.filter(it => it.productId),
      });
      setShowOrderForm(false);
      setOrderForm({
        clientName: '', clientPhone: '', clientAddress: '', clientCity: '',
        shippingCost: '0', carrier: '', notes: '',
        items: [{ productId: '', quantity: '1' }],
      });
      loadOrders(); loadStats();
    } catch (e: any) {
      setError(e.response?.data?.message || 'خطأ في إنشاء الطلب');
    } finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    await commerceApi.updateOrder(id, { status });
    loadOrders(); loadStats();
  };

  const updatePaymentStatus = async (id: string, paymentStatus: string) => {
    await commerceApi.updateOrder(id, { paymentStatus });
    loadOrders(); loadStats();
  };

  const deleteOrder = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الطلب؟')) return;
    try {
      await commerceApi.deleteOrder(id);
      loadOrders(); loadStats();
    } catch (e: any) {
      alert(e.response?.data?.message || 'خطأ في الحذف');
    }
  };

  // ── Payout handlers ───────────────────────────────────────────────────────

  const savePayout = async () => {
    setLoading(true); setError('');
    try {
      await commerceApi.createPayout(payoutForm);
      setShowPayoutForm(false);
      setPayoutForm({ amount: '', method: 'BANK_TRANSFER', reference: '', notes: '', periodStart: '', periodEnd: '' });
      loadPayouts(); loadProfits(); loadStats();
    } catch (e: any) {
      setError(e.response?.data?.message || 'خطأ في الحفظ');
    } finally { setLoading(false); }
  };

  // ── Filtered orders ───────────────────────────────────────────────────────

  const filteredOrders = orders.filter(o => {
    const matchSearch = !orderSearch || o.clientName.includes(orderSearch) || o.orderNumber.includes(orderSearch) || o.clientPhone?.includes(orderSearch);
    const matchStatus = !orderStatusFilter || o.status === orderStatusFilter;
    return matchSearch && matchStatus;
  });

  // ── Tabs config ───────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'products',  label: 'المنتجات',        icon: <Package size={16} /> },
    { id: 'warehouse', label: 'المستودع',         icon: <Warehouse size={16} /> },
    { id: 'orders',    label: 'الطلبات',           icon: <ShoppingCart size={16} /> },
    { id: 'profits',   label: 'الأرباح / COD',    icon: <TrendingUp size={16} /> },
    { id: 'payouts',   label: 'المدفوعات',         icon: <DollarSign size={16} /> },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">التجارة الإلكترونية</h1>
          <p className="text-sm text-gray-500">إدارة المنتجات، الطلبات، والمبيعات</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="المنتجات" value={stats.totalProducts} icon={<Package size={18} className="text-blue-500" />} color="blue" />
          <StatCard label="الطلبات الجديدة" value={stats.pendingOrders} icon={<ShoppingCart size={18} className="text-yellow-500" />} color="yellow" />
          <StatCard label="الأرباح (غير محوّلة)" value={`${stats.unpaidProfit.toFixed(0)} د.م`} icon={<TrendingUp size={18} className="text-green-500" />} color="green" />
          <StatCard label="COD في الانتظار" value={`${stats.codPending.toFixed(0)} د.م`} icon={<DollarSign size={18} className="text-purple-500" />} color="purple" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Products Tab ── */}
      {tab === 'products' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">قائمة المنتجات ({products.filter(p => p.isActive).length})</h2>
            <button onClick={() => openProductForm()} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
              <Plus size={15} /> إضافة منتج
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.filter(p => p.isActive).map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-800">{p.nameAr || p.name}</div>
                    {p.category && <div className="text-xs text-gray-400 mt-0.5">{p.category}</div>}
                  </div>
                  <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.stock} {p.unit}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-400">سعر الشراء</div>
                    <div className="font-bold text-gray-700">{p.costPrice} د.م</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="text-blue-400">سعر البيع</div>
                    <div className="font-bold text-blue-700">{p.sellingPrice} د.م</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-green-400">الهامش</div>
                    <div className="font-bold text-green-700">{(p.sellingPrice - p.costPrice).toFixed(0)} د.م</div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => openProductForm(p)} className="text-blue-500 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {products.filter(p => p.isActive).length === 0 && (
            <EmptyState icon={<Package size={40} className="text-gray-300" />} text="لا توجد منتجات بعد" sub="أضف أول منتج للبدء" />
          )}
        </div>
      )}

      {/* ── Warehouse Tab ── */}
      {tab === 'warehouse' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">حركات المستودع ({movements.length})</h2>
            <button onClick={() => setShowStockForm(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
              <Plus size={15} /> إدخال حركة
            </button>
          </div>

          {/* Current stock summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="font-medium text-gray-700 mb-3">مخزون المنتجات</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {products.filter(p => p.isActive).map(p => (
                <div key={p.id} className={`rounded-lg p-2 text-center text-sm ${p.stock > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-xs text-gray-500 truncate">{p.nameAr || p.name}</div>
                  <div className={`font-bold ${p.stock > 0 ? 'text-green-700' : 'text-red-700'}`}>{p.stock} {p.unit}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Movements list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-right">المنتج</th>
                  <th className="px-4 py-3 text-right">النوع</th>
                  <th className="px-4 py-3 text-right">الكمية</th>
                  <th className="px-4 py-3 text-right">سعر الوحدة</th>
                  <th className="px-4 py-3 text-right">المرجع</th>
                  <th className="px-4 py-3 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{m.product?.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.type === 'IN' ? 'bg-green-100 text-green-700' :
                        m.type === 'OUT' ? 'bg-red-100 text-red-700' :
                        m.type === 'RETURN' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {m.type === 'IN' ? 'دخول' : m.type === 'OUT' ? 'خروج' : m.type === 'RETURN' ? 'إرجاع' : 'تعديل'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{m.quantity} {m.product?.unit}</td>
                    <td className="px-4 py-3">{m.unitCost ? `${m.unitCost} د.م` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{m.reference || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(m.date).toLocaleDateString('ar-MA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {movements.length === 0 && (
              <div className="text-center py-8 text-gray-400">لا توجد حركات مستودع بعد</div>
            )}
          </div>
        </div>
      )}

      {/* ── Orders Tab ── */}
      {tab === 'orders' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="flex gap-2">
              <div className="relative">
                <Search size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={orderSearch}
                  onChange={e => setOrderSearch(e.target.value)}
                  placeholder="بحث بالاسم أو رقم الطلب..."
                  className="border border-gray-200 rounded-lg pr-8 pl-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 w-52"
                />
              </div>
              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                <option value="">كل الحالات</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.ar}</option>
                ))}
              </select>
            </div>
            <button onClick={() => setShowOrderForm(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
              <Plus size={15} /> طلب جديد
            </button>
          </div>

          <div className="space-y-2">
            {filteredOrders.map(o => (
              <div key={o.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{o.orderNumber}</div>
                    <div className="font-medium text-gray-800">{o.clientName}</div>
                    {o.clientCity && <div className="text-xs text-gray-400">{o.clientCity}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[o.status]?.color}`}>
                      {STATUS_LABELS[o.status]?.ar || o.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAY_LABELS[o.paymentStatus]?.color}`}>
                      {PAY_LABELS[o.paymentStatus]?.ar || o.paymentStatus}
                    </span>
                    <div className="font-bold text-gray-700">{o.codAmount.toFixed(0)} د.م</div>
                    {expandedOrder === o.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {expandedOrder === o.id && (
                  <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
                    {/* Order items */}
                    <div className="text-xs font-medium text-gray-500 mb-1">المنتجات</div>
                    {o.items.map(it => (
                      <div key={it.id} className="flex justify-between text-sm bg-white rounded-lg px-3 py-2">
                        <span>{it.product?.name}</span>
                        <span className="text-gray-500">{it.quantity} × {it.unitPrice} = <span className="font-medium text-gray-700">{it.subtotal} د.م</span></span>
                      </div>
                    ))}

                    {/* Totals */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <div className="bg-white rounded p-2"><div className="text-gray-400">البضاعة</div><div className="font-bold">{o.totalAmount.toFixed(0)} د.م</div></div>
                      <div className="bg-white rounded p-2"><div className="text-gray-400">الشحن</div><div className="font-bold">{o.shippingCost.toFixed(0)} د.م</div></div>
                      <div className="bg-blue-50 rounded p-2"><div className="text-blue-400">COD</div><div className="font-bold text-blue-700">{o.codAmount.toFixed(0)} د.م</div></div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {o.status === 'PENDING' && (
                        <ActionBtn onClick={() => updateStatus(o.id, 'CONFIRMED')} icon={<Check size={13} />} label="تأكيد" color="blue" />
                      )}
                      {o.status === 'CONFIRMED' && (
                        <ActionBtn onClick={() => updateStatus(o.id, 'SHIPPED')} icon={<Truck size={13} />} label="شحن" color="indigo" />
                      )}
                      {o.status === 'SHIPPED' && (
                        <>
                          <ActionBtn onClick={() => updateStatus(o.id, 'DELIVERED')} icon={<Check size={13} />} label="تسليم" color="green" />
                          <ActionBtn onClick={() => updateStatus(o.id, 'RETURNED')} icon={<RotateCcw size={13} />} label="إرجاع" color="orange" />
                        </>
                      )}
                      {o.status === 'DELIVERED' && o.paymentStatus === 'UNPAID' && (
                        <ActionBtn onClick={() => updatePaymentStatus(o.id, 'COD_COLLECTED')} icon={<DollarSign size={13} />} label="تحصيل COD" color="teal" />
                      )}
                      {['PENDING', 'CANCELLED'].includes(o.status) && (
                        <ActionBtn onClick={() => deleteOrder(o.id)} icon={<Trash2 size={13} />} label="حذف" color="red" />
                      )}
                      {o.status === 'PENDING' && (
                        <ActionBtn onClick={() => updateStatus(o.id, 'CANCELLED')} icon={<X size={13} />} label="إلغاء" color="gray" />
                      )}
                    </div>

                    {o.profit && (
                      <div className="flex items-center gap-2 text-xs bg-green-50 rounded-lg px-3 py-2">
                        <TrendingUp size={13} className="text-green-500" />
                        <span className="text-gray-500">صافي الربح:</span>
                        <span className="font-bold text-green-700">{o.profit.netProfit.toFixed(0)} د.م</span>
                        {o.profit.isPaidOut && <span className="bg-green-200 text-green-800 px-1.5 rounded text-xs">محوّل</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredOrders.length === 0 && (
            <EmptyState icon={<ShoppingCart size={40} className="text-gray-300" />} text="لا توجد طلبات" sub="أنشئ أول طلب للبدء" />
          )}
        </div>
      )}

      {/* ── Profits Tab ── */}
      {tab === 'profits' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-sm text-green-600">إجمالي الأرباح</div>
              <div className="text-2xl font-bold text-green-700">{profits.reduce((s, p) => s + p.netProfit, 0).toFixed(0)} د.م</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <div className="text-sm text-orange-600">أرباح غير محوّلة</div>
              <div className="text-2xl font-bold text-orange-700">{profits.filter(p => !p.isPaidOut).reduce((s, p) => s + p.netProfit, 0).toFixed(0)} د.م</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="text-sm text-blue-600">COD في الانتظار</div>
              <div className="text-2xl font-bold text-blue-700">
                {profits.filter(p => p.order.paymentStatus === 'UNPAID' && p.order.status === 'DELIVERED').reduce((s, p) => s + p.order.codAmount, 0).toFixed(0)} د.م
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-right">رقم الطلب</th>
                  <th className="px-4 py-3 text-right">العميل</th>
                  <th className="px-4 py-3 text-right">الإيراد</th>
                  <th className="px-4 py-3 text-right">التكلفة</th>
                  <th className="px-4 py-3 text-right">الشحن</th>
                  <th className="px-4 py-3 text-right">الربح</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profits.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.order.orderNumber}</td>
                    <td className="px-4 py-3 font-medium">{p.order.clientName}</td>
                    <td className="px-4 py-3">{p.revenue.toFixed(0)} د.م</td>
                    <td className="px-4 py-3 text-red-600">{p.cogs.toFixed(0)} د.م</td>
                    <td className="px-4 py-3 text-orange-600">{p.shippingCost.toFixed(0)} د.م</td>
                    <td className="px-4 py-3 font-bold text-green-700">{p.netProfit.toFixed(0)} د.م</td>
                    <td className="px-4 py-3">
                      {p.isPaidOut
                        ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">محوّل</span>
                        : <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">في الانتظار</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {profits.length === 0 && (
              <div className="text-center py-8 text-gray-400">لا توجد بيانات أرباح بعد</div>
            )}
          </div>
        </div>
      )}

      {/* ── Payouts Tab ── */}
      {tab === 'payouts' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">سجل التحويلات ({payouts.length})</h2>
            <button onClick={() => setShowPayoutForm(true)} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700">
              <Plus size={15} /> تسجيل تحويل
            </button>
          </div>

          <div className="space-y-2">
            {payouts.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-800 text-lg">{p.amount.toFixed(0)} <span className="text-sm font-normal text-gray-500">د.م</span></div>
                    <div className="text-sm text-gray-500">{p.ordersCount} طلب · {p.method === 'BANK_TRANSFER' ? 'تحويل بنكي' : p.method === 'CASH' ? 'نقداً' : 'أخرى'}</div>
                    {p.reference && <div className="text-xs text-gray-400">مرجع: {p.reference}</div>}
                    {p.notes && <div className="text-xs text-gray-400">{p.notes}</div>}
                  </div>
                  <div className="text-left">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.status === 'PAID' ? 'مدفوع' : 'معلق'}
                    </span>
                    <div className="text-xs text-gray-400 mt-1">{new Date(p.createdAt).toLocaleDateString('ar-MA')}</div>
                  </div>
                </div>
                {(p.periodStart || p.periodEnd) && (
                  <div className="text-xs text-gray-400 mt-2">
                    الفترة: {p.periodStart ? new Date(p.periodStart).toLocaleDateString('ar-MA') : '—'} → {p.periodEnd ? new Date(p.periodEnd).toLocaleDateString('ar-MA') : '—'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {payouts.length === 0 && (
            <EmptyState icon={<DollarSign size={40} className="text-gray-300" />} text="لا توجد تحويلات بعد" sub="سجّل أول تحويل لأرباحك" />
          )}
        </div>
      )}

      {/* ── Modals ── */}

      {/* Product Form Modal */}
      {showProductForm && (
        <Modal title={editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'} onClose={() => setShowProductForm(false)}>
          <div className="space-y-3">
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg flex gap-2"><AlertCircle size={16} />{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="الاسم (فرنسي)" value={productForm.name} onChange={v => setProductForm(f => ({ ...f, name: v }))} />
              <FormField label="الاسم (عربي)" value={productForm.nameAr} onChange={v => setProductForm(f => ({ ...f, nameAr: v }))} />
              <SelectField label="الفئة" value={productForm.category} onChange={v => setProductForm(f => ({ ...f, category: v }))} options={COOP_CATEGORIES} />
              <FormField label="SKU" value={productForm.sku} onChange={v => setProductForm(f => ({ ...f, sku: v }))} />
              <FormField label="سعر الشراء (د.م)" type="number" value={productForm.costPrice} onChange={v => setProductForm(f => ({ ...f, costPrice: v }))} />
              <FormField label="سعر البيع (د.م)" type="number" value={productForm.sellingPrice} onChange={v => setProductForm(f => ({ ...f, sellingPrice: v }))} />
              <FormField label="العمولة (د.م)" type="number" value={productForm.commission} onChange={v => setProductForm(f => ({ ...f, commission: v }))} />
              <FormField label="الوحدة" value={productForm.unit} onChange={v => setProductForm(f => ({ ...f, unit: v }))} />
            </div>
            {productForm.costPrice && productForm.sellingPrice && (
              <div className="bg-green-50 rounded-lg p-3 text-center text-sm">
                هامش الربح: <span className="font-bold text-green-700">{(parseFloat(productForm.sellingPrice) - parseFloat(productForm.costPrice)).toFixed(2)} د.م</span>
                {' '}({productForm.costPrice !== '0' ? ((parseFloat(productForm.sellingPrice) - parseFloat(productForm.costPrice)) / parseFloat(productForm.costPrice) * 100).toFixed(1) : 0}%)
              </div>
            )}
            <ModalFooter onClose={() => setShowProductForm(false)} onSave={saveProduct} loading={loading} />
          </div>
        </Modal>
      )}

      {/* Stock Form Modal */}
      {showStockForm && (
        <Modal title="إدخال حركة مستودع" onClose={() => setShowStockForm(false)}>
          <div className="space-y-3">
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">المنتج</label>
              <select value={stockForm.productId} onChange={e => setStockForm(f => ({ ...f, productId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">اختر منتجاً...</option>
                {products.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.id}>{p.nameAr || p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">نوع الحركة</label>
              <select value={stockForm.type} onChange={e => setStockForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="IN">دخول (شراء / استلام)</option>
                <option value="OUT">خروج</option>
                <option value="RETURN">إرجاع من عميل</option>
                <option value="ADJUST">تعديل جرد</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="الكمية" type="number" value={stockForm.quantity} onChange={v => setStockForm(f => ({ ...f, quantity: v }))} />
              <FormField label="سعر الوحدة (د.م)" type="number" value={stockForm.unitCost} onChange={v => setStockForm(f => ({ ...f, unitCost: v }))} />
              <FormField label="المرجع" value={stockForm.reference} onChange={v => setStockForm(f => ({ ...f, reference: v }))} />
              <FormField label="ملاحظات" value={stockForm.notes} onChange={v => setStockForm(f => ({ ...f, notes: v }))} />
            </div>
            <ModalFooter onClose={() => setShowStockForm(false)} onSave={saveStock} loading={loading} />
          </div>
        </Modal>
      )}

      {/* Order Form Modal */}
      {showOrderForm && (
        <Modal title="طلب جديد" onClose={() => setShowOrderForm(false)} wide>
          <div className="space-y-4">
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="اسم العميل" value={orderForm.clientName} onChange={v => setOrderForm(f => ({ ...f, clientName: v }))} />
              <FormField label="رقم الهاتف" value={orderForm.clientPhone} onChange={v => setOrderForm(f => ({ ...f, clientPhone: v }))} />
              <FormField label="العنوان" value={orderForm.clientAddress} onChange={v => setOrderForm(f => ({ ...f, clientAddress: v }))} />
              <FormField label="المدينة" value={orderForm.clientCity} onChange={v => setOrderForm(f => ({ ...f, clientCity: v }))} />
              <FormField label="تكلفة الشحن (د.م)" type="number" value={orderForm.shippingCost} onChange={v => setOrderForm(f => ({ ...f, shippingCost: v }))} />
              <FormField label="شركة التوصيل" value={orderForm.carrier} onChange={v => setOrderForm(f => ({ ...f, carrier: v }))} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">المنتجات</label>
                <button onClick={addOrderItem} className="text-blue-600 text-xs hover:underline flex items-center gap-1"><Plus size={13} /> إضافة منتج</button>
              </div>
              <div className="space-y-2">
                {orderForm.items.map((it, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={it.productId}
                      onChange={e => updateOrderItem(i, 'productId', e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    >
                      <option value="">اختر منتجاً...</option>
                      {products.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id}>{p.nameAr || p.name} — {p.sellingPrice} د.م</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={e => updateOrderItem(i, 'quantity', e.target.value)}
                      className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none"
                      placeholder="الكمية"
                    />
                    {orderForm.items.length > 1 && (
                      <button onClick={() => removeOrderItem(i)} className="text-red-400 hover:text-red-600 p-1"><X size={15} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* COD Preview */}
            {orderForm.items.some(it => it.productId) && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                {(() => {
                  const total = orderForm.items.reduce((s, it) => {
                    const p = products.find(x => x.id === it.productId);
                    return s + (p ? p.sellingPrice * parseFloat(it.quantity || '0') : 0);
                  }, 0);
                  const shipping = parseFloat(orderForm.shippingCost || '0');
                  return (
                    <div className="flex justify-between">
                      <span className="text-gray-500">مبلغ COD المتوقع:</span>
                      <span className="font-bold text-blue-700">{(total + shipping).toFixed(0)} د.م</span>
                    </div>
                  );
                })()}
              </div>
            )}

            <FormField label="ملاحظات" value={orderForm.notes} onChange={v => setOrderForm(f => ({ ...f, notes: v }))} />
            <ModalFooter onClose={() => setShowOrderForm(false)} onSave={saveOrder} loading={loading} saveLabel="إنشاء الطلب" />
          </div>
        </Modal>
      )}

      {/* Payout Form Modal */}
      {showPayoutForm && (
        <Modal title="تسجيل تحويل أرباح" onClose={() => setShowPayoutForm(false)}>
          <div className="space-y-3">
            {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="المبلغ (د.م)" type="number" value={payoutForm.amount} onChange={v => setPayoutForm(f => ({ ...f, amount: v }))} />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">طريقة الدفع</label>
                <select value={payoutForm.method} onChange={e => setPayoutForm(f => ({ ...f, method: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                  <option value="CASH">نقداً</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </div>
              <FormField label="المرجع" value={payoutForm.reference} onChange={v => setPayoutForm(f => ({ ...f, reference: v }))} />
              <FormField label="من تاريخ" type="date" value={payoutForm.periodStart} onChange={v => setPayoutForm(f => ({ ...f, periodStart: v }))} />
              <FormField label="إلى تاريخ" type="date" value={payoutForm.periodEnd} onChange={v => setPayoutForm(f => ({ ...f, periodEnd: v }))} />
              <FormField label="ملاحظات" value={payoutForm.notes} onChange={v => setPayoutForm(f => ({ ...f, notes: v }))} />
            </div>
            <ModalFooter onClose={() => setShowPayoutForm(false)} onSave={savePayout} loading={loading} saveLabel="تسجيل التحويل" />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  const bg: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200', yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200', purple: 'bg-purple-50 border-purple-200',
  };
  return (
    <div className={`rounded-xl border p-3 flex items-center gap-3 ${bg[color] || 'bg-gray-50 border-gray-200'}`}>
      <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="font-bold text-gray-800">{value}</div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, icon, label, color }: { onClick: () => void; icon: React.ReactNode; label: string; color: string }) {
  const cls: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
    green: 'bg-green-100 text-green-700 hover:bg-green-200',
    orange: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    teal: 'bg-teal-100 text-teal-700 hover:bg-teal-200',
    red: 'bg-red-100 text-red-600 hover:bg-red-200',
    gray: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${cls[color] || cls.gray}`}>
      {icon} {label}
    </button>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const COOP_CATEGORIES = [
  'زيت أركان', 'زيت الزيتون', 'الزعفران', 'العسل', 'الأعشاب الطبية',
  'التمر', 'اللوز', 'المربى والمعلبات', 'منتجات الألبان', 'الخضروات والفواكه',
  'المنسوجات والسجاد', 'التطريز والخياطة', 'الصناعة التقليدية', 'الفخار والخزف',
  'منتجات الجلد', 'الخشب والنجارة', 'الحلي والمجوهرات', 'منتجات التجميل الطبيعية',
  'الحناء', 'الملابس التقليدية', 'السجاد والزرابي', 'الحرير والنسيج',
  'الأرغان والزيوت', 'النباتات العطرية', 'المنتجات البيولوجية',
  'غذاء', 'زراعة', 'منزل', 'جمال', 'رياضة', 'ملابس', 'أحذية', 'إلكترونيات',
];

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
      >
        <option value="">-- اختر الفئة --</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    </div>
  );
}

function ModalFooter({ onClose, onSave, loading, saveLabel = 'حفظ' }: { onClose: () => void; onSave: () => void; loading: boolean; saveLabel?: string }) {
  return (
    <div className="flex gap-2 justify-end pt-2">
      <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">إلغاء</button>
      <button onClick={onSave} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
        {loading ? '...' : saveLabel}
      </button>
    </div>
  );
}

function EmptyState({ icon, text, sub }: { icon: React.ReactNode; text: string; sub: string }) {
  return (
    <div className="text-center py-12 space-y-2">
      <div className="flex justify-center">{icon}</div>
      <div className="font-medium text-gray-500">{text}</div>
      <div className="text-sm text-gray-400">{sub}</div>
    </div>
  );
}
