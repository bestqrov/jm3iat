import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Package, ArrowDownUp, Users, FileText,
  BarChart2, Plus, Trash2, Edit2, X,
  TrendingUp, AlertCircle, CheckCircle, Clock,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { coopApi, membersApi } from '../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product { id: string; name: string; nameAr?: string; unit: string; category?: string; currentStock: number; isActive: boolean; }
interface Movement { id: string; productId: string; type: 'IN'|'OUT'|'ADJUST'; quantity: number; unitPrice?: number; date: string; reference?: string; notes?: string; product?: { name: string; unit: string }; }
interface Share { id: string; memberId: string; memberName: string; sharesCount: number; sharesPaid: number; paidAt?: string; notes?: string; }
interface InvoiceItem { id?: string; productId?: string; description: string; quantity: number; unitPrice: number; subtotal: number; }
interface Invoice { id: string; type: 'DEVIS'|'FACTURE'|'BL'; number: string; clientName: string; clientPhone?: string; clientAddress?: string; status: string; totalAmount: number; date: string; dueDate?: string; notes?: string; items: InvoiceItem[]; }
interface Stats { activeProducts: number; membersWithShares: number; totalShares: number; paidShares: number; shareValue: number; capitalSocial: number; totalRevenue: number; pendingRevenue: number; lowStockProducts: number; stockSummary: {id:string;name:string;stock:number;unit:string}[]; }
interface Member { id: string; name: string; }

type Tab = 'dashboard'|'shares'|'stock'|'invoices'|'reports';

// ── Modal wrapper ─────────────────────────────────────────────────────────────

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

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string|number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  </div>
);

