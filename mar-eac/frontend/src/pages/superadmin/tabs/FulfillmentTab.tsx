import React, { useEffect, useState, useCallback } from 'react';
import { Package, Truck, DollarSign, Clock, RefreshCw, AlertTriangle, X } from 'lucide-react';
import api from '../../../lib/api';

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
  { key: 'PENDING',   label: 'انتظار',    bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800' },
  { key: 'CONFIRMED', label: 'تأكّد',      bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-800' },
  { key: 'SHIPPED',   label: 'في الطريق', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
  { key: 'DELIVERED', label: 'وصل',        bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-800' },
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
  const todayOrders  = orders.filter(o => new Date(o.orderDate).toDateString() === today);
  const pendingCount = orders.filter(o => o.status === 'PENDING').length;
  const shippedCount = orders.filter(o => o.status === 'SHIPPED').length;
  const todayRevenue = todayOrders.reduce((s, o) => s + o.totalAmount, 0);

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

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw size={24} className="animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Package size={20} className="text-purple-600" />, label: 'طلبات اليوم', value: todayOrders.length, bg: 'bg-purple-50' },
          { icon: <Clock size={20} className="text-amber-600" />, label: 'في الانتظار', value: pendingCount, bg: 'bg-amber-50' },
          { icon: <DollarSign size={20} className="text-emerald-600" />, label: 'رقم اليوم د.م', value: todayRevenue.toFixed(0), bg: 'bg-emerald-50' },
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
        <button onClick={exportCsv}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors">
          📊 تصدير CSV
        </button>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
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
                    <div key={o.id}
                      onClick={() => { setSelected(o); setTrackInput(o.trackingNumber || ''); }}
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
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />تنبيهات المخزون
          </h3>
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
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                <X size={16} />
              </button>
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
