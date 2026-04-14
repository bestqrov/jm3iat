import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Package, Factory, TrendingUp, Users,
  CalendarDays, Plus, Trash2, Edit, Eye, X,
  BarChart3, Boxes, ChevronRight,
} from 'lucide-react';
import { assocApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

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
interface SaleItem { productId: string; quantity: number; unitPrice: number; subtotal: number; product?: { name: string; unit: string } }
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

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
    <div><div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div><div className="text-sm text-gray-500 dark:text-gray-400">{label}</div></div>
  </div>
);

const StockBadge: React.FC<{ level: string }> = ({ level }) => {
  const map: Record<string, { label: string; cls: string }> = {
    empty: { label: 'Épuisé', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    low: { label: 'Faible', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    normal: { label: 'Normal', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    high: { label: 'Élevé', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  };
  const s = map[level] || map.normal;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>;
};

const EventTypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, { label: string; cls: string }> = {
    EVENT: { label: 'Événement', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    CATERING: { label: 'Restauration', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    EXHIBITION: { label: 'Exposition', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  };
  const s = map[type] || map.EVENT;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.label}</span>;
};

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'products' | 'production' | 'sales' | 'clients' | 'events' | 'stock';

const AssocPage: React.FC = () => {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

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
  const [productForm, setProductForm] = useState({ name: '', nameAr: '', category: '', unit: 'unité', price: '', lowStockAlert: '10', description: '' });

  const [productionModal, setProductionModal] = useState(false);
  const [productionForm, setProductionForm] = useState({ productId: '', quantityProduced: '', productionCost: '', date: new Date().toISOString().slice(0, 10), notes: '' });

  // Multi-product sale cart
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
  const [eventForm, setEventForm] = useState({ name: '', type: 'EVENT', date: new Date().toISOString().slice(0, 10), location: '', description: '', revenue: '', cost: '' });

  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────────

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
    } catch { setError('Erreur de chargement'); }
    setLoading(false);
  };

  const loadProducts = async () => { const r = await assocApi.getProducts(); setProducts(r.data); };
  const loadProductions = async () => { const r = await assocApi.getProductions(); setProductions(r.data); };
  const loadSales = async () => { const r = await assocApi.getSales(); setSales(r.data); };
  const loadClients = async () => { const r = await assocApi.getClients(); setClients(r.data); };
  const loadEvents = async () => { const r = await assocApi.getEvents(); setEvents(r.data); };
  const loadStock = async () => { const r = await assocApi.getStock(); setStockItems(r.data); };

  // ── Products ─────────────────────────────────────────────────────────────────

  const openProductModal = (p?: Product) => {
    setProductEdit(p || null);
    setProductForm(p ? { name: p.name, nameAr: p.nameAr || '', category: p.category || '', unit: p.unit, price: String(p.price), lowStockAlert: String(p.lowStockAlert), description: p.description || '' } : { name: '', nameAr: '', category: '', unit: 'unité', price: '', lowStockAlert: '10', description: '' });
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
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erreur');
    }
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
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erreur');
    }
    setSaving(false);
  };

  // ── Sales (multi-product cart) ────────────────────────────────────────────────

  const cartTotal = cartItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0);

  const addCartRow = () => setCartItems(prev => [...prev, { productId: '', quantity: '', unitPrice: '' }]);
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
    const items = cartItems.filter(i => i.productId && i.quantity && i.unitPrice).map(i => ({
      productId: i.productId,
      quantity: parseFloat(i.quantity),
      unitPrice: parseFloat(i.unitPrice),
    }));
    if (items.length === 0) return;
    setSaving(true);
    try {
      const r = await assocApi.createSale({ clientId: saleClientId || undefined, items, date: saleDate, notes: saleNotes });
      setSales(prev => [r.data, ...prev]);
      await loadProducts();
      setSaleModal(false);
      setCartItems([{ productId: '', quantity: '', unitPrice: '' }]);
      setSaleClientId(''); setSaleNotes('');
      if (stats) setStats({ ...stats, totalRevenue: stats.totalRevenue + r.data.totalAmount, totalSales: stats.totalSales + 1 });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erreur');
    }
    setSaving(false);
  };

  // ── Clients ───────────────────────────────────────────────────────────────────

  const openClientModal = (c?: Client) => {
    setClientEdit(c || null);
    setClientForm(c ? { name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' } : { name: '', phone: '', email: '', address: '', notes: '' });
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
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erreur');
    }
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
    setEventForm(e ? { name: e.name, type: e.type, date: e.date.slice(0, 10), location: e.location || '', description: e.description || '', revenue: String(e.revenue), cost: String(e.cost) } : { name: '', type: 'EVENT', date: new Date().toISOString().slice(0, 10), location: '', description: '', revenue: '', cost: '' });
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
    } catch (e: any) {
      alert(e.response?.data?.message || 'Erreur');
    }
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'product') { await assocApi.deleteProduct(deleteTarget.id); setProducts(prev => prev.filter(p => p.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'production') { await assocApi.deleteProduction(deleteTarget.id); setProductions(prev => prev.filter(p => p.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'sale') { await assocApi.deleteSale(deleteTarget.id); setSales(prev => prev.filter(s => s.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'client') { await assocApi.deleteClient(deleteTarget.id); setClients(prev => prev.filter(c => c.id !== deleteTarget.id)); }
      if (deleteTarget.type === 'event') { await assocApi.deleteEvent(deleteTarget.id); setEvents(prev => prev.filter(e => e.id !== deleteTarget.id)); }
    } catch (e: any) { alert(e.response?.data?.message || 'Erreur'); }
    setDeleteTarget(null);
  };

  // ── Tabs config ───────────────────────────────────────────────────────────────

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 size={16} /> },
    { id: 'products', label: 'Produits', icon: <Package size={16} /> },
    { id: 'production', label: 'Production', icon: <Factory size={16} /> },
    { id: 'sales', label: 'Ventes', icon: <TrendingUp size={16} /> },
    { id: 'clients', label: 'Clients', icon: <Users size={16} /> },
    { id: 'events', label: 'Événements', icon: <CalendarDays size={16} /> },
    { id: 'stock', label: 'Stock', icon: <Boxes size={16} /> },
  ];

  const fmt = (n: number) => n.toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
          <ShoppingBag size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAr ? 'الإنتاج والمبيعات' : 'Association Productive'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestion des produits, ventes, clients et événements</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

      {/* ── Dashboard ─────────────────────────────────────────────────────── */}
      {tab === 'dashboard' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Produits actifs" value={stats.productCount} icon={<Package size={20} className="text-white" />} color="bg-blue-500" />
            <StatCard label="Clients" value={stats.clientCount} icon={<Users size={20} className="text-white" />} color="bg-purple-500" />
            <StatCard label="Recettes ventes" value={`${fmt(stats.totalRevenue)} DH`} icon={<TrendingUp size={20} className="text-white" />} color="bg-emerald-500" />
            <StatCard label="Coûts production" value={`${fmt(stats.totalProductionCost)} DH`} icon={<Factory size={20} className="text-white" />} color="bg-orange-500" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Nombre de ventes" value={stats.totalSales} icon={<ShoppingBag size={20} className="text-white" />} color="bg-teal-500" />
            <StatCard label="Recettes événements" value={`${fmt(stats.eventRevenue)} DH`} icon={<CalendarDays size={20} className="text-white" />} color="bg-indigo-500" />
            <StatCard label="Bénéfice net" value={`${fmt(stats.totalRevenue + stats.eventRevenue - stats.totalProductionCost - stats.eventCost)} DH`} icon={<BarChart3 size={20} className="text-white" />} color="bg-rose-500" />
          </div>
        </div>
      )}

      {/* ── Products ──────────────────────────────────────────────────────── */}
      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Produits</h2>
            <button onClick={() => openProductModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Nouveau produit
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Produit</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Catégorie</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Prix</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Stock</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                      {p.nameAr && <div className="text-xs text-gray-500 dark:text-gray-400">{p.nameAr}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{fmt(p.price)} DH/{p.unit}</td>
                    <td className="px-4 py-3 text-right">
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
                {products.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Aucun produit</td></tr>
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Production</h2>
            <button onClick={() => setProductionModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Enregistrer production
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Produit</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Quantité</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Coût</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {productions.map(pr => (
                  <tr key={pr.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{pr.product.name}</td>
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{pr.quantityProduced} {pr.product.unit}</td>
                    <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">
                      {fmt(pr.productionCost)} DH
                      {pr.transactionId && <span className="ml-1 text-xs text-emerald-500" title="Enregistré en comptabilité">✓</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(pr.date).toLocaleDateString('fr-MA')}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{pr.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setDeleteTarget({ type: 'production', id: pr.id, label: `Production ${pr.product.name}` })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {productions.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Aucune production enregistrée</td></tr>
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ventes</h2>
            <button onClick={() => { setCartItems([{ productId: '', quantity: '', unitPrice: '' }]); setSaleClientId(''); setSaleNotes(''); setSaleModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Nouvelle vente
            </button>
          </div>
          <div className="space-y-3">
            {sales.map(s => (
              <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white">{fmt(s.totalAmount)} DH</span>
                      {s.client && <span className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1"><Users size={12} />{s.client.name}</span>}
                      {s.transactionId && <span className="text-xs text-emerald-500" title="Enregistré en comptabilité">✓ Finance</span>}
                    </div>
                    <div className="mt-2 space-y-1">
                      {s.items.map((item, i) => (
                        <div key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <ChevronRight size={12} />
                          {item.product?.name} — {item.quantity} {item.product?.unit} × {fmt(item.unitPrice)} DH = {fmt(item.subtotal)} DH
                        </div>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(s.date).toLocaleDateString('fr-MA')}{s.notes && ` · ${s.notes}`}</div>
                  </div>
                  <button onClick={() => setDeleteTarget({ type: 'sale', id: s.id, label: `Vente ${fmt(s.totalAmount)} DH` })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {sales.length === 0 && <div className="text-center py-12 text-gray-500 dark:text-gray-400">Aucune vente enregistrée</div>}
          </div>
        </div>
      )}

      {/* ── Clients ───────────────────────────────────────────────────────── */}
      {tab === 'clients' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Clients</h2>
            <button onClick={() => openClientModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Nouveau client
            </button>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Contact</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Achats</th>
                  <th className="text-right px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Total dépensé</th>
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
                    <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{c.totalPurchases}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(c.totalSpent)} DH</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openHistory(c)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg" title="Historique"><Eye size={14} /></button>
                        <button onClick={() => openClientModal(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit size={14} /></button>
                        <button onClick={() => setDeleteTarget({ type: 'client', id: c.id, label: c.name })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Aucun client</td></tr>
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Événements</h2>
            <button onClick={() => openEventModal()} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              <Plus size={16} /> Nouvel événement
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map(ev => (
              <div key={ev.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{ev.name}</span>
                      <EventTypeBadge type={ev.type} />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{new Date(ev.date).toLocaleDateString('fr-MA')}{ev.location && ` · ${ev.location}`}</div>
                    {ev.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ev.description}</div>}
                    <div className="flex gap-4 mt-2 text-sm flex-wrap">
                      <span className="text-emerald-600 dark:text-emerald-400">Recette: {fmt(ev.revenue)} DH</span>
                      <span className="text-red-600 dark:text-red-400">Coût: {fmt(ev.cost)} DH</span>
                      <span className={`font-medium ${ev.revenue - ev.cost >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        Bénéfice: {fmt(ev.revenue - ev.cost)} DH
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
            {events.length === 0 && <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">Aucun événement</div>}
          </div>
        </div>
      )}

      {/* ── Stock ─────────────────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Niveaux de stock</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stockItems.map(s => (
              <div key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{s.name}</div>
                    {s.category && <div className="text-xs text-gray-500 dark:text-gray-400">{s.category}</div>}
                  </div>
                  <StockBadge level={s.level} />
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Stock actuel</span>
                    <span className="font-medium text-gray-900 dark:text-white">{s.currentStock} {s.unit}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${s.level === 'empty' ? 'bg-red-500' : s.level === 'low' ? 'bg-orange-500' : s.level === 'normal' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(100, s.totalProduced > 0 ? (s.currentStock / s.totalProduced) * 100 : 0)}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <div className="font-semibold text-gray-900 dark:text-white">{s.totalProduced}</div>
                    <div className="text-gray-500 dark:text-gray-400">Produit</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <div className="font-semibold text-gray-900 dark:text-white">{s.totalSold}</div>
                    <div className="text-gray-500 dark:text-gray-400">Vendu</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(s.totalRevenue)} DH</div>
                    <div className="text-gray-500 dark:text-gray-400">Recettes</div>
                  </div>
                </div>
              </div>
            ))}
            {stockItems.length === 0 && <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">Aucun produit actif</div>}
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {/* Product Modal */}
      <Modal isOpen={productModal} onClose={() => setProductModal(false)} title={productEdit ? 'Modifier produit' : 'Nouveau produit'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nom (FR) *</label>
              <input value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} className="input w-full" placeholder="Nom du produit" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nom (AR)</label>
              <input value={productForm.nameAr} onChange={e => setProductForm(p => ({ ...p, nameAr: e.target.value }))} className="input w-full text-right" placeholder="اسم المنتج" dir="rtl" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie</label>
              <input value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))} className="input w-full" placeholder="Ex: Artisanat, Alimentaire" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Unité</label>
              <input value={productForm.unit} onChange={e => setProductForm(p => ({ ...p, unit: e.target.value }))} className="input w-full" placeholder="kg, unité, litre..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Prix de vente (DH)</label>
              <input type="number" value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} className="input w-full" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Seuil alerte stock</label>
              <input type="number" value={productForm.lowStockAlert} onChange={e => setProductForm(p => ({ ...p, lowStockAlert: e.target.value }))} className="input w-full" placeholder="10" min="0" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} className="input w-full" rows={2} placeholder="Description optionnelle" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setProductModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
            <button onClick={saveProduct} disabled={saving || !productForm.name} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button>
          </div>
        </div>
      </Modal>

      {/* Production Modal */}
      <Modal isOpen={productionModal} onClose={() => setProductionModal(false)} title="Enregistrer une production">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Produit *</label>
            <select value={productionForm.productId} onChange={e => setProductionForm(p => ({ ...p, productId: e.target.value }))} className="input w-full">
              <option value="">Choisir un produit</option>
              {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantité produite *</label>
              <input type="number" value={productionForm.quantityProduced} onChange={e => setProductionForm(p => ({ ...p, quantityProduced: e.target.value }))} className="input w-full" placeholder="0" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Coût de production (DH)</label>
              <input type="number" value={productionForm.productionCost} onChange={e => setProductionForm(p => ({ ...p, productionCost: e.target.value }))} className="input w-full" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
            <input type="date" value={productionForm.date} onChange={e => setProductionForm(p => ({ ...p, date: e.target.value }))} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={productionForm.notes} onChange={e => setProductionForm(p => ({ ...p, notes: e.target.value }))} className="input w-full" rows={2} />
          </div>
          {parseFloat(productionForm.productionCost) > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 text-xs text-orange-700 dark:text-orange-400">
              Une dépense de {fmt(parseFloat(productionForm.productionCost))} DH sera enregistrée automatiquement en comptabilité.
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setProductionModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
            <button onClick={saveProduction} disabled={saving || !productionForm.productId || !productionForm.quantityProduced} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button>
          </div>
        </div>
      </Modal>

      {/* Sale Modal (multi-product cart) */}
      <Modal isOpen={saleModal} onClose={() => setSaleModal(false)} title="Nouvelle vente">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Client (optionnel)</label>
              <select value={saleClientId} onChange={e => setSaleClientId(e.target.value)} className="input w-full">
                <option value="">Sans client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="input w-full" />
            </div>
          </div>

          {/* Cart items */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Articles *</label>
            <div className="space-y-2">
              {cartItems.map((item, idx) => {
                const prod = products.find(p => p.id === item.productId);
                const stock = prod ? prod.stock : 0;
                return (
                  <div key={idx} className="flex gap-2 items-start">
                    <select value={item.productId} onChange={e => updateCartRow(idx, 'productId', e.target.value)} className="input flex-1 min-w-0">
                      <option value="">Produit</option>
                      {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name} (stock: {p.stock} {p.unit})</option>)}
                    </select>
                    <input type="number" value={item.quantity} onChange={e => updateCartRow(idx, 'quantity', e.target.value)} className="input w-20 flex-shrink-0" placeholder="Qté" min="0" max={stock} step="0.01" />
                    <input type="number" value={item.unitPrice} onChange={e => updateCartRow(idx, 'unitPrice', e.target.value)} className="input w-24 flex-shrink-0" placeholder="Prix DH" min="0" step="0.01" />
                    {cartItems.length > 1 && (
                      <button onClick={() => removeCartRow(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex-shrink-0"><X size={14} /></button>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={addCartRow} className="mt-2 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700">
              <Plus size={12} /> Ajouter un article
            </button>
          </div>

          {cartTotal > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
              <div className="flex justify-between text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                <span>Total</span><span>{fmt(cartTotal)} DH</span>
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Un revenu de {fmt(cartTotal)} DH sera enregistré en comptabilité.</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={saleNotes} onChange={e => setSaleNotes(e.target.value)} className="input w-full" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setSaleModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
            <button onClick={saveSale} disabled={saving || cartTotal === 0} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? '...' : 'Enregistrer la vente'}</button>
          </div>
        </div>
      </Modal>

      {/* Client Modal */}
      <Modal isOpen={clientModal} onClose={() => setClientModal(false)} title={clientEdit ? 'Modifier client' : 'Nouveau client'}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
            <input value={clientForm.name} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))} className="input w-full" placeholder="Nom complet" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Téléphone</label>
              <input value={clientForm.phone} onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))} className="input w-full" placeholder="06xxxxxxxx" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input value={clientForm.email} onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))} className="input w-full" type="email" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
            <input value={clientForm.address} onChange={e => setClientForm(p => ({ ...p, address: e.target.value }))} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea value={clientForm.notes} onChange={e => setClientForm(p => ({ ...p, notes: e.target.value }))} className="input w-full" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setClientModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
            <button onClick={saveClient} disabled={saving || !clientForm.name} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button>
          </div>
        </div>
      </Modal>

      {/* Client History Modal */}
      <Modal isOpen={historyModal} onClose={() => setHistoryModal(false)} title={clientHistory ? `Historique — ${clientHistory.client.name}` : 'Historique'}>
        {clientHistory && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">{clientHistory.sales.length}</div>
                <div className="text-gray-500 dark:text-gray-400">Achats</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-emerald-600">{fmt(clientHistory.sales.reduce((s, x) => s + x.totalAmount, 0))} DH</div>
                <div className="text-gray-500 dark:text-gray-400">Total dépensé</div>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {clientHistory.sales.map(s => (
                <div key={s.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500 dark:text-gray-400">{new Date(s.date).toLocaleDateString('fr-MA')}</span>
                    <span className="font-semibold text-emerald-600">{fmt(s.totalAmount)} DH</span>
                  </div>
                  {s.items.map((item, i) => (
                    <div key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <ChevronRight size={10} />{item.product?.name} — {item.quantity} × {fmt(item.unitPrice)} DH
                    </div>
                  ))}
                </div>
              ))}
              {clientHistory.sales.length === 0 && <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">Aucun achat enregistré</div>}
            </div>
          </div>
        )}
      </Modal>

      {/* Event Modal */}
      <Modal isOpen={eventModal} onClose={() => setEventModal(false)} title={eventEdit ? 'Modifier événement' : 'Nouvel événement'}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
            <input value={eventForm.name} onChange={e => setEventForm(p => ({ ...p, name: e.target.value }))} className="input w-full" placeholder="Nom de l'événement" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={eventForm.type} onChange={e => setEventForm(p => ({ ...p, type: e.target.value }))} className="input w-full">
                <option value="EVENT">Événement</option>
                <option value="CATERING">Restauration</option>
                <option value="EXHIBITION">Exposition</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input type="date" value={eventForm.date} onChange={e => setEventForm(p => ({ ...p, date: e.target.value }))} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Lieu</label>
            <input value={eventForm.location} onChange={e => setEventForm(p => ({ ...p, location: e.target.value }))} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} className="input w-full" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Recette (DH)</label>
              <input type="number" value={eventForm.revenue} onChange={e => setEventForm(p => ({ ...p, revenue: e.target.value }))} className="input w-full" placeholder="0.00" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Coût (DH)</label>
              <input type="number" value={eventForm.cost} onChange={e => setEventForm(p => ({ ...p, cost: e.target.value }))} className="input w-full" placeholder="0.00" min="0" step="0.01" />
            </div>
          </div>
          {(parseFloat(eventForm.revenue) > 0 || parseFloat(eventForm.cost) > 0) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs text-blue-700 dark:text-blue-400 space-y-0.5">
              {parseFloat(eventForm.revenue) > 0 && <div>✓ Revenu de {fmt(parseFloat(eventForm.revenue))} DH → comptabilité (Recette)</div>}
              {parseFloat(eventForm.cost) > 0 && <div>✓ Dépense de {fmt(parseFloat(eventForm.cost))} DH → comptabilité (Charge)</div>}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEventModal(false)} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">Annuler</button>
            <button onClick={saveEvent} disabled={saving || !eventForm.name || !eventForm.date} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">{saving ? '...' : 'Enregistrer'}</button>
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
        title="Confirmer la suppression"
        message={`Supprimer "${deleteTarget?.label}" ? Cette action est irréversible.`}
        variant="danger"
      />
    </div>
  );
};

export default AssocPage;