// ── Invoice status badge ──────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: string; t: any }> = ({ status, t }) => {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    SENT:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    PAID:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || map.DRAFT}`}>
      {(t('coop.invoices') as any)[status] || status}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const CoopPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { organization } = useAuth();
  const ar = lang === 'ar';

  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [productModal, setProductModal]   = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [shareModal, setShareModal]       = useState(false);
  const [invoiceModal, setInvoiceModal]   = useState(false);
  const [editInvoice, setEditInvoice]     = useState<Invoice | null>(null);
  const [editProduct, setEditProduct]     = useState<Product | null>(null);
  const [editShare, setEditShare]         = useState<Share | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({ name: '', nameAr: '', unit: 'unité', category: '' });
  const [movementForm, setMovementForm] = useState({ productId: '', type: 'IN', quantity: '', unitPrice: '', date: '', reference: '', notes: '' });
  const [shareForm, setShareForm] = useState({ memberId: '', memberName: '', sharesCount: '', sharesPaid: '', paidAt: '', notes: '' });
  const [invoiceForm, setInvoiceForm] = useState({ type: 'FACTURE', clientName: '', clientPhone: '', clientAddress: '', date: '', dueDate: '', notes: '', items: [] as InvoiceItem[] });
  const [newItem, setNewItem] = useState({ productId: '', description: '', quantity: '1', unitPrice: '' });
  const [stockFilter, setStockFilter] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('');
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [s, p, m, sh, inv] = await Promise.all([
        coopApi.getStats(),
        coopApi.getProducts(),
        coopApi.getMovements(),
        coopApi.getShares(),
        coopApi.getInvoices(),
      ]);
      setStats(s.data); setProducts(p.data); setMovements(m.data); setShares(sh.data); setInvoices(inv.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const loadReports = useCallback(async () => {
    const r = await coopApi.getReports();
    setReports(r.data);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { if (tab === 'reports') loadReports(); }, [tab, loadReports]);

  // Load members for share form
  useEffect(() => {
    if (shareModal) {
      membersApi.getAll().then(r => setMembers(r.data || [])).catch(() => {});
    }
  }, [shareModal]);

  // ── Product handlers ─────────────────────────────────────────────────────

  const openProductModal = (p?: Product) => {
    if (p) { setEditProduct(p); setProductForm({ name: p.name, nameAr: p.nameAr || '', unit: p.unit, category: p.category || '' }); }
    else   { setEditProduct(null); setProductForm({ name: '', nameAr: '', unit: 'unité', category: '' }); }
    setProductModal(true);
  };

  const saveProduct = async () => {
    try {
      if (editProduct) await coopApi.updateProduct(editProduct.id, productForm);
      else await coopApi.createProduct(productForm);
      setProductModal(false); reload();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm(ar ? 'حذف المنتج؟' : 'Supprimer ce produit ?')) return;
    await coopApi.deleteProduct(id); reload();
  };

  // ── Movement handlers ────────────────────────────────────────────────────

  const saveMovement = async () => {
    try {
      await coopApi.createMovement(movementForm);
      setMovementModal(false); setMovementForm({ productId: '', type: 'IN', quantity: '', unitPrice: '', date: '', reference: '', notes: '' }); reload();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const deleteMovement = async (id: string) => {
    if (!confirm(ar ? 'حذف الحركة؟' : 'Supprimer ce mouvement ?')) return;
    await coopApi.deleteMovement(id); reload();
  };

  // ── Share handlers ───────────────────────────────────────────────────────

  const openShareModal = (s?: Share) => {
    if (s) { setEditShare(s); setShareForm({ memberId: s.memberId, memberName: s.memberName, sharesCount: String(s.sharesCount), sharesPaid: String(s.sharesPaid), paidAt: s.paidAt?.slice(0,10) || '', notes: s.notes || '' }); }
    else   { setEditShare(null); setShareForm({ memberId: '', memberName: '', sharesCount: '', sharesPaid: '', paidAt: '', notes: '' }); }
    setShareModal(true);
  };

  const saveShare = async () => {
    try {
      await coopApi.upsertShare(shareForm);
      setShareModal(false); reload();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const deleteShare = async (id: string) => {
    if (!confirm(ar ? 'حذف الحصة؟' : 'Supprimer cette part ?')) return;
    await coopApi.deleteShare(id); reload();
  };

  // ── Invoice handlers ─────────────────────────────────────────────────────

  const openInvoiceModal = (inv?: Invoice) => {
    if (inv) { setEditInvoice(inv); setInvoiceForm({ type: inv.type, clientName: inv.clientName, clientPhone: inv.clientPhone || '', clientAddress: '', date: inv.date?.slice(0,10) || '', dueDate: inv.dueDate?.slice(0,10) || '', notes: inv.notes || '', items: inv.items.map(i => ({ ...i })) }); }
    else     { setEditInvoice(null); setInvoiceForm({ type: 'FACTURE', clientName: '', clientPhone: '', clientAddress: '', date: '', dueDate: '', notes: '', items: [] }); }
    setNewItem({ productId: '', description: '', quantity: '1', unitPrice: '' });
    setInvoiceModal(true);
  };

  const addInvoiceItem = () => {
    if (!newItem.description || !newItem.unitPrice) return;
    const qty = parseFloat(newItem.quantity) || 1;
    const price = parseFloat(newItem.unitPrice) || 0;
    setInvoiceForm(f => ({ ...f, items: [...f.items, { productId: newItem.productId || undefined, description: newItem.description, quantity: qty, unitPrice: price, subtotal: qty * price }] }));
    setNewItem({ productId: '', description: '', quantity: '1', unitPrice: '' });
  };

  const removeInvoiceItem = (idx: number) => setInvoiceForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const saveInvoice = async () => {
    try {
      const payload = { ...invoiceForm, items: invoiceForm.items };
      if (editInvoice) await coopApi.updateInvoice(editInvoice.id, payload);
      else await coopApi.createInvoice(payload);
      setInvoiceModal(false); reload();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm(ar ? 'حذف الوثيقة؟' : 'Supprimer ce document ?')) return;
    await coopApi.deleteInvoice(id); reload();
  };

  const changeInvoiceStatus = async (inv: Invoice, status: string) => {
    await coopApi.updateInvoice(inv.id, { status }); reload();
  };

  // ── Tab bar ──────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: t('coop.tabs.dashboard'), icon: <LayoutDashboard size={16} /> },
    { key: 'shares',    label: t('coop.tabs.shares'),    icon: <Users size={16} /> },
    { key: 'stock',     label: t('coop.tabs.stock'),     icon: <Package size={16} /> },
    { key: 'invoices',  label: t('coop.tabs.invoices'),  icon: <FileText size={16} /> },
    { key: 'reports',   label: t('coop.tabs.reports'),   icon: <BarChart2 size={16} /> },
  ];

  const fmt = (n: number) => new Intl.NumberFormat(ar ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString(ar ? 'ar-MA' : 'fr-FR') : '—';

  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];
  const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  const shareValue = organization ? ((organization as any).partsValeur || 0) : 0;

  return (
    <div className="p-4 space-y-4" dir={ar ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('coop.title')}</h1>
        {organization && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-end">
            {(organization as any).ice && <div>ICE: {(organization as any).ice}</div>}
            {(organization as any).identifiantFiscal && <div>IF: {(organization as any).identifiantFiscal}</div>}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === tb.key
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {tb.icon}{tb.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} />{error}
          <button onClick={() => setError('')} className="ms-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── DASHBOARD ──────────────────────────────────────────────────── */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          {loading && <div className="text-center text-gray-400 py-8">{ar ? 'جاري التحميل...' : 'Chargement...'}</div>}
          {stats && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label={t('coop.stats.activeProducts')} value={stats.activeProducts} icon={<Package size={18} />} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
                <StatCard label={t('coop.stats.membersWithShares')} value={stats.membersWithShares} icon={<Users size={18} />} color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
                <StatCard label={t('coop.stats.totalRevenue')} value={`${fmt(stats.totalRevenue)} MAD`} icon={<TrendingUp size={18} />} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                <StatCard label={t('coop.stats.pendingRevenue')} value={`${fmt(stats.pendingRevenue)} MAD`} icon={<Clock size={18} />} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label={t('coop.stats.totalShares')} value={fmt(stats.totalShares)} icon={<BarChart2 size={18} />} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatCard label={t('coop.stats.paidShares')} value={fmt(stats.paidShares)} icon={<CheckCircle size={18} />} color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
                <StatCard label={t('coop.stats.capitalSocial')} value={`${fmt(stats.capitalSocial)} MAD`} icon={<TrendingUp size={18} />} color="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" />
                <StatCard label={t('coop.stats.lowStock')} value={stats.lowStockProducts} icon={<AlertCircle size={18} />} color={stats.lowStockProducts > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500'} />
              </div>

              {/* Stock summary */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('coop.products.title')}</h3>
                <div className="space-y-2">
                  {stats.stockSummary.slice(0, 6).map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">{p.name}</div>
                      <div className={`text-sm font-semibold ${p.stock <= 0 ? 'text-red-600' : p.stock < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {fmt(p.stock)} {p.unit}
                      </div>
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${p.stock <= 0 ? 'bg-red-500' : p.stock < 10 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, (p.stock / 100) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SHARES ─────────────────────────────────────────────────────── */}
      {tab === 'shares' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => openShareModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
              <Plus size={16} />{t('coop.shares.add')}
            </button>
          </div>

          {shares.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={40} className="mx-auto mb-2 opacity-30" />
              <p>{t('coop.shares.noShares')}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-start p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.shares.member')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.shares.sharesCount')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.shares.sharesPaid')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.shares.capitalValue')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.shares.paidAt')}</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {shares.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="p-3 font-medium text-gray-900 dark:text-white">{s.memberName}</td>
                      <td className="p-3 text-center">{fmt(s.sharesCount)}</td>
                      <td className="p-3 text-center">
                        <span className={s.sharesPaid >= s.sharesCount ? 'text-emerald-600 font-medium' : 'text-amber-600'}>{fmt(s.sharesPaid)}</span>
                      </td>
                      <td className="p-3 text-center text-gray-700 dark:text-gray-300">{fmt(s.sharesCount * shareValue)} MAD</td>
                      <td className="p-3 text-center text-gray-500">{fmtDate(s.paidAt)}</td>
                      <td className="p-3 flex gap-1 justify-end">
                        <button onClick={() => openShareModal(s)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Edit2 size={14} /></button>
                        <button onClick={() => deleteShare(s.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <tr>
                    <td className="p-3 font-bold text-gray-700 dark:text-gray-300" colSpan={2}>{ar ? 'الإجمالي' : 'Total'}</td>
                    <td className="p-3 text-center font-bold text-emerald-600">{fmt(shares.reduce((s,x)=>s+x.sharesCount,0))}</td>
                    <td className="p-3 text-center font-bold text-indigo-600">{fmt(shares.reduce((s,x)=>s+x.sharesCount,0)*shareValue)} MAD</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STOCK ──────────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-end flex-wrap">
            <button onClick={() => openProductModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
              <Plus size={16} />{t('coop.products.add')}
            </button>
            <button onClick={() => setMovementModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700">
              <ArrowDownUp size={16} />{t('coop.movements.add')}
            </button>
          </div>

          {/* Products */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('coop.products.title')}</h3>
            </div>
            {products.length === 0 ? (
              <div className="text-center py-10 text-gray-400">{t('coop.products.noProducts')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-start p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.products.name')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.products.unit')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.products.category')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.products.currentStock')}</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="p-3">
                        <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                        {p.nameAr && <div className="text-xs text-gray-400">{p.nameAr}</div>}
                      </td>
                      <td className="p-3 text-center text-gray-600 dark:text-gray-400">{p.unit}</td>
                      <td className="p-3 text-center text-gray-600 dark:text-gray-400">{p.category || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`font-semibold ${p.currentStock <= 0 ? 'text-red-600' : p.currentStock < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {fmt(p.currentStock)}
                        </span>
                      </td>
                      <td className="p-3 flex gap-1 justify-end">
                        <button onClick={() => openProductModal(p)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Edit2 size={14} /></button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Movements */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('coop.movements.title')}</h3>
              <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                <option value="">{ar ? 'كل المنتجات' : 'Tous les produits'}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {movements.filter(m => !stockFilter || m.productId === stockFilter).length === 0 ? (
              <div className="text-center py-10 text-gray-400">{t('coop.movements.noMovements')}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-start p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.movements.date')}</th>
                    <th className="text-start p-3 text-gray-600 dark:text-gray-400 font-medium">{ar ? 'المنتج' : 'Produit'}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.movements.type')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.movements.quantity')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.movements.reference')}</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {movements.filter(m => !stockFilter || m.productId === stockFilter).map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="p-3 text-gray-600 dark:text-gray-400">{fmtDate(m.date)}</td>
                      <td className="p-3 text-gray-900 dark:text-white">{m.product?.name}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          m.type === 'IN'  ? 'bg-emerald-100 text-emerald-700' :
                          m.type === 'OUT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>{(t('coop.movements') as any)[m.type]}</span>
                      </td>
                      <td className="p-3 text-center font-semibold text-gray-900 dark:text-white">{fmt(m.quantity)} {m.product?.unit}</td>
                      <td className="p-3 text-center text-gray-500">{m.reference || '—'}</td>
                      <td className="p-3">
                        <button onClick={() => deleteMovement(m.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── INVOICES ───────────────────────────────────────────────────── */}
      {tab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-between flex-wrap">
            <div className="flex gap-2">
              {['', 'DEVIS', 'FACTURE', 'BL'].map(type => (
                <button key={type} onClick={() => setInvoiceTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${invoiceTypeFilter === type ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}>
                  {type ? (t('coop.invoices') as any)[type] : (ar ? 'الكل' : 'Tout')}
                </button>
              ))}
            </div>
            <button onClick={() => openInvoiceModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
              <Plus size={16} />{t('coop.invoices.add')}
            </button>
          </div>

          {invoices.filter(i => !invoiceTypeFilter || i.type === invoiceTypeFilter).length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText size={40} className="mx-auto mb-2 opacity-30" />
              <p>{t('coop.invoices.noInvoices')}</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="text-start p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.invoices.number')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.invoices.type')}</th>
                    <th className="text-start p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.invoices.client')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.invoices.date')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.invoices.total')}</th>
                    <th className="text-center p-3 text-gray-600 dark:text-gray-400 font-medium">{t('coop.invoices.status')}</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {invoices.filter(i => !invoiceTypeFilter || i.type === invoiceTypeFilter).map(inv => (
                    <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="p-3 font-mono text-xs text-indigo-600 dark:text-indigo-400">{inv.number}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          inv.type === 'DEVIS' ? 'bg-purple-100 text-purple-700' :
                          inv.type === 'BL'    ? 'bg-cyan-100 text-cyan-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>{(t('coop.invoices') as any)[inv.type]}</span>
                      </td>
                      <td className="p-3 text-gray-900 dark:text-white">{inv.clientName}</td>
                      <td className="p-3 text-center text-gray-500">{fmtDate(inv.date)}</td>
                      <td className="p-3 text-center font-semibold text-gray-900 dark:text-white">{fmt(inv.totalAmount)} MAD</td>
                      <td className="p-3 text-center">
                        <div className="relative inline-block">
                          <select
                            value={inv.status}
                            onChange={e => changeInvoiceStatus(inv, e.target.value)}
                            className="appearance-none text-xs px-2 py-0.5 rounded-full font-medium bg-transparent border border-gray-200 dark:border-gray-600 cursor-pointer"
                          >
                            {['DRAFT','SENT','PAID','CANCELLED'].map(s => (
                              <option key={s} value={s}>{(t('coop.invoices') as any)[s]}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-3 flex gap-1 justify-end">
                        <button onClick={() => openInvoiceModal(inv)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Edit2 size={14} /></button>
                        <button onClick={() => deleteInvoice(inv.id)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── REPORTS ───────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {!reports && <div className="text-center py-16 text-gray-400">{ar ? 'جاري التحميل...' : 'Chargement...'}</div>}
          {reports && (
            <>
              {/* Monthly revenue bar chart */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('coop.reports.monthlyRevenue')}</h3>
                <div className="flex items-end gap-1 h-32">
                  {reports.monthlyRevenue.map((v: number, i: number) => {
                    const max = Math.max(...reports.monthlyRevenue, 1);
                    const h = Math.round((v / max) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="text-[10px] text-gray-500 font-semibold">{v > 0 ? fmt(v) : ''}</div>
                        <div className="w-full bg-indigo-500 rounded-t-sm" style={{ height: `${h}%`, minHeight: v > 0 ? '4px' : '0' }} />
                        <div className="text-[9px] text-gray-400 rotate-0">{ar ? MONTHS_AR[i].slice(0,3) : MONTHS_FR[i]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Invoice status */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('coop.reports.invoiceStatus')}</h3>
                  <div className="space-y-2">
                    {Object.entries(reports.invoicesByStatus).map(([s, cnt]) => (
                      <div key={s} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{(t('coop.invoices') as any)[s]}</span>
                        <span className={`text-sm font-bold ${s==='PAID' ? 'text-emerald-600' : s==='CANCELLED' ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>{cnt as number}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capital */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('coop.reports.capitalStatus')}</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">{t('coop.reports.paidCapital')}</span>
                        <span className="font-semibold text-emerald-600">{fmt(reports.paidCapital)} MAD</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${reports.totalCapital > 0 ? (reports.paidCapital/reports.totalCapital)*100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('coop.reports.totalCapital')}</span>
                      <span className="font-semibold text-indigo-600">{fmt(reports.totalCapital)} MAD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t('coop.stats.totalShares')}</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{fmt(reports.totalShares)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary totals */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label={ar ? 'رقم الأعمال الكلي' : 'CA total encaissé'} value={`${fmt(reports.totalRevenue)} MAD`} icon={<CheckCircle size={18} />} color="bg-emerald-100 text-emerald-600" />
                <StatCard label={ar ? 'إيرادات في الانتظار' : 'CA en attente'} value={`${fmt(reports.pendingRevenue)} MAD`} icon={<Clock size={18} />} color="bg-amber-100 text-amber-600" />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────── */}

      {/* Product modal */}
      {productModal && (
        <Modal title={editProduct ? (ar ? 'تعديل المنتج' : 'Modifier le produit') : t('coop.products.add')} onClose={() => setProductModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.products.name')} *</label>
              <input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.products.nameAr')}</label>
              <input value={productForm.nameAr} onChange={e => setProductForm(f => ({ ...f, nameAr: e.target.value }))} dir="rtl" className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.products.unit')}</label>
                <input value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.products.category')}</label>
                <input value={productForm.category} onChange={e => setProductForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <button onClick={saveProduct} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700">{ar ? 'حفظ' : 'Enregistrer'}</button>
          </div>
        </Modal>
      )}

      {/* Movement modal */}
      {movementModal && (
        <Modal title={t('coop.movements.add')} onClose={() => setMovementModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'المنتج' : 'Produit'} *</label>
              <select value={movementForm.productId} onChange={e => setMovementForm(f => ({ ...f, productId: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">{ar ? 'اختر منتج' : 'Choisir un produit'}</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.movements.type')} *</label>
                <select value={movementForm.type} onChange={e => setMovementForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="IN">{t('coop.movements.IN')}</option>
                  <option value="OUT">{t('coop.movements.OUT')}</option>
                  <option value="ADJUST">{t('coop.movements.ADJUST')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.movements.quantity')} *</label>
                <input type="number" value={movementForm.quantity} onChange={e => setMovementForm(f => ({ ...f, quantity: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.movements.unitPrice')}</label>
                <input type="number" value={movementForm.unitPrice} onChange={e => setMovementForm(f => ({ ...f, unitPrice: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.movements.date')}</label>
                <input type="date" value={movementForm.date} onChange={e => setMovementForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.movements.reference')}</label>
              <input value={movementForm.reference} onChange={e => setMovementForm(f => ({ ...f, reference: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <button onClick={saveMovement} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700">{ar ? 'تسجيل' : 'Enregistrer'}</button>
          </div>
        </Modal>
      )}

      {/* Share modal */}
      {shareModal && (
        <Modal title={t('coop.shares.add')} onClose={() => setShareModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.shares.member')} *</label>
              <select value={shareForm.memberId} onChange={e => {
                const m = members.find(x => x.id === e.target.value);
                setShareForm(f => ({ ...f, memberId: e.target.value, memberName: m?.name || '' }));
              }} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                <option value="">{ar ? 'اختر عضو' : 'Choisir un membre'}</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.shares.sharesCount')} *</label>
                <input type="number" value={shareForm.sharesCount} onChange={e => setShareForm(f => ({ ...f, sharesCount: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.shares.sharesPaid')}</label>
                <input type="number" value={shareForm.sharesPaid} onChange={e => setShareForm(f => ({ ...f, sharesPaid: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.shares.paidAt')}</label>
              <input type="date" value={shareForm.paidAt} onChange={e => setShareForm(f => ({ ...f, paidAt: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={shareForm.notes} onChange={e => setShareForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <button onClick={saveShare} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700">{ar ? 'حفظ' : 'Enregistrer'}</button>
          </div>
        </Modal>
      )}

      {/* Invoice modal */}
      {invoiceModal && (
        <Modal title={editInvoice ? (ar ? 'تعديل الوثيقة' : 'Modifier le document') : t('coop.invoices.add')} onClose={() => setInvoiceModal(false)} wide>
          <div className="space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.invoices.type')}</label>
                <select value={invoiceForm.type} onChange={e => setInvoiceForm(f => ({ ...f, type: e.target.value as any }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="DEVIS">{t('coop.invoices.DEVIS')}</option>
                  <option value="FACTURE">{t('coop.invoices.FACTURE')}</option>
                  <option value="BL">{t('coop.invoices.BL')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.invoices.date')}</label>
                <input type="date" value={invoiceForm.date} onChange={e => setInvoiceForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('coop.invoices.client')} *</label>
                <input value={invoiceForm.clientName} onChange={e => setInvoiceForm(f => ({ ...f, clientName: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'الهاتف' : 'Téléphone'}</label>
                <input value={invoiceForm.clientPhone} onChange={e => setInvoiceForm(f => ({ ...f, clientPhone: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>

            {/* Items */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300">{t('coop.invoices.items')}</div>
              {invoiceForm.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2">
                  <div className="flex-1 text-gray-800 dark:text-gray-200">{item.description}</div>
                  <div className="text-gray-500">{item.quantity} × {fmt(item.unitPrice)} MAD</div>
                  <div className="font-semibold text-indigo-600">{fmt(item.subtotal)} MAD</div>
                  <button onClick={() => removeInvoiceItem(idx)} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                </div>
              ))}
              {/* New item row */}
              <div className="grid grid-cols-4 gap-2">
                <input placeholder={t('coop.invoices.description') as string} value={newItem.description} onChange={e => setNewItem(f => ({ ...f, description: e.target.value }))} className="col-span-2 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                <input type="number" placeholder={t('coop.invoices.quantity') as string} value={newItem.quantity} onChange={e => setNewItem(f => ({ ...f, quantity: e.target.value }))} className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                <div className="flex gap-1">
                  <input type="number" placeholder={ar ? 'السعر' : 'Prix'} value={newItem.unitPrice} onChange={e => setNewItem(f => ({ ...f, unitPrice: e.target.value }))} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                  <button onClick={addInvoiceItem} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"><Plus size={14} /></button>
                </div>
              </div>
              {invoiceForm.items.length > 0 && (
                <div className="text-end text-sm font-bold text-indigo-600 pt-1 border-t border-gray-200 dark:border-gray-700">
                  Total: {fmt(invoiceForm.items.reduce((s, i) => s + i.subtotal, 0))} MAD
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>

            <button onClick={saveInvoice} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700">{ar ? 'حفظ' : 'Enregistrer'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
