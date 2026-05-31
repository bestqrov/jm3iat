import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Package, Truck, MapPin, X, ChevronRight } from 'lucide-react';
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
  const [input, setInput]     = useState(paramOrder || '');
  const [order, setOrder]     = useState<TrackOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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

      {/* Top bar */}
      <div style={{ background: 'linear-gradient(90deg,#6c3fc5,#8b5cf6)' }} className="text-white text-xs py-1.5 text-center">
        🚚 تتبع طلبك في أي وقت
      </div>

      {/* Header */}
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
                  {/* Progress line */}
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
