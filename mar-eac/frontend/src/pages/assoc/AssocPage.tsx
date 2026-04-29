import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Package, Factory, TrendingUp, Users,
  CalendarDays, Plus, Trash2, Edit, Eye, X,
  BarChart3, Boxes, ChevronRight, FileBarChart,
} from 'lucide-react';
import { assocApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import AssocReportsPage from './AssocReportsPage';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string; name: string; nameAr?: string; category?: string;
  unit: string; price: number; lowStockAlert: number; description?: string;
  isActive: boolean; stock: number;
}
interface Production {
  id: string; productId: string; quantityProduced: number; productionCost: number;
  date: string; notes?: string; transactionId?: string;
  product: { name: string; unit: string };
}
interface SaleItem {
  productId: string; quantity: number; unitPrice: number; subtotal: number;
  product?: { name: string; unit: string };
}
interface Sale {
  id: string; clientId?: string; totalAmount: number; date: string; notes?: string;
  transactionId?: string;
  client?: { id: string; name: string; phone?: string };
  items: SaleItem[];
}
interface Client {
  id: string; name: string; phone?: string; email?: string; address?: string;
  notes?: string; totalPurchases: number; totalSpent: number;
}
interface AssocEvent {
  id: string; name: string; type: string; date: string; location?: string;
  description?: string; revenue: number; cost: number;
}
interface Stats {
  productCount: number; clientCount: number; totalProductionCost: number;
  totalRevenue: number; totalSales: number;
  eventCount: number; eventRevenue: number; eventCost: number;
}
interface StockItem extends Product {
  currentStock: number; totalProduced: number; totalSold: number;
  totalRevenue: number; totalCost: number; level: 'empty' | 'low' | 'normal' | 'high';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string; value: string | number; icon: React.ReactNode; color: string;
}> = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  </div>
);

const StockBadge: React.FC<{ level: string; t: (k: string) => string }> = ({ level, t }) => {
  const map: Record<string, string> = {
    empty: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    low:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    normal:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[level] || map.normal}`}>
      {t(`assoc.stock.levels.${level}`)}
    </span>
  );
};

const EventTypeBadge: React.FC<{ type: string; t: (k: string) => string }> = ({ type, t }) => {
  const map: Record<string, string> = {
    EVENT:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    CATERING:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    EXHIBITION:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[type] || map.EVENT}`}>
      {t(`assoc.event.types.${type}`)}
    </span>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'products' | 'production' | 'sales' | 'clients' | 'events' | 'stock' | 'reports';

const AssocPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<AssocEvent[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [productModal, setProductModal] = useState(false);
  const [productEdit, setProductEdit] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '', nameAr: '', category: '', unit: 'unité',
    price: '', lowStockAlert: '10', description: '',
  });

  const [productionModal, setProductionModal] = useState(false);
  const [productionForm, setProductionForm] = useState({
    productId: '', quantityProduced: '', productionCost: '',
    date: new Date().toISOString().slice(0, 10), notes: '',
  });

  const [saleModal, setSaleModal] = useState(false);
  const [saleClientId, setSaleClientId] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleNotes, setSaleNotes] = useState('');
  const [cartItems, setCartItems] = useState<{ productId: string; quantity: string; unitPrice: string }[]>([
    { productId: '', quantity: '', unitPrice: '' },
  ]);

  const [clientModal, setClientModal] = useState(false);
  const [clientEdit, setClientEdit] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [clientHistory, setClientHistory] = useState<{ client: Client; sales: Sale[] } | null>(null);
  const [historyModal, setHistoryModal] = useState(false);

  const [eventModal, setEventModal] = useState(false);
  const [eventEdit, setEventEdit] = useState<AssocEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    name: '', type: 'EVENT', date: new Date().toISOString().slice(0, 10),
    location: '', description: '', revenue: '', cost: '',
  });

  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (tab === 'stock') loadStock();
    if (tab === 'sales') loadSales();
    if (tab === 'clients') loadClients();
    if (tab === 'events') loadEvents();
    if (tab === 'production') loadProductions();
    if (tab === 'products') loadProducts();
  }, [tab]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([assocApi.getStats(), assocApi.getProducts()]);
      setStats(s.data); setProducts(p.data);
    } catch { setError(t('common.error')); }
    setLoading(false);
  };
  const loadProducts   = async () => { const r = await assocApi.getProducts(); setProducts(r.data); };
  const loadProductions= async () => { const r = await assocApi.getProductions(); setProductions(r.data); };
  const loadSales      = async () => { const r = await assocApi.getSales(); setSales(r.data); };
  const loadClients    = async () => { const r = await assocApi.getClients(); setClients(r.data); };
  const loadEvents     = async () => { const r = await assocApi.getEvents(); setEvents(r.data); };
  const loadStock      = async () => { const r = await assocApi.getStock(); setStockItems(r.data); };

  // ── Products ─────────────────────────────────────────────────────────────────

  const openProductModal = (p?: Product) => {
    setProductEdit(p || null);
    setProductForm(p
      ? { name: p.name, nameAr: p.nameAr || '', category: p.category || '', unit: p.unit, price: String(p.price), lowStockAlert: String(p.lowStockAlert), description: p.description || '' }
      : { name: '', nameAr: '', category: '', unit: 'unité', price: '', lowStockAlert: '10', description: '' });
    setProductModal(true);
  };

  const saveProduct = async () => {
    if (!productForm.name) return;
    setSaving(true);
    try {
      if (productEdit) {
        const r = await assocApi.updateProduct(productEdit.id, productForm);
        setProducts(prev => prev.map(p => p.id === productEdit.id ? { ...p, ...r.data } : p));
      } else {
        const r = await assocApi.createProduct(productForm);
        setProducts(prev => [r.data, ...prev]);
        if (stats) setStats({ ...stats, productCount: stats.productCount + 1 });
      }
      setProductModal(false);
    } catch (e: any) { alert(e.response?.data?.message || t('common.error')); }
    setSaving(false);
  };

  // ── Productions ───────────────────────────────────────────────────────────────

  const saveProduction = async () => {
    if (!productionForm.productId || !productionForm.quantityProduced) return;
    setSaving(true);
    try {
      const r = await assocApi.createProduction(productionForm);
      setProductions(prev => [r.data, ...prev]);
      await loadProducts();
      setProductionModal(false);
      setProductionForm({ productId: '', quantityProduced: '', productionCost: '', date: new Date().toISOString().slice(0, 10), notes: '' });
    } catch (e: any) { alert(e.response?.data?.message || t('common.error')); }
    setSaving(false);
  };

  // ── Sales ─────────────────────────────────────────────────────────────────────

  const cartTotal = cartItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);

  const addCartRow    = () => setCartItems(prev => [...prev, { productId: '', quantity: '', unitPrice: '' }]);
  const removeCartRow = (idx: number) => setCartItems(prev => prev.filter((_, i) => i !== idx));
  const updateCartRow = (idx: number, field: string, val: string) => {
    setCartItems(prev => {
      const next = [...prev];
      (next[idx] as any)[field] = val;
      if (field === 'productId') {
        const p = products.find(p => p.id === val);
        if (p) next[idx].unitPrice = String(p.price);
      }
      return next;
    });
  };

  const saveSale = async () => {
    const items = cartItems
      .filter(i => i.productId && i.quantity && i.unitPrice)
      .map(i => ({ productId: i.productId, quantity: parseFloat(i.quantity), unitPrice: parseFloat(i.unitPrice) }));
    if (!items.length) return;
    setSaving(true);
    try {
      const r = await assocApi.createSale({ clientId: saleClientId || undefined, items, date: saleDate, notes: saleNotes });
      setSales(prev => [r.data, ...prev]);
      await loadProducts();
      setSaleModal(false);
      setCartItems([{ productId: '', quantity: '', unitPrice: '' }]);
      setSaleClientId(''); setSaleNotes('');
      if (stats) setStats({ ...stats, totalRevenue: stats.totalRevenue + r.data.totalAmount, totalSales: stats.totalSales + 1 });
    } catch (e: any) { alert(e.response?.data?.message || t('common.error')); }
    setSaving(false);
  };

  // ── Clients ───────────────────────────────────────────────────────────────────

  const openClientModal = (c?: Client) => {
    setClientEdit(c || null);
    setClientForm(c
      ? { name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' }
      : { name: '', phone: '', email: '', address: '', notes: '' });
    setClientModal(true);
  };

  const saveClient = async () => {
    if (!clientForm.name) return;
    setSaving(true);
    try {
      if (clientEdit) {
        const r = await assocApi.updateClient(clientEdit.id, clientForm);
        setClients(prev => prev.map(c => c.id === clientEdit.id ? { ...c, ...r.data } : c));
      } else {
        const r = await assocApi.createClient(clientForm);
        setClients(prev => [r.data, ...prev]);
      }
      setClientModal(false);
    } catch (e: any) { alert(e.response?.data?.message || t('common.error')); }
    setSaving(false);
  };

  const openHistory = async (c: Client) => {
    const r = await assocApi.getClientHistory(c.id);
    setClientHistory(r.data);
    setHistoryModal(true);
  };

  // ── Events ────────────────────────────────────────────────────────────────────

  const openEventModal = (e?: AssocEvent) => {
    setEventEdit(e || null);
    setEventForm(e
      ? { name: e.name, type: e.type, date: e.date.slice(0, 10), location: e.location || '', description: e.description || '', revenue: String(e.revenue), cost: String(e.cost) }
      : { name: '', type: 'EVENT', date: new Date().toISOString().slice(0, 10), location: '', description: '', revenue: '', cost: '' });
    setEventModal(true);
  };

  const saveEvent = async () => {
    if (!eventForm.name || !eventForm.date) return;
    setSaving(true);
    try {
      if (eventEdit) {
        const r = await assocApi.updateEvent(eventEdit.id, eventForm);
        setEvents(prev => prev.map(e => e.id === eventEdit.id ? r.data : e));
      } else {
        const r = await assocApi.createEvent(eventForm);
        setEvents(prev => [r.data, ...prev]);
      }
      setEventModal(false);
    } catch (e: any) { alert(e.response?.data?.message || t('common.error')); }
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'product')    { await assocApi.deleteProduct(deleteTarget.id);    setProducts(prev => prev.filter(p => p.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'production') { await assocApi.deleteProduction(deleteTarget.id); setProductions(prev => prev.filter(p => p.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'sale')       { await assocApi.deleteSale(deleteTarget.id);       setSales(prev => prev.filter(s => s.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'client')     { await assocApi.deleteClient(deleteTarget.id);     setClients(prev => prev.filter(c => c.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'event')      { await assocApi.deleteEvent(deleteTarget.id);      setEvents(prev => prev.filter(e => e.id !== deleteTarget.id)); }
    } catch (e: any) { alert(e.response?.data?.message || t('common.error')); }
    setDeleteTarget(null);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const fmt = (n: number) => n.toLocaleString(isAr ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(isAr ? 'ar-MA' : 'fr-MA');
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard',  label: t('assoc.tabs.dashboard'),  icon: <BarChart3 size={16} /> },
    { id: 'products',   label: t('assoc.tabs.products'),   icon: <Package size={16} /> },
    { id: 'production', label: t('assoc.tabs.production'), icon: <Factory size={16} /> },
    { id: 'sales',      label: t('assoc.tabs.sales'),      icon: <TrendingUp size={16} /> },
    { id: 'clients',    label: t('assoc.tabs.clients'),    icon: <Users size={16} /> },
    { id: 'events',     label: t('assoc.tabs.events'),     icon: <CalendarDays size={16} /> },
    { id: 'stock',      label: t('assoc.tabs.stock'),      icon: <Boxes size={16} /> },
    { id: 'reports',    label: t('assoc.tabs.reports'),    icon: <FileBarChart size={16} /> },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir={dir}>
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-600 via-green-500 to-teal-500 p-5 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow">
              <ShoppingBag size={24} className="text-emerald-200" />
              {t('assoc.title')}
            </h1>
            <p className="text-emerald-100 text-sm mt-0.5 opacity-90">{t('assoc.subtitle')}</p>
          </div>
        </div>
        {/* Tabs inside banner */}
        <div className="flex gap-1 mt-4 bg-white/10 p-1 rounded-xl flex-wrap backdrop-blur-sm">
          {TABS.map(tabItem => (
            <button key={tabItem.id} onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === tabItem.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/20'}`}>
              {tabItem.icon}{tabItem.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

      {/* ── Dashboard ─────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label={t('assoc.stats.activeProducts')} value={stats.productCount}
              icon={<Package size={20} className="text-white" />} color="bg-blue-500" />
            <StatCard label={t('assoc.stats.clients')} value={stats.clientCount}
              icon={<Users size={20} className="text-white" />} color="bg-purple-500" />
            <StatCard label={t('assoc.stats.salesRevenue')} value={`${fmt(stats.totalRevenue)} ${t('common.MAD')}`}
              icon={<TrendingUp size={20} className="text-white" />} color="bg-emerald-500" />
            <StatCard label={t('assoc.stats.productionCost')} value={`${fmt(stats.totalProductionCost)} ${t('common.MAD')}`}
              icon={<Factory size={20} className="text-white" />} color="bg-orange-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label={t('assoc.stats.totalSales')} value={stats.totalSales}
              icon={<ShoppingBag size={20} className="text-white" />} color="bg-teal-500" />
            <StatCard label={t('assoc.stats.eventRevenue')} value={`${fmt(stats.eventRevenue)} ${t('common.MAD')}`}
              icon={<CalendarDays size={20} className="text-white" />} color="bg-indigo-500" />
            <StatCard label={t('assoc.stats.netProfit')}
              value={`${fmt(stats.totalRevenue + stats.eventRevenue - stats.totalProductionCost - stats.eventCost)} ${t('common.MAD')}`}
              icon={<BarChart3 size={20} className="text-white" />} color="bg-rose-500" />
          </div>
        </div>
      )}

      {/* ── Products ──────────────────────────────────────────────────────── */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('assoc.tabs.products')}</h2>
            <button onClick={() => openProductModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> {t('assoc.product.new')}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-start px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.reports.literary.colProduct')}</th>
                  <th className="text-start px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.product.category')}</th>
                  <th className="text-end px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.product.price')}</th>
                  <th className="text-end px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.stock.current')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{isAr && p.nameAr ? p.nameAr : p.name}</div>
                      {isAr && p.nameAr && <div className="text-xs text-gray-500">{p.name}</div>}
                      {!isAr && p.nameAr && <div className="text-xs text-gray-500 text-right">{p.nameAr}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-end text-gray-900 dark:text-white">{fmt(p.price)} {t('common.MAD')}/{p.unit}</td>
                    <td className="px-4 py-3 text-end">
                      <span className={`font-semibold ${p.stock <= 0 ? 'text-red-600' : p.stock <= p.lowStockAlert ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openProductModal(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit size={14} /></button>
                        <button onClick={() => setDeleteTarget({ type: 'product', id: p.id, label: p.name })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!products.length && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">{t('assoc.product.noProducts')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Production ────────────────────────────────────────────────────── */}
      {tab === 'production' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('assoc.tabs.production')}</h2>
            <button onClick={() => setProductionModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> {t('assoc.production.new')}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-start px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.production.product')}</th>
                  <th className="text-end px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.production.produced')}</th>
                  <th className="text-end px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.production.costCol')}</th>
                  <th className="text-start px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('common.date')}</th>
                  <th className="text-start px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('common.description')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {productions.map(pr => (
                  <tr key={pr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{pr.product.name}</td>
                    <td className="px-4 py-3 text-end text-gray-900 dark:text-white">{pr.quantityProduced} {pr.product.unit}</td>
                    <td className="px-4 py-3 text-end text-orange-600 dark:text-orange-400">
                      {fmt(pr.productionCost)} {t('common.MAD')}
                      {pr.transactionId && <span className="ms-1 text-xs text-emerald-500">✓</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmtDate(pr.date)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{pr.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDeleteTarget({ type: 'production', id: pr.id, label: pr.product.name })}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {!productions.length && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">{t('assoc.production.noProductions')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sales ─────────────────────────────────────────────────────────── */}
      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('assoc.tabs.sales')}</h2>
            <button onClick={() => { setCartItems([{ productId: '', quantity: '', unitPrice: '' }]); setSaleClientId(''); setSaleNotes(''); setSaleModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> {t('assoc.sale.new')}
            </button>
          </div>
          <div className="space-y-3">
            {sales.map(s => (
              <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">{fmt(s.totalAmount)} {t('common.MAD')}</span>
                      {s.client && <span className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1"><Users size={12} />{s.client.name}</span>}
                      {s.transactionId && <span className="text-xs text-emerald-500">{t('assoc.sale.financeRecorded')}</span>}
                    </div>
                    <div className="mt-2 space-y-1">
                      {s.items.map((item, i) => (
                        <div key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <ChevronRight size={12} className={isAr ? 'rotate-180' : ''} />
                          {item.product?.name} — {item.quantity} {item.product?.unit} × {fmt(item.unitPrice)} {t('common.MAD')} = {fmt(item.subtotal)} {t('common.MAD')}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {fmtDate(s.date)}{s.notes && ` · ${s.notes}`}
                    </div>
                  </div>
                  <button onClick={() => setDeleteTarget({ type: 'sale', id: s.id, label: `${fmt(s.totalAmount)} ${t('common.MAD')}` })}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {!sales.length && <div className="text-center py-12 text-gray-500 dark:text-gray-400">{t('assoc.sale.noSales')}</div>}
          </div>
        </div>
      )}

      {/* ── Clients ───────────────────────────────────────────────────────── */}
      {tab === 'clients' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('assoc.tabs.clients')}</h2>
            <button onClick={() => openClientModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> {t('assoc.client.new')}
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-start px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('common.name')}</th>
                  <th className="text-start px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.client.phone')}</th>
                  <th className="text-end px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.client.purchases')}</th>
                  <th className="text-end px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('assoc.client.totalSpent')}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      <div>{c.phone || '—'}</div>
                      {c.email && <div className="text-xs">{c.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-end text-gray-900 dark:text-white">{c.totalPurchases}</td>
                    <td className="px-4 py-3 text-end font-semibold text-emerald-600 dark:text-emerald-400">{fmt(c.totalSpent)} {t('common.MAD')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openHistory(c)} title={t('assoc.client.history')} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"><Eye size={14} /></button>
                        <button onClick={() => openClientModal(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit size={14} /></button>
                        <button onClick={() => setDeleteTarget({ type: 'client', id: c.id, label: c.name })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!clients.length && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">{t('assoc.client.noClients')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Events ────────────────────────────────────────────────────────── */}
      {tab === 'events' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('assoc.tabs.events')}</h2>
            <button onClick={() => openEventModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> {t('assoc.event.new')}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(ev => (
              <div key={ev.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{ev.name}</span>
                      <EventTypeBadge type={ev.type} t={t} />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {fmtDate(ev.date)}{ev.location && ` · ${ev.location}`}
                    </div>
                    {ev.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ev.description}</div>}
                    <div className="flex gap-4 mt-2 text-sm flex-wrap">
                      <span className="text-emerald-600 dark:text-emerald-400">{t('assoc.event.revenue').split(' ')[0]}: {fmt(ev.revenue)} {t('common.MAD')}</span>
                      <span className="text-red-600 dark:text-red-400">{t('assoc.event.cost').split(' ')[0]}: {fmt(ev.cost)} {t('common.MAD')}</span>
                      <span className={`font-medium ${ev.revenue - ev.cost >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t('assoc.event.profit')}: {fmt(ev.revenue - ev.cost)} {t('common.MAD')}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEventModal(ev)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit size={14} /></button>
                    <button onClick={() => setDeleteTarget({ type: 'event', id: ev.id, label: ev.name })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
            {!events.length && <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">{t('assoc.event.noEvents')}</div>}
          </div>
        </div>
      )}

      {/* ── Stock ─────────────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('assoc.stock.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stockItems.map(s => (
              <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{isAr && s.nameAr ? s.nameAr : s.name}</div>
                    {s.category && <div className="text-xs text-gray-500 dark:text-gray-400">{s.category}</div>}
                  </div>
                  <StockBadge level={s.level} t={t} />
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>{t('assoc.stock.current')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{s.currentStock} {s.unit}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${s.level === 'empty' ? 'bg-red-500' : s.level === 'low' ? 'bg-orange-500' : s.level === 'normal' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, s.totalProduced > 0 ? (s.currentStock / s.totalProduced) * 100 : 0)}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    { label: t('assoc.stock.produced'), val: s.totalProduced, cls: '' },
                    { label: t('assoc.stock.sold'),     val: s.totalSold,     cls: '' },
                    { label: t('assoc.stock.revenue'),  val: `${fmt(s.totalRevenue)} ${t('common.MAD')}`, cls: 'text-emerald-600 dark:text-emerald-400' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                      <div className={`font-semibold text-gray-900 dark:text-white ${item.cls}`}>{item.val}</div>
                      <div className="text-gray-500 dark:text-gray-400">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!stockItems.length && <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">{t('assoc.stock.noProducts')}</div>}
          </div>
        </div>
      )}

      {/* ── Reports ───────────────────────────────────────────────────────── */}
      {tab === 'reports' && <AssocReportsPage />}

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {/* Product Modal */}
      <Modal isOpen={productModal} onClose={() => setProductModal(false)} title={productEdit ? t('assoc.product.edit') : t('assoc.product.new')}>
        <div className="space-y-3" dir={dir}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.product.nameFr')} *</label>
              <input value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} className="input w-full" placeholder={isAr ? 'Nom en français' : 'Nom du produit'} dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.product.nameAr')}</label>
              <input value={productForm.nameAr} onChange={e => setProductForm(p => ({ ...p, nameAr: e.target.value }))} className="input w-full" placeholder="اسم المنتج" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.product.category')}</label>
              <input value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))} className="input w-full" placeholder={t('assoc.product.categoryPlaceholder')} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.product.unit')}</label>
              <input value={productForm.unit} onChange={e => setProductForm(p => ({ ...p, unit: e.target.value }))} className="input w-full" placeholder={t('assoc.product.unitPlaceholder')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.product.price')}</label>
              <input type="number" value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} className="input w-full" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.product.alertThreshold')}</label>
              <input type="number" value={productForm.lowStockAlert} onChange={e => setProductForm(p => ({ ...p, lowStockAlert: e.target.value }))} className="input w-full" placeholder="10" min="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.product.description')}</label>
            <textarea value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} className="input w-full" rows={2} placeholder={t('assoc.product.descriptionPlaceholder')} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setProductModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t('assoc.cancel')}</button>
            <button onClick={saveProduct} disabled={saving || !productForm.name} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? t('assoc.saving') : t('assoc.save')}</button>
          </div>
        </div>
      </Modal>

      {/* Production Modal */}
      <Modal isOpen={productionModal} onClose={() => setProductionModal(false)} title={t('assoc.production.new')}>
        <div className="space-y-3" dir={dir}>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.production.product')} *</label>
            <select value={productionForm.productId} onChange={e => setProductionForm(p => ({ ...p, productId: e.target.value }))} className="input w-full">
              <option value="">{t('assoc.production.chooseProduct')}</option>
              {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{isAr && p.nameAr ? p.nameAr : p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.production.quantity')} *</label>
              <input type="number" value={productionForm.quantityProduced} onChange={e => setProductionForm(p => ({ ...p, quantityProduced: e.target.value }))} className="input w-full" placeholder="0" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.production.cost')}</label>
              <input type="number" value={productionForm.productionCost} onChange={e => setProductionForm(p => ({ ...p, productionCost: e.target.value }))} className="input w-full" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.production.date')}</label>
            <input type="date" value={productionForm.date} onChange={e => setProductionForm(p => ({ ...p, date: e.target.value }))} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.production.notes')}</label>
            <textarea value={productionForm.notes} onChange={e => setProductionForm(p => ({ ...p, notes: e.target.value }))} className="input w-full" rows={2} />
          </div>
          {parseFloat(productionForm.productionCost) > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 text-xs text-orange-700 dark:text-orange-400">
              {t('assoc.production.financeNote')} ({fmt(parseFloat(productionForm.productionCost))} {t('common.MAD')})
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setProductionModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t('assoc.cancel')}</button>
            <button onClick={saveProduction} disabled={saving || !productionForm.productId || !productionForm.quantityProduced} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? t('assoc.saving') : t('assoc.save')}</button>
          </div>
        </div>
      </Modal>

      {/* Sale Modal */}
      <Modal isOpen={saleModal} onClose={() => setSaleModal(false)} title={t('assoc.sale.new')}>
        <div className="space-y-3" dir={dir}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.sale.client')}</label>
              <select value={saleClientId} onChange={e => setSaleClientId(e.target.value)} className="input w-full">
                <option value="">{t('assoc.sale.noClient')}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.sale.date')}</label>
              <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('assoc.sale.items')} *</label>
            <div className="space-y-2">
              {cartItems.map((item, idx) => {
                const prod = products.find(p => p.id === item.productId);
                return (
                  <div key={idx} className="flex gap-2 items-start">
                    <select value={item.productId} onChange={e => updateCartRow(idx, 'productId', e.target.value)} className="input flex-1 min-w-0">
                      <option value="">{t('assoc.production.chooseProduct')}</option>
                      {products.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id}>{(isAr && p.nameAr ? p.nameAr : p.name)} ({t('assoc.stock.current')}: {p.stock} {p.unit})</option>
                      ))}
                    </select>
                    <input type="number" value={item.quantity} onChange={e => updateCartRow(idx, 'quantity', e.target.value)} className="input w-20 flex-shrink-0" placeholder={t('assoc.sale.qty')} min="0" max={prod?.stock} step="0.01" />
                    <input type="number" value={item.unitPrice} onChange={e => updateCartRow(idx, 'unitPrice', e.target.value)} className="input w-24 flex-shrink-0" placeholder={t('assoc.sale.unitPrice')} min="0" step="0.01" />
                    {cartItems.length > 1 && (
                      <button onClick={() => removeCartRow(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex-shrink-0"><X size={14} /></button>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={addCartRow} className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">
              <Plus size={12} /> {t('assoc.sale.addItem')}
            </button>
          </div>
          {cartTotal > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
              <div className="flex justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <span>{t('assoc.sale.total')}</span><span>{fmt(cartTotal)} {t('common.MAD')}</span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">{t('assoc.sale.financeNote')}</div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.sale.notes')}</label>
            <textarea value={saleNotes} onChange={e => setSaleNotes(e.target.value)} className="input w-full" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setSaleModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t('assoc.cancel')}</button>
            <button onClick={saveSale} disabled={saving || cartTotal === 0} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? t('assoc.saving') : t('assoc.save')}</button>
          </div>
        </div>
      </Modal>

      {/* Client Modal */}
      <Modal isOpen={clientModal} onClose={() => setClientModal(false)} title={clientEdit ? t('assoc.client.edit') : t('assoc.client.new')}>
        <div className="space-y-3" dir={dir}>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.client.name')} *</label>
            <input value={clientForm.name} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))} className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.client.phone')}</label>
              <input value={clientForm.phone} onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))} className="input w-full" placeholder="06xxxxxxxx" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.client.email')}</label>
              <input value={clientForm.email} onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))} className="input w-full" type="email" dir="ltr" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.client.address')}</label>
            <input value={clientForm.address} onChange={e => setClientForm(p => ({ ...p, address: e.target.value }))} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.client.notes')}</label>
            <textarea value={clientForm.notes} onChange={e => setClientForm(p => ({ ...p, notes: e.target.value }))} className="input w-full" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setClientModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t('assoc.cancel')}</button>
            <button onClick={saveClient} disabled={saving || !clientForm.name} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? t('assoc.saving') : t('assoc.save')}</button>
          </div>
        </div>
      </Modal>

      {/* Client History Modal */}
      <Modal isOpen={historyModal} onClose={() => setHistoryModal(false)} title={clientHistory ? `${t('assoc.client.history')} — ${clientHistory.client.name}` : t('assoc.client.history')}>
        {clientHistory && (
          <div className="space-y-3" dir={dir}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{clientHistory.sales.length}</div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">{t('assoc.client.purchases')}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-600">{fmt(clientHistory.sales.reduce((s, x) => s + x.totalAmount, 0))} {t('common.MAD')}</div>
                <div className="text-gray-500 dark:text-gray-400 text-sm">{t('assoc.client.totalSpent')}</div>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {clientHistory.sales.map(s => (
                <div key={s.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">{fmtDate(s.date)}</span>
                    <span className="font-semibold text-emerald-600">{fmt(s.totalAmount)} {t('common.MAD')}</span>
                  </div>
                  {s.items.map((item, i) => (
                    <div key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <ChevronRight size={10} className={isAr ? 'rotate-180' : ''} />
                      {item.product?.name} — {item.quantity} × {fmt(item.unitPrice)} {t('common.MAD')}
                    </div>
                  ))}
                </div>
              ))}
              {!clientHistory.sales.length && <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">{t('assoc.client.noPurchases')}</div>}
            </div>
          </div>
        )}
      </Modal>

      {/* Event Modal */}
      <Modal isOpen={eventModal} onClose={() => setEventModal(false)} title={eventEdit ? t('assoc.event.edit') : t('assoc.event.new')}>
        <div className="space-y-3" dir={dir}>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.event.name')} *</label>
            <input value={eventForm.name} onChange={e => setEventForm(p => ({ ...p, name: e.target.value }))} className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.event.type')}</label>
              <select value={eventForm.type} onChange={e => setEventForm(p => ({ ...p, type: e.target.value }))} className="input w-full">
                {['EVENT', 'CATERING', 'EXHIBITION'].map(tp => (
                  <option key={tp} value={tp}>{t(`assoc.event.types.${tp}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.event.date')} *</label>
              <input type="date" value={eventForm.date} onChange={e => setEventForm(p => ({ ...p, date: e.target.value }))} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.event.location')}</label>
            <input value={eventForm.location} onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.event.description')}</label>
            <textarea value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} className="input w-full" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.event.revenue')}</label>
              <input type="number" value={eventForm.revenue} onChange={e => setEventForm(p => ({ ...p, revenue: e.target.value }))} className="input w-full" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('assoc.event.cost')}</label>
              <input type="number" value={eventForm.cost} onChange={e => setEventForm(p => ({ ...p, cost: e.target.value }))} className="input w-full" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          {(parseFloat(eventForm.revenue) > 0 || parseFloat(eventForm.cost) > 0) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs text-blue-700 dark:text-blue-400 space-y-0.5">
              <div>{t('assoc.event.financeNote')}</div>
              {parseFloat(eventForm.revenue) > 0 && <div>↑ {fmt(parseFloat(eventForm.revenue))} {t('common.MAD')}</div>}
              {parseFloat(eventForm.cost) > 0 && <div>↓ {fmt(parseFloat(eventForm.cost))} {t('common.MAD')}</div>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEventModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">{t('assoc.cancel')}</button>
            <button onClick={saveEvent} disabled={saving || !eventForm.name || !eventForm.date} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? t('assoc.saving') : t('assoc.save')}</button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
        title={t('assoc.deleteTitle')}
        message={`${t('assoc.deleteMsg')} "${deleteTarget?.label}" ? ${t('assoc.irreversible')}`}
        variant="danger"
      />
    </div>
  );
};

export default AssocPage;
