import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Plus, Edit2, Trash2, X, AlertCircle, Users, FileText, Clock, CheckCircle, RotateCcw, Search } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { coopApi } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product { id: string; name: string; unit: string; currentStock: number; }
interface CoopClient { id: string; name: string; phone?: string; email?: string; address?: string; city?: string; notes?: string; }
interface SaleItem { productId?: string; description: string; quantity: number; unitPrice: number; subtotal: number; product?: { name: string; unit: string } }
interface CoopSale {
  id: string; saleNumber: string; clientId?: string; clientName: string;
  date: string; status: string; totalAmount: number; discount: number;
  paidAmount: number; paymentMethod?: string; notes?: string;
  client?: CoopClient; items: SaleItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const SaleStatusBadge: React.FC<{ status: string; ar: boolean }> = ({ status, ar }) => {
  const map: Record<string, { fr: string; ar: string; cls: string }> = {
    DRAFT:     { fr: 'Brouillon', ar: 'مسودة',   cls: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
    COMPLETED: { fr: 'Terminée',  ar: 'مكتملة',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    CANCELLED: { fr: 'Annulée',   ar: 'ملغاة',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
    RETURNED:  { fr: 'Retournée', ar: 'مردودة',  cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  };
  const s = map[status] || map.DRAFT;
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.cls}`}>{ar ? s.ar : s.fr}</span>;
};

// ── Main Component ────────────────────────────────────────────────────────────

export const CoopVentesPage: React.FC = () => {
  const { lang } = useLanguage();
  const { organization } = useAuth();
  const ar = lang === 'ar';

  const fmt = (n: number) => new Intl.NumberFormat(ar ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString(ar ? 'ar-MA' : 'fr-FR') : '—';

  const [subTab, setSubTab]     = useState<'sales' | 'clients'>('sales');
  const [sales, setSales]       = useState<CoopSale[]>([]);
  const [clients, setClients]   = useState<CoopClient[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [saleModal, setSaleModal]     = useState(false);
  const [clientModal, setClientModal] = useState(false);
  const [editSale, setEditSale]       = useState<CoopSale | null>(null);
  const [editClient, setEditClient]   = useState<CoopClient | null>(null);

  // Forms
  const [saleForm, setSaleForm] = useState({
    clientId: '', clientName: '', date: '', paymentMethod: 'CASH',
    discount: '0', paidAmount: '0', notes: '', items: [] as SaleItem[],
  });
  const [newItem, setNewItem] = useState({ productId: '', description: '', quantity: '1', unitPrice: '' });
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '', address: '', city: '', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, p, st] = await Promise.all([coopApi.getSales(), coopApi.getClients(), coopApi.getProducts(), coopApi.getSalesStats()]);
      setSales(s.data); setClients(c.data); setProducts(p.data); setStats(st.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Sale handlers ─────────────────────────────────────────────────────────

  const openSaleModal = (s?: CoopSale) => {
    if (s) {
      setEditSale(s);
      setSaleForm({ clientId: s.clientId || '', clientName: s.clientName, date: s.date?.slice(0,10) || '', paymentMethod: s.paymentMethod || 'CASH', discount: String(s.discount), paidAmount: String(s.paidAmount), notes: s.notes || '', items: s.items.map(i => ({ ...i })) });
    } else {
      setEditSale(null);
      setSaleForm({ clientId: '', clientName: '', date: new Date().toISOString().slice(0,10), paymentMethod: 'CASH', discount: '0', paidAmount: '0', notes: '', items: [] });
    }
    setNewItem({ productId: '', description: '', quantity: '1', unitPrice: '' });
    setSaleModal(true);
  };

  const addItem = () => {
    if (!newItem.description || !newItem.unitPrice) return;
    const qty = parseFloat(newItem.quantity) || 1;
    const price = parseFloat(newItem.unitPrice) || 0;
    const product = products.find(p => p.id === newItem.productId);
    setSaleForm(f => ({
      ...f,
      items: [...f.items, { productId: newItem.productId || undefined, description: newItem.description, quantity: qty, unitPrice: price, subtotal: qty * price, product: product ? { name: product.name, unit: product.unit } : undefined }],
    }));
    setNewItem({ productId: '', description: '', quantity: '1', unitPrice: '' });
  };

  const saveSale = async () => {
    try {
      if (editSale) await coopApi.updateSale(editSale.id, saleForm);
      else await coopApi.createSale(saleForm);
      setSaleModal(false); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
  };

  const updateSaleStatus = async (id: string, status: string) => {
    try { await coopApi.updateSale(id, { status }); load(); }
    catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
  };

  const deleteSale = async (id: string) => {
    if (!confirm(ar ? 'حذف عملية البيع؟' : 'Supprimer cette vente ?')) return;
    await coopApi.deleteSale(id); load();
  };

  // ── Client handlers ───────────────────────────────────────────────────────

  const openClientModal = (c?: CoopClient) => {
    if (c) { setEditClient(c); setClientForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', city: c.city || '', notes: c.notes || '' }); }
    else   { setEditClient(null); setClientForm({ name: '', phone: '', email: '', address: '', city: '', notes: '' }); }
    setClientModal(true);
  };

  const saveClient = async () => {
    try {
      if (editClient) await coopApi.updateClient(editClient.id, clientForm);
      else await coopApi.createClient(clientForm);
      setClientModal(false); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Erreur'); }
  };

  const deleteClient = async (id: string) => {
    if (!confirm(ar ? 'حذف العميل؟' : 'Supprimer ce client ?')) return;
    await coopApi.deleteClient(id); load();
  };

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filteredSales = sales.filter(s => {
    const matchStatus = filterStatus === 'ALL' || s.status === filterStatus;
    const matchSearch = !search || s.clientName.toLowerCase().includes(search.toLowerCase()) || s.saleNumber.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filteredClients = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').includes(search) || (c.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const saleTotal = (s: CoopSale) => s.items.reduce((a, i) => a + i.subtotal, 0) - parseFloat(saleForm.discount || '0');

  return (
    <div className="p-4 space-y-5" dir={ar ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)' }}>
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <TrendingUp size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{ar ? 'إدارة المبيعات' : 'Gestion des Ventes'}</h1>
          <p className="text-sm text-teal-100 mt-0.5">{organization?.name}</p>
        </div>
        <button onClick={() => subTab === 'sales' ? openSaleModal() : openClientModal()} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0">
          <Plus size={16} />{subTab === 'sales' ? (ar ? 'بيع جديد' : 'Nouvelle vente') : (ar ? 'عميل جديد' : 'Nouveau client')}
        </button>
      </div>

      {/* KPI cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: ar ? 'إجمالي المبيعات' : 'Total ventes',  value: `${fmt(stats.totalRevenue)} MAD`, icon: <TrendingUp size={18} />, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: ar ? 'في الانتظار' : 'En attente',         value: `${fmt(stats.pendingRevenue)} MAD`, icon: <Clock size={18} />,      color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
            { label: ar ? 'عدد العملاء' : 'Clients',            value: stats.totalClients,               icon: <Users size={18} />,      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
            { label: ar ? 'عدد العمليات' : 'Nbre ventes',       value: stats.totalSales,                 icon: <FileText size={18} />,   color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
          ].map((k, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color}`}>{k.icon}</div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{k.label}</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{k.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button onClick={() => { setSubTab('sales'); setSearch(''); setFilterStatus('ALL'); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${subTab === 'sales' ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {ar ? 'المبيعات' : 'Ventes'} ({sales.length})
          </button>
          <button onClick={() => { setSubTab('clients'); setSearch(''); }} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${subTab === 'clients' ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {ar ? 'العملاء' : 'Clients'} ({clients.length})
          </button>
        </div>
        <div className="flex-1 relative min-w-48">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={subTab === 'sales' ? (ar ? 'بحث باسم العميل أو رقم البيع...' : 'Chercher par client ou numéro...') : (ar ? 'بحث بالاسم أو المدينة...' : 'Chercher par nom ou ville...')} className="w-full ps-9 pe-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
        </div>
      </div>

      {/* Status filter (sales only) */}
      {subTab === 'sales' && (
        <div className="flex gap-1 flex-wrap">
          {[
            { k: 'ALL', fr: 'Tout', ar: 'الكل' },
            { k: 'DRAFT', fr: 'Brouillon', ar: 'مسودة' },
            { k: 'COMPLETED', fr: 'Terminée', ar: 'مكتملة' },
            { k: 'CANCELLED', fr: 'Annulée', ar: 'ملغاة' },
            { k: 'RETURNED', fr: 'Retournée', ar: 'مردودة' },
          ].map(f => (
            <button key={f.k} onClick={() => setFilterStatus(f.k)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${filterStatus === f.k ? 'bg-teal-600 text-white border-teal-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-teal-400'}`}>
              {ar ? f.ar : f.fr}
              {f.k !== 'ALL' && ` (${sales.filter(s => s.status === f.k).length})`}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />{error}
          <button onClick={() => setError('')} className="ms-auto"><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">{ar ? 'جاري التحميل...' : 'Chargement...'}</div>
      ) : (
        <>
          {/* ── Sales list ── */}
          {subTab === 'sales' && (
            filteredSales.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <TrendingUp size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">{ar ? 'لا توجد مبيعات' : 'Aucune vente'}</p>
                <button onClick={() => openSaleModal()} className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm hover:bg-teal-700">
                  {ar ? '+ تسجيل أول بيع' : '+ Créer la première vente'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSales.map(sale => {
                  const balance = sale.totalAmount - sale.paidAmount;
                  const paidPct = sale.totalAmount > 0 ? Math.min(100, (sale.paidAmount / sale.totalAmount) * 100) : 0;
                  return (
                    <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start gap-4 flex-wrap">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900 dark:text-white">{sale.clientName}</span>
                            <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{sale.saleNumber}</span>
                            <SaleStatusBadge status={sale.status} ar={ar} />
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm">
                            <span className="text-gray-500">{fmtDate(sale.date)}</span>
                            <span className="text-gray-500">{ar ? 'المبلغ:' : 'Montant:'} <strong className="text-gray-800 dark:text-gray-200">{fmt(sale.totalAmount)} MAD</strong></span>
                            {sale.paidAmount > 0 && <span className="text-gray-500">{ar ? 'مدفوع:' : 'Payé:'} <strong className="text-emerald-600">{fmt(sale.paidAmount)} MAD</strong></span>}
                            {balance > 0 && sale.status !== 'CANCELLED' && <span className="text-amber-600 font-medium">{ar ? 'الباقي:' : 'Reste:'} {fmt(balance)} MAD</span>}
                            {sale.paymentMethod && <span className="text-gray-400 capitalize text-xs">{sale.paymentMethod === 'CASH' ? (ar ? 'نقداً' : 'Espèces') : sale.paymentMethod === 'TRANSFER' ? (ar ? 'تحويل' : 'Virement') : (ar ? 'شيك' : 'Chèque')}</span>}
                          </div>

                          {/* Payment progress */}
                          {sale.status === 'COMPLETED' && sale.totalAmount > 0 && (
                            <div className="space-y-0.5">
                              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${paidPct}%` }} />
                              </div>
                              <div className="text-xs text-gray-400">{Math.round(paidPct)}% {ar ? 'مسدد' : 'payé'}</div>
                            </div>
                          )}

                          {/* Items */}
                          {sale.items.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {sale.items.map((item, i) => (
                                <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                  {item.product?.name || item.description} ×{item.quantity} — {fmt(item.subtotal)} MAD
                                </span>
                              ))}
                            </div>
                          )}

                          {sale.notes && <p className="text-xs text-gray-400 italic">{sale.notes}</p>}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <div className="flex gap-1">
                            <button onClick={() => openSaleModal(sale)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Edit2 size={15} /></button>
                            <button onClick={() => deleteSale(sale.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={15} /></button>
                          </div>
                          {sale.status === 'DRAFT' && (
                            <button onClick={() => updateSaleStatus(sale.id, 'COMPLETED')} className="px-3 py-1.5 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle size={12} />{ar ? 'تأكيد' : 'Confirmer'}
                            </button>
                          )}
                          {sale.status === 'DRAFT' && (
                            <button onClick={() => updateSaleStatus(sale.id, 'CANCELLED')} className="px-3 py-1.5 text-xs bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-medium">
                              {ar ? 'إلغاء' : 'Annuler'}
                            </button>
                          )}
                          {sale.status === 'COMPLETED' && (
                            <button onClick={() => updateSaleStatus(sale.id, 'RETURNED')} className="px-3 py-1.5 text-xs bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 font-medium flex items-center gap-1">
                              <RotateCcw size={12} />{ar ? 'مردود' : 'Retour'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── Clients list ── */}
          {subTab === 'clients' && (
            filteredClients.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Users size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-base font-medium">{ar ? 'لا يوجد عملاء' : 'Aucun client'}</p>
                <button onClick={() => openClientModal()} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm hover:bg-indigo-700">
                  {ar ? '+ إضافة أول عميل' : '+ Ajouter le premier client'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredClients.map(cl => {
                  const clientSales   = sales.filter(s => s.clientId === cl.id);
                  const totalSpent    = clientSales.filter(s => s.status === 'COMPLETED').reduce((a, s) => a + s.totalAmount, 0);
                  const pendingAmount = clientSales.filter(s => s.status === 'DRAFT').reduce((a, s) => a + s.totalAmount, 0);
                  return (
                    <div key={cl.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-900 dark:text-white truncate">{cl.name}</div>
                          {cl.phone && <div className="text-sm text-gray-500 mt-0.5">{cl.phone}</div>}
                          {cl.email && <div className="text-xs text-gray-400 truncate">{cl.email}</div>}
                          {cl.city  && <div className="text-xs text-gray-400">{cl.city}{cl.address ? ` — ${cl.address}` : ''}</div>}
                          {cl.notes && <div className="text-xs text-gray-400 italic mt-1 truncate">{cl.notes}</div>}

                          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-4 text-sm">
                            <div><div className="text-xs text-gray-400">{ar ? 'عمليات' : 'Ventes'}</div><div className="font-semibold text-gray-800 dark:text-gray-200">{clientSales.length}</div></div>
                            {totalSpent > 0 && <div><div className="text-xs text-gray-400">{ar ? 'مجموع' : 'Total'}</div><div className="font-semibold text-emerald-600">{fmt(totalSpent)} MAD</div></div>}
                            {pendingAmount > 0 && <div><div className="text-xs text-gray-400">{ar ? 'معلق' : 'En attente'}</div><div className="font-semibold text-amber-600">{fmt(pendingAmount)} MAD</div></div>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => openClientModal(cl)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Edit2 size={15} /></button>
                          <button onClick={() => deleteClient(cl.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={15} /></button>
                          <button onClick={() => { setSubTab('sales'); setSaleModal(true); setEditSale(null); setSaleForm(f => ({ ...f, clientId: cl.id, clientName: cl.name })); }} className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/20 hover:bg-teal-100 text-teal-600" title={ar ? 'بيع جديد' : 'Nouvelle vente'}><Plus size={15} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </>
      )}

      {/* ── Sale Modal ── */}
      {saleModal && (
        <Modal title={editSale ? (ar ? 'تعديل البيع' : 'Modifier la vente') : (ar ? 'بيع جديد' : 'Nouvelle vente')} onClose={() => setSaleModal(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'العميل' : 'Client'}</label>
                <select value={saleForm.clientId} onChange={e => { const cl = clients.find(c => c.id === e.target.value); setSaleForm(f => ({ ...f, clientId: e.target.value, clientName: cl?.name || f.clientName })); }} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="">{ar ? '-- اختر عميلاً --' : '-- Choisir un client --'}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'اسم العميل *' : 'Nom client *'}</label>
                <input value={saleForm.clientName} onChange={e => setSaleForm(f => ({ ...f, clientName: e.target.value }))} placeholder={ar ? 'أو اكتب اسماً' : 'ou saisir un nom'} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'التاريخ' : 'Date'}</label>
                <input type="date" value={saleForm.date} onChange={e => setSaleForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'طريقة الدفع' : 'Mode de paiement'}</label>
                <select value={saleForm.paymentMethod} onChange={e => setSaleForm(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="CASH">{ar ? 'نقداً' : 'Espèces'}</option>
                  <option value="TRANSFER">{ar ? 'تحويل بنكي' : 'Virement'}</option>
                  <option value="CHEQUE">{ar ? 'شيك' : 'Chèque'}</option>
                </select>
              </div>
            </div>

            {/* Items */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300">{ar ? 'المنتجات / الخدمات' : 'Articles / Services'}</div>
              {saleForm.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2">
                  <div className="flex-1 text-gray-800 dark:text-gray-200 truncate">{item.product?.name || item.description}</div>
                  <div className="text-gray-500 text-xs flex-shrink-0">{item.quantity} × {fmt(item.unitPrice)} MAD</div>
                  <div className="font-semibold text-emerald-600 flex-shrink-0">{fmt(item.subtotal)} MAD</div>
                  <button onClick={() => setSaleForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} className="text-red-500 hover:text-red-700 flex-shrink-0"><X size={14} /></button>
                </div>
              ))}
              {/* Add item row */}
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-5">
                  <select value={newItem.productId} onChange={e => { const p = products.find(x => x.id === e.target.value); setNewItem(f => ({ ...f, productId: e.target.value, description: p?.name || f.description, unitPrice: '' })); }} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs">
                    <option value="">{ar ? 'منتج من المخزون' : 'Produit du stock'}</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <input placeholder={ar ? 'وصف *' : 'Description *'} value={newItem.description} onChange={e => setNewItem(f => ({ ...f, description: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                </div>
                <div className="col-span-2">
                  <input type="number" placeholder={ar ? 'كمية' : 'Qté'} value={newItem.quantity} onChange={e => setNewItem(f => ({ ...f, quantity: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                </div>
                <div className="col-span-2 flex gap-1">
                  <input type="number" placeholder={ar ? 'سعر' : 'Prix'} value={newItem.unitPrice} onChange={e => setNewItem(f => ({ ...f, unitPrice: e.target.value }))} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                  <button onClick={addItem} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"><Plus size={14} /></button>
                </div>
              </div>
              {saleForm.items.length > 0 && (
                <div className="text-end text-sm font-bold text-emerald-600 pt-1 border-t border-gray-200 dark:border-gray-700">
                  {ar ? 'المجموع:' : 'Total:'} {fmt(saleForm.items.reduce((s, i) => s + i.subtotal, 0))} MAD
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'الخصم (MAD)' : 'Remise (MAD)'}</label>
                <input type="number" value={saleForm.discount} onChange={e => setSaleForm(f => ({ ...f, discount: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'المبلغ المدفوع (MAD)' : 'Montant payé (MAD)'}</label>
                <input type="number" value={saleForm.paidAmount} onChange={e => setSaleForm(f => ({ ...f, paidAmount: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>

            {saleForm.items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-500">{ar ? 'المجموع الفرعي' : 'Sous-total'}</span><span>{fmt(saleForm.items.reduce((s, i) => s + i.subtotal, 0))} MAD</span></div>
                {parseFloat(saleForm.discount) > 0 && <div className="flex justify-between text-red-500"><span>{ar ? 'الخصم' : 'Remise'}</span><span>− {fmt(parseFloat(saleForm.discount))} MAD</span></div>}
                <div className="flex justify-between font-bold border-t border-gray-200 dark:border-gray-600 pt-1"><span>{ar ? 'الإجمالي' : 'Total'}</span><span className="text-emerald-600">{fmt(saleTotal(editSale || {} as CoopSale))} MAD</span></div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={saleForm.notes} onChange={e => setSaleForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <button onClick={saveSale} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700 transition-colors">
              {ar ? 'حفظ' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Client Modal ── */}
      {clientModal && (
        <Modal title={editClient ? (ar ? 'تعديل العميل' : 'Modifier le client') : (ar ? 'عميل جديد' : 'Nouveau client')} onClose={() => setClientModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'الاسم الكامل *' : 'Nom complet *'}</label>
              <input value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'الهاتف' : 'Téléphone'}</label>
                <input value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'المدينة' : 'Ville'}</label>
                <input value={clientForm.city} onChange={e => setClientForm(f => ({ ...f, city: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'البريد الإلكتروني' : 'Email'}</label>
              <input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'العنوان' : 'Adresse'}</label>
              <input value={clientForm.address} onChange={e => setClientForm(f => ({ ...f, address: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <button onClick={saveClient} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-colors">
              {ar ? 'حفظ' : 'Enregistrer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
