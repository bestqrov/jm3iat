import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Package, ArrowDownUp, Users, FileText,
  BarChart2, Plus, Trash2, Edit2, X,
  TrendingUp, AlertCircle, CheckCircle, Clock, Store,
  Briefcase, CalendarDays, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { coopApi, membersApi, authApi } from '../../lib/api';
import { translations } from '../../i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Product { id: string; name: string; nameAr?: string; unit: string; category?: string; currentStock: number; isActive: boolean; }
interface Movement { id: string; productId: string; type: 'IN'|'OUT'|'ADJUST'; quantity: number; unitPrice?: number; date: string; reference?: string; notes?: string; product?: { name: string; unit: string }; }
interface Share { id: string; memberId: string; memberName: string; sharesCount: number; sharesPaid: number; paidAt?: string; notes?: string; }
interface InvoiceItem { id?: string; productId?: string; description: string; quantity: number; unitPrice: number; subtotal: number; }
interface Invoice { id: string; type: 'DEVIS'|'FACTURE'|'BL'; number: string; clientName: string; clientPhone?: string; clientAddress?: string; status: string; totalAmount: number; date: string; dueDate?: string; notes?: string; items: InvoiceItem[]; }
interface Stats { activeProducts: number; membersWithShares: number; totalShares: number; paidShares: number; shareValue: number; capitalSocial: number; totalRevenue: number; pendingRevenue: number; lowStockProducts: number; invoiceCount: number; stockSummary: {id:string;name:string;stock:number;unit:string}[]; }
interface Member { id: string; name: string; }
interface BoardMeeting {
  id: string; title: string; date: string; location?: string; agenda?: string;
  pvContent?: string; status: string; sessionType?: string;
  decisions: { id: string; description: string; assignedTo?: string; dueDate?: string; status: string }[];
}
interface CoopProject {
  id: string; title: string; type: string; description?: string; status: string;
  budget?: number; startDate?: string; endDate?: string; generalGoal?: string;
}

interface ProductionInput { productId?: string; description: string; quantity: number; unit: string; product?: { name: string } }
interface CoopProduction {
  id: string; batchNumber: string; productId?: string; productName: string;
  status: string; plannedQty: number; actualQty?: number; productionCost: number;
  startDate?: string; endDate?: string; notes?: string;
  product?: { name: string; unit: string };
  inputs: ProductionInput[];
}

interface CoopClient { id: string; name: string; phone?: string; email?: string; address?: string; city?: string; notes?: string; }
interface SaleItem { productId?: string; description: string; quantity: number; unitPrice: number; subtotal: number; product?: { name: string; unit: string } }
interface CoopSale {
  id: string; saleNumber: string; clientId?: string; clientName: string;
  date: string; status: string; totalAmount: number; discount: number;
  paidAmount: number; paymentMethod?: string; notes?: string;
  client?: CoopClient; items: SaleItem[];
}

type Tab = 'dashboard'|'board'|'projects'|'shares'|'stock'|'invoices'|'reports'|'production'|'ventes';

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

// ── Cooperative type definitions ─────────────────────────────────────────────

const COOP_TYPES = [
  { key: 'AGRICULTURAL', emoji: '🌾' },
  { key: 'CRAFT',        emoji: '🎨' },
  { key: 'FOOD',         emoji: '🍯' },
  { key: 'SERVICES',     emoji: '🛠️' },
  { key: 'HOUSING',      emoji: '🏠' },
  { key: 'FISHING',      emoji: '🎣' },
  { key: 'ECOMMERCE',    emoji: '💻' },
  { key: 'OTHER',        emoji: '🏪' },
];

export const CoopPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { organization, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const ar = lang === 'ar';
  const tr = translations[lang].coop as any;
  const isConverted = (organization as any)?.conversionStatus === 'CONVERTED';
  const currentYear = new Date().getFullYear();

  const validTabs: Tab[] = ['dashboard','board','projects','shares','stock','invoices','reports','production','ventes'];
  const initialTab = (searchParams.get('tab') as Tab | null);
  const [tab, setTab] = useState<Tab>(validTabs.includes(initialTab as Tab) ? initialTab as Tab : 'dashboard');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [boardMeetings, setBoardMeetings]   = useState<BoardMeeting[]>([]);
  const [coopProjects, setCoopProjects]     = useState<CoopProject[]>([]);
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [productions, setProductions]       = useState<CoopProduction[]>([]);
  const [clients, setClients]               = useState<CoopClient[]>([]);
  const [sales, setSales]                   = useState<CoopSale[]>([]);
  const [salesStats, setSalesStats]         = useState<any>(null);
  const [ventesSubTab, setVentesSubTab]     = useState<'sales'|'clients'>('sales');

  // Modal states
  const [productModal, setProductModal]         = useState(false);
  const [movementModal, setMovementModal]       = useState(false);
  const [shareModal, setShareModal]             = useState(false);
  const [invoiceModal, setInvoiceModal]         = useState(false);
  const [boardModal, setBoardModal]             = useState(false);
  const [projectModal, setProjectModal]         = useState(false);
  const [productionModal, setProductionModal]   = useState(false);
  const [clientModal, setClientModal]           = useState(false);
  const [saleModal, setSaleModal]               = useState(false);
  const [decisionModal, setDecisionModal]       = useState<string | null>(null);
  const [editInvoice, setEditInvoice]           = useState<Invoice | null>(null);
  const [editProduct, setEditProduct]           = useState<Product | null>(null);
  const [editShare, setEditShare]               = useState<Share | null>(null);
  const [editMeeting, setEditMeeting]           = useState<BoardMeeting | null>(null);
  const [editProject, setEditProject]           = useState<CoopProject | null>(null);
  const [editProduction, setEditProduction]     = useState<CoopProduction | null>(null);
  const [editClient, setEditClient]             = useState<CoopClient | null>(null);
  const [editSale, setEditSale]                 = useState<CoopSale | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({ name: '', nameAr: '', unit: 'unité', category: '' });
  const [movementForm, setMovementForm] = useState({ productId: '', type: 'IN', quantity: '', unitPrice: '', date: '', reference: '', notes: '' });
  const [shareForm, setShareForm] = useState({ memberId: '', memberName: '', sharesCount: '', sharesPaid: '', paidAt: '', notes: '' });
  const [invoiceForm, setInvoiceForm] = useState({ type: 'FACTURE', clientName: '', clientPhone: '', clientAddress: '', date: '', dueDate: '', notes: '', items: [] as InvoiceItem[] });
  const [newItem, setNewItem] = useState({ productId: '', description: '', quantity: '1', unitPrice: '' });
  const [stockFilter, setStockFilter] = useState('');
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('');
  const [error, setError] = useState('');
  const [boardForm, setBoardForm] = useState({ title: '', sessionType: 'ORDINARY', date: '', location: '', agenda: '', pvContent: '' });
  const [projectForm, setProjectForm] = useState({ title: '', type: 'INTERNE', description: '', partnerName: '', budget: '', startDate: '', endDate: '', status: 'PLANNED' });
  const [decisionForm, setDecisionForm] = useState({ description: '', assignedTo: '', dueDate: '' });
  const [productionForm, setProductionForm] = useState({ productId: '', productName: '', plannedQty: '', productionCost: '', startDate: '', endDate: '', notes: '', inputs: [] as {description:string;productId:string;quantity:string;unit:string}[] });
  const [clientForm, setClientForm] = useState({ name: '', phone: '', email: '', address: '', city: '', notes: '' });
  const [saleForm, setSaleForm] = useState({ clientId: '', clientName: '', date: '', paymentMethod: 'CASH', discount: '0', paidAmount: '0', notes: '', items: [] as SaleItem[] });
  const [newSaleItem, setNewSaleItem] = useState({ productId: '', description: '', quantity: '1', unitPrice: '' });

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

  const loadBoard = useCallback(async () => {
    try { const r = await coopApi.getBoardMeetings(); setBoardMeetings(r.data); } catch { /* ignore */ }
  }, []);

  const loadProjects = useCallback(async () => {
    try { const r = await coopApi.getCoopProjects(); setCoopProjects(r.data); } catch { /* ignore */ }
  }, []);

  const loadProductions = useCallback(async () => {
    try { const r = await coopApi.getProductions(); setProductions(r.data); } catch { /* ignore */ }
  }, []);

  const loadVentes = useCallback(async () => {
    try {
      const [c, s, st] = await Promise.all([coopApi.getClients(), coopApi.getSales(), coopApi.getSalesStats()]);
      setClients(c.data); setSales(s.data); setSalesStats(st.data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refreshUser().then(() => reload()); }, [reload]);
  useEffect(() => { if (tab === 'reports') loadReports(); }, [tab, loadReports]);
  useEffect(() => { if (tab === 'board') loadBoard(); }, [tab, loadBoard]);
  useEffect(() => { if (tab === 'projects') loadProjects(); }, [tab, loadProjects]);
  useEffect(() => { if (tab === 'production') loadProductions(); }, [tab, loadProductions]);
  useEffect(() => { if (tab === 'ventes') loadVentes(); }, [tab, loadVentes]);

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

  const saveCoopType = async (type: string) => {
    setSavingType(true);
    try {
      await authApi.updateOrganization({ coopType: type });
      await refreshUser();
      setShowTypeSelector(false);
    } catch { /* ignore */ } finally { setSavingType(false); }
  };

  // ── Board meeting handlers ─────────────────────────────────────────────────

  const openBoardModal = (m?: BoardMeeting) => {
    if (m) {
      setEditMeeting(m);
      setBoardForm({ title: m.title, sessionType: m.sessionType || 'ORDINARY', date: m.date?.slice(0, 10) || '', location: m.location || '', agenda: m.agenda || '', pvContent: m.pvContent || '' });
    } else {
      setEditMeeting(null);
      setBoardForm({ title: '', sessionType: 'ORDINARY', date: '', location: '', agenda: '', pvContent: '' });
    }
    setBoardModal(true);
  };

  const saveBoardMeeting = async () => {
    try {
      if (editMeeting) await coopApi.updateBoardMeeting(editMeeting.id, boardForm);
      else await coopApi.createBoardMeeting(boardForm);
      setBoardModal(false); loadBoard();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const deleteBoardMeeting = async (id: string) => {
    if (!confirm(ar ? 'حذف هذا الاجتماع؟' : 'Supprimer cette réunion ?')) return;
    await coopApi.deleteBoardMeeting(id); loadBoard();
  };

  const saveDecision = async () => {
    if (!decisionModal || !decisionForm.description.trim()) return;
    try {
      await coopApi.addBoardDecision(decisionModal, decisionForm);
      setDecisionModal(null); setDecisionForm({ description: '', assignedTo: '', dueDate: '' }); loadBoard();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const toggleDecisionStatus = async (meetingId: string, decisionId: string, currentStatus: string) => {
    const next = currentStatus === 'DONE' ? 'PENDING' : 'DONE';
    await coopApi.updateBoardDecision(meetingId, decisionId, { status: next }); loadBoard();
  };

  // ── Project handlers ───────────────────────────────────────────────────────

  const openProjectModal = (p?: CoopProject) => {
    if (p) {
      setEditProject(p);
      const partnerName = p.generalGoal?.startsWith('Partenaire: ') ? p.generalGoal.replace('Partenaire: ', '') : '';
      setProjectForm({ title: p.title, type: p.type, description: p.description || '', partnerName, budget: p.budget ? String(p.budget) : '', startDate: p.startDate?.slice(0, 10) || '', endDate: p.endDate?.slice(0, 10) || '', status: p.status });
    } else {
      setEditProject(null);
      setProjectForm({ title: '', type: 'INTERNE', description: '', partnerName: '', budget: '', startDate: '', endDate: '', status: 'PLANNED' });
    }
    setProjectModal(true);
  };

  const saveProject = async () => {
    try {
      if (editProject) await coopApi.updateCoopProject(editProject.id, projectForm);
      else await coopApi.createCoopProject(projectForm);
      setProjectModal(false); loadProjects();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const deleteProject = async (id: string) => {
    if (!confirm(ar ? 'حذف هذا المشروع؟' : 'Supprimer ce projet ?')) return;
    await coopApi.deleteCoopProject(id); loadProjects();
  };

  // ── Tab bar ──────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard',  label: ar ? 'لوحة القيادة'  : 'Tableau de bord',  icon: <LayoutDashboard size={16} /> },
    { key: 'production', label: ar ? 'الإنتاج'        : 'Production',        icon: <Package size={16} /> },
    { key: 'ventes',     label: ar ? 'المبيعات'       : 'Ventes',            icon: <Store size={16} /> },
    { key: 'board',      label: ar ? 'مجلس الإدارة'  : 'Conseil d\'Admin',  icon: <CalendarDays size={16} /> },
    { key: 'projects',   label: ar ? 'المشاريع'       : 'Projets',           icon: <Briefcase size={16} /> },
    { key: 'shares',     label: t('coop.tabs.shares'),    icon: <Users size={16} /> },
    { key: 'stock',      label: t('coop.tabs.stock'),     icon: <Package size={16} /> },
    { key: 'invoices',   label: t('coop.tabs.invoices'),  icon: <FileText size={16} /> },
    { key: 'reports',    label: t('coop.tabs.reports'),   icon: <BarChart2 size={16} /> },
  ];

  const fmt = (n: number) => new Intl.NumberFormat(ar ? 'ar-MA' : 'fr-MA', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString(ar ? 'ar-MA' : 'fr-FR') : '—';

  // ── Production handlers ───────────────────────────────────────────────────

  const openProductionModal = (p?: CoopProduction) => {
    if (p) { setEditProduction(p); setProductionForm({ productId: p.productId || '', productName: p.productName, plannedQty: String(p.plannedQty), productionCost: String(p.productionCost), startDate: p.startDate?.slice(0,10) || '', endDate: p.endDate?.slice(0,10) || '', notes: p.notes || '', inputs: p.inputs.map(i => ({ description: i.description, productId: i.productId || '', quantity: String(i.quantity), unit: i.unit })) }); }
    else   { setEditProduction(null); setProductionForm({ productId: '', productName: '', plannedQty: '', productionCost: '0', startDate: '', endDate: '', notes: '', inputs: [] }); }
    setProductionModal(true);
  };

  const saveProduction = async () => {
    try {
      const payload = { ...productionForm, inputs: productionForm.inputs };
      if (editProduction) await coopApi.updateProduction(editProduction.id, payload);
      else await coopApi.createProduction(payload);
      setProductionModal(false); loadProductions();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const updateProductionStatus = async (id: string, status: string, actualQty?: string) => {
    try { await coopApi.updateProduction(id, { status, ...(actualQty ? { actualQty } : {}) }); loadProductions(); reload(); }
    catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const deleteProduction = async (id: string) => {
    if (!confirm(ar ? 'حذف دورة الإنتاج؟' : 'Supprimer cette production ?')) return;
    await coopApi.deleteProduction(id); loadProductions();
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
      setClientModal(false); loadVentes();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const deleteClient = async (id: string) => {
    if (!confirm(ar ? 'حذف العميل؟' : 'Supprimer ce client ?')) return;
    await coopApi.deleteClient(id); loadVentes();
  };

  // ── Sale handlers ─────────────────────────────────────────────────────────

  const openSaleModal = (s?: CoopSale) => {
    if (s) { setEditSale(s); setSaleForm({ clientId: s.clientId || '', clientName: s.clientName, date: s.date?.slice(0,10) || '', paymentMethod: s.paymentMethod || 'CASH', discount: String(s.discount), paidAmount: String(s.paidAmount), notes: s.notes || '', items: s.items.map(i => ({ ...i })) }); }
    else   { setEditSale(null); setSaleForm({ clientId: '', clientName: '', date: '', paymentMethod: 'CASH', discount: '0', paidAmount: '0', notes: '', items: [] }); }
    setNewSaleItem({ productId: '', description: '', quantity: '1', unitPrice: '' });
    setSaleModal(true);
  };

  const addSaleItem = () => {
    if (!newSaleItem.description || !newSaleItem.unitPrice) return;
    const qty = parseFloat(newSaleItem.quantity) || 1;
    const price = parseFloat(newSaleItem.unitPrice) || 0;
    const product = products.find(p => p.id === newSaleItem.productId);
    setSaleForm(f => ({ ...f, items: [...f.items, { productId: newSaleItem.productId || undefined, description: newSaleItem.description, quantity: qty, unitPrice: price, subtotal: qty * price, product: product ? { name: product.name, unit: product.unit } : undefined }] }));
    setNewSaleItem({ productId: '', description: '', quantity: '1', unitPrice: '' });
  };

  const saveSale = async () => {
    try {
      const payload = { ...saleForm };
      if (editSale) await coopApi.updateSale(editSale.id, payload);
      else await coopApi.createSale(payload);
      setSaleModal(false); loadVentes();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const updateSaleStatus = async (id: string, status: string) => {
    try { await coopApi.updateSale(id, { status }); loadVentes(); reload(); }
    catch (e: any) { setError(e.response?.data?.message || 'Error'); }
  };

  const deleteSale = async (id: string) => {
    if (!confirm(ar ? 'حذف عملية البيع؟' : 'Supprimer cette vente ?')) return;
    await coopApi.deleteSale(id); loadVentes();
  };

  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];
  const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  const shareValue = organization ? ((organization as any).partsValeur || 0) : 0;

  return (
    <div className="p-4 space-y-4" dir={ar ? 'rtl' : 'ltr'}>
      {/* ── Branded header ── */}
      <div
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)' }}
      >
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Store size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">
            {organization?.name || (ar ? 'وحدة التعاونية' : 'Module Coopérative')}
          </h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {(organization as any)?.coopType ? (
              <button
                onClick={() => setShowTypeSelector(true)}
                className="text-xs text-teal-100 hover:text-white flex items-center gap-1 transition-colors"
              >
                {COOP_TYPES.find(c => c.key === (organization as any).coopType)?.emoji}{' '}
                {tr.coopTypes?.[(organization as any).coopType]?.label}
                <span className="opacity-60">✎</span>
              </button>
            ) : (
              <button
                onClick={() => setShowTypeSelector(true)}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-lg transition-colors"
              >
                {ar ? '+ حدد نوع التعاونية' : '+ Définir le type'}
              </button>
            )}
          </div>
        </div>
        {organization && ((organization as any).ice || (organization as any).identifiantFiscal) && (
          <div className="text-xs text-teal-100 text-end hidden sm:block">
            {(organization as any).ice && <div>ICE: {(organization as any).ice}</div>}
            {(organization as any).identifiantFiscal && <div>IF: {(organization as any).identifiantFiscal}</div>}
          </div>
        )}
      </div>

      {/* ── Type selector modal ── */}
      {showTypeSelector && (
        <Modal title={t('coop.coopType')} onClose={() => setShowTypeSelector(false)} wide>
          <div className="grid grid-cols-2 gap-2">
            {COOP_TYPES.map(ct => {
              const typeData = tr.coopTypes?.[ct.key];
              const current = (organization as any)?.coopType === ct.key;
              return (
                <button
                  key={ct.key}
                  onClick={() => saveCoopType(ct.key)}
                  disabled={savingType}
                  className={`p-3 rounded-xl border-2 text-start transition-all ${
                    current
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-teal-300 hover:bg-teal-50/50 dark:hover:bg-teal-900/10'
                  }`}
                >
                  <div className="text-base mb-0.5">{typeData.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">{typeData.desc}</div>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === tb.key
                ? 'bg-white dark:bg-gray-700 text-teal-600 dark:text-teal-400 shadow-sm'
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
          {!loading && !stats && (
            <div className="text-center py-12 text-gray-400">
              <Store size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-base font-medium">{ar ? 'تعذر تحميل البيانات' : 'Impossible de charger les données'}</p>
              <button onClick={reload} className="mt-3 px-4 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700">{ar ? 'إعادة المحاولة' : 'Réessayer'}</button>
            </div>
          )}
          {stats && stats.activeProducts === 0 && stats.membersWithShares === 0 && stats.invoiceCount === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/10 p-6 text-center">
              <Store size={40} className="mx-auto mb-3 text-teal-400" />
              <h3 className="text-base font-bold text-teal-800 dark:text-teal-200 mb-1">
                {ar ? 'مرحباً بك في وحدة التعاونية 🎉' : 'Bienvenue dans le module Coopérative 🎉'}
              </h3>
              <p className="text-sm text-teal-600 dark:text-teal-400 mb-4">
                {ar
                  ? 'ابدأ بإضافة المنتجات، تسجيل الحصص الاجتماعية، وإنشاء الفواتير'
                  : 'Commencez par ajouter des produits, enregistrer des parts sociales et créer des factures'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={() => setTab('stock')} className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700">
                  {ar ? '+ إضافة منتج' : '+ Ajouter un produit'}
                </button>
                <button onClick={() => setTab('shares')} className="px-4 py-2 bg-white dark:bg-gray-800 border border-teal-300 text-teal-700 dark:text-teal-300 rounded-xl text-sm font-medium hover:bg-teal-50">
                  {ar ? '+ إضافة حصة' : '+ Ajouter une part'}
                </button>
                <button onClick={() => setTab('invoices')} className="px-4 py-2 bg-white dark:bg-gray-800 border border-teal-300 text-teal-700 dark:text-teal-300 rounded-xl text-sm font-medium hover:bg-teal-50">
                  {ar ? '+ إنشاء فاتورة' : '+ Créer une facture'}
                </button>
              </div>
            </div>
          )}
          {stats && (
            <>
              {/* ── Quick Actions ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: ar ? 'منتج جديد' : 'Nouveau produit', icon: <Package size={18} />, color: 'bg-indigo-500 hover:bg-indigo-600', action: () => { setTab('stock'); setTimeout(() => openProductModal(), 50); } },
                  { label: ar ? 'حركة مخزون' : 'Mouvement stock', icon: <ArrowDownUp size={18} />, color: 'bg-emerald-500 hover:bg-emerald-600', action: () => setMovementModal(true) },
                  { label: ar ? 'حصة اجتماعية' : 'Part sociale', icon: <Users size={18} />, color: 'bg-violet-500 hover:bg-violet-600', action: () => { setTab('shares'); setTimeout(() => openShareModal(), 50); } },
                  { label: ar ? 'فاتورة جديدة' : 'Nouvelle facture', icon: <FileText size={18} />, color: 'bg-amber-500 hover:bg-amber-600', action: () => { setTab('invoices'); setTimeout(() => openInvoiceModal(), 50); } },
                ].map((a, i) => (
                  <button key={i} onClick={a.action} className={`${a.color} text-white rounded-xl p-3 flex flex-col items-center gap-2 text-xs font-semibold transition-colors shadow-sm`}>
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">{a.icon}</div>
                    {a.label}
                  </button>
                ))}
              </div>

              {/* ── KPI Cards ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <button onClick={() => setTab('stock')} className="text-start w-full">
                  <StatCard label={t('coop.stats.activeProducts')} value={stats.activeProducts} icon={<Package size={18} />} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
                </button>
                <button onClick={() => setTab('shares')} className="text-start w-full">
                  <StatCard label={t('coop.stats.membersWithShares')} value={stats.membersWithShares} icon={<Users size={18} />} color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
                </button>
                <button onClick={() => setTab('invoices')} className="text-start w-full">
                  <StatCard label={t('coop.stats.totalRevenue')} value={`${fmt(stats.totalRevenue)} MAD`} icon={<TrendingUp size={18} />} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
                </button>
                <button onClick={() => setTab('invoices')} className="text-start w-full">
                  <StatCard label={t('coop.stats.pendingRevenue')} value={`${fmt(stats.pendingRevenue)} MAD`} icon={<Clock size={18} />} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label={t('coop.stats.totalShares')} value={fmt(stats.totalShares)} icon={<BarChart2 size={18} />} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatCard label={t('coop.stats.paidShares')} value={fmt(stats.paidShares)} icon={<CheckCircle size={18} />} color="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" />
                <StatCard label={t('coop.stats.capitalSocial')} value={`${fmt(stats.capitalSocial)} MAD`} icon={<TrendingUp size={18} />} color="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" />
                <StatCard label={t('coop.stats.lowStock')} value={stats.lowStockProducts} icon={<AlertCircle size={18} />} color={stats.lowStockProducts > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-500'} />
              </div>

              {/* ── Smart Alerts ── */}
              {(stats.lowStockProducts > 0 || invoices.some(i => i.status === 'SENT')) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-500" />
                    {ar ? 'تنبيهات' : 'Alertes'}
                  </h3>
                  {stats.stockSummary.filter(p => p.stock <= 5).map(p => (
                    <button key={p.id} onClick={() => setTab('stock')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors text-start">
                      <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-red-800 dark:text-red-300 truncate">{p.name}</div>
                        <div className="text-xs text-red-500">{ar ? `مخزون منخفض: ${fmt(p.stock)} ${p.unit}` : `Stock bas: ${fmt(p.stock)} ${p.unit}`}</div>
                      </div>
                      <ChevronRight size={14} className="text-red-400 flex-shrink-0" />
                    </button>
                  ))}
                  {invoices.filter(i => i.status === 'SENT').slice(0, 3).map(inv => (
                    <button key={inv.id} onClick={() => setTab('invoices')}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors text-start">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">{inv.clientName} — {inv.number}</div>
                        <div className="text-xs text-amber-500">{ar ? `في انتظار الدفع: ${fmt(inv.totalAmount)} MAD` : `En attente de paiement: ${fmt(inv.totalAmount)} MAD`}</div>
                      </div>
                      <ChevronRight size={14} className="text-amber-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* ── Charts + Activity ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Shares donut */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">{ar ? 'رأس المال الاجتماعي' : 'Capital Social'}</h3>
                  {stats.totalShares > 0 ? (() => {
                    const pct = Math.round((stats.paidShares / stats.totalShares) * 100);
                    const r = 36; const circ = 2 * Math.PI * r;
                    const dash = (pct / 100) * circ;
                    return (
                      <div className="flex items-center gap-6">
                        <div className="relative flex-shrink-0">
                          <svg width="96" height="96" viewBox="0 0 96 96">
                            <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="10" />
                            <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" className="text-teal-500" strokeWidth="10"
                              strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">{pct}%</span>
                          </div>
                        </div>
                        <div className="space-y-2 flex-1">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{ar ? 'إجمالي الحصص' : 'Parts totales'}</div>
                            <div className="font-bold text-gray-900 dark:text-white">{fmt(stats.totalShares)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{ar ? 'المدفوعة' : 'Payées'}</div>
                            <div className="font-bold text-emerald-600">{fmt(stats.paidShares)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{ar ? 'رأس المال' : 'Capital'}</div>
                            <div className="font-bold text-indigo-600">{fmt(stats.capitalSocial)} MAD</div>
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="text-center py-6 text-gray-400 text-sm">{ar ? 'لا توجد حصص بعد' : 'Aucune part enregistrée'}</div>
                  )}
                </div>

                {/* Recent invoices */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{ar ? 'آخر الفواتير' : 'Dernières factures'}</h3>
                    <button onClick={() => setTab('invoices')} className="text-xs text-teal-600 hover:underline">{ar ? 'الكل' : 'Voir tout'}</button>
                  </div>
                  {invoices.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">{ar ? 'لا توجد فواتير بعد' : 'Aucune facture'}</div>
                  ) : (
                    <div className="space-y-2">
                      {invoices.slice(0, 4).map(inv => (
                        <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold
                            ${inv.type === 'FACTURE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : inv.type === 'DEVIS'   ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                     : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {inv.type.slice(0, 1)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{inv.clientName}</div>
                            <div className="text-xs text-gray-400">{inv.number} · {fmtDate(inv.date)}</div>
                          </div>
                          <div className="text-end flex-shrink-0">
                            <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">{fmt(inv.totalAmount)} MAD</div>
                            <StatusBadge status={inv.status} t={t} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Stock + Recent movements ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Stock levels with bar chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{t('coop.products.title')}</h3>
                    <button onClick={() => setTab('stock')} className="text-xs text-teal-600 hover:underline">{ar ? 'إدارة' : 'Gérer'}</button>
                  </div>
                  {stats.stockSummary.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">{t('coop.products.noProducts')}</div>
                  ) : (() => {
                    const maxStock = Math.max(...stats.stockSummary.map(p => p.stock), 1);
                    return (
                      <div className="space-y-3">
                        {stats.stockSummary.slice(0, 6).map(p => (
                          <div key={p.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{p.name}</span>
                              <span className={`text-xs font-semibold ms-2 flex-shrink-0 ${p.stock <= 0 ? 'text-red-600' : p.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {fmt(p.stock)} {p.unit}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${p.stock <= 0 ? 'bg-red-500' : p.stock <= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.max(2, (p.stock / maxStock) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Recent movements */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{ar ? 'آخر الحركات' : 'Derniers mouvements'}</h3>
                    <button onClick={() => setTab('stock')} className="text-xs text-teal-600 hover:underline">{ar ? 'الكل' : 'Voir tout'}</button>
                  </div>
                  {movements.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">{ar ? 'لا توجد حركات بعد' : 'Aucun mouvement'}</div>
                  ) : (
                    <div className="space-y-2">
                      {movements.slice(0, 5).map(mv => (
                        <div key={mv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                            ${mv.type === 'IN' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : mv.type === 'OUT' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                            <ArrowDownUp size={12} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{mv.product?.name || '—'}</div>
                            <div className="text-xs text-gray-400">{fmtDate(mv.date)}{mv.reference ? ` · ${mv.reference}` : ''}</div>
                          </div>
                          <div className={`text-xs font-semibold flex-shrink-0 ${mv.type === 'IN' ? 'text-emerald-600' : mv.type === 'OUT' ? 'text-red-600' : 'text-gray-600'}`}>
                            {mv.type === 'IN' ? '+' : mv.type === 'OUT' ? '-' : '~'}{fmt(mv.quantity)} {mv.product?.unit}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PRODUCTION ─────────────────────────────────────────────────── */}
      {tab === 'production' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              {[
                { s: 'PLANNED',     label: ar ? 'مخططة' : 'Planifiée',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                { s: 'IN_PROGRESS', label: ar ? 'جارية' : 'En cours',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
                { s: 'COMPLETED',   label: ar ? 'مكتملة' : 'Terminée',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
                { s: 'CANCELLED',   label: ar ? 'ملغاة' : 'Annulée',       color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
              ].map(b => (
                <span key={b.s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.color}`}>{b.label}: {productions.filter(p => p.status === b.s).length}</span>
              ))}
            </div>
            <button onClick={() => openProductionModal()} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700">
              <Plus size={16} />{ar ? 'دورة إنتاج جديدة' : 'Nouvelle production'}
            </button>
          </div>

          {productions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package size={40} className="mx-auto mb-2 opacity-30" />
              <p>{ar ? 'لا توجد دورات إنتاج بعد' : 'Aucune production enregistrée'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {productions.map(prod => {
                const statusColor = prod.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : prod.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  : prod.status === 'CANCELLED'   ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
                const statusLabel = prod.status === 'COMPLETED' ? (ar ? 'مكتملة' : 'Terminée')
                  : prod.status === 'IN_PROGRESS' ? (ar ? 'جارية' : 'En cours')
                  : prod.status === 'CANCELLED'   ? (ar ? 'ملغاة' : 'Annulée')
                  : (ar ? 'مخططة' : 'Planifiée');
                const progress = prod.actualQty != null && prod.plannedQty > 0 ? Math.min(100, (prod.actualQty / prod.plannedQty) * 100) : 0;
                return (
                  <div key={prod.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-start gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{prod.productName}</span>
                          <span className="text-xs text-gray-400 font-mono">{prod.batchNumber}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                        </div>
                        <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                          <span>{ar ? 'مخطط:' : 'Prévu:'} <strong>{fmt(prod.plannedQty)}</strong></span>
                          {prod.actualQty != null && <span>{ar ? 'فعلي:' : 'Réel:'} <strong className="text-emerald-600">{fmt(prod.actualQty)}</strong></span>}
                          {prod.productionCost > 0 && <span>{ar ? 'التكلفة:' : 'Coût:'} <strong>{fmt(prod.productionCost)} MAD</strong></span>}
                          {prod.startDate && <span>{ar ? 'بداية:' : 'Début:'} {fmtDate(prod.startDate)}</span>}
                          {prod.endDate && <span>{ar ? 'نهاية:' : 'Fin:'} {fmtDate(prod.endDate)}</span>}
                        </div>
                        {prod.status === 'IN_PROGRESS' && prod.plannedQty > 0 && (
                          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden w-full max-w-xs">
                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                        {prod.inputs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {prod.inputs.map((inp, i) => (
                              <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                {inp.product?.name || inp.description}: {fmt(inp.quantity)} {inp.unit}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {prod.status === 'PLANNED' && (
                          <button onClick={() => updateProductionStatus(prod.id, 'IN_PROGRESS')} className="px-2 py-1 text-xs bg-amber-500 text-white rounded-lg hover:bg-amber-600">{ar ? 'بدء' : 'Démarrer'}</button>
                        )}
                        {prod.status === 'IN_PROGRESS' && (
                          <button onClick={() => { const q = prompt(ar ? 'الكمية المنتجة الفعلية:' : 'Quantité réelle produite:', String(prod.plannedQty)); if (q) updateProductionStatus(prod.id, 'COMPLETED', q); }} className="px-2 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">{ar ? 'إنهاء' : 'Terminer'}</button>
                        )}
                        <button onClick={() => openProductionModal(prod)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Edit2 size={14} /></button>
                        <button onClick={() => deleteProduction(prod.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VENTES ─────────────────────────────────────────────────────── */}
      {tab === 'ventes' && (
        <div className="space-y-4">
          {/* Sales KPIs */}
          {salesStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label={ar ? 'إجمالي المبيعات' : 'Total ventes'} value={fmt(salesStats.totalRevenue) + ' MAD'} icon={<TrendingUp size={18} />} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <StatCard label={ar ? 'في الانتظار' : 'En attente'} value={fmt(salesStats.pendingRevenue) + ' MAD'} icon={<Clock size={18} />} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
              <StatCard label={ar ? 'عدد العملاء' : 'Clients'} value={salesStats.totalClients} icon={<Users size={18} />} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" />
              <StatCard label={ar ? 'عدد العمليات' : 'Ventes'} value={salesStats.totalSales} icon={<FileText size={18} />} color="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" />
            </div>
          )}

          {/* Sub-tabs */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
            <button onClick={() => setVentesSubTab('sales')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${ventesSubTab === 'sales' ? 'bg-white dark:bg-gray-700 text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {ar ? 'المبيعات' : 'Ventes'}
            </button>
            <button onClick={() => setVentesSubTab('clients')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${ventesSubTab === 'clients' ? 'bg-white dark:bg-gray-700 text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {ar ? 'العملاء' : 'Clients'}
            </button>
          </div>

          {/* ── Sales list ── */}
          {ventesSubTab === 'sales' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => openSaleModal()} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700">
                  <Plus size={16} />{ar ? 'بيع جديد' : 'Nouvelle vente'}
                </button>
              </div>
              {sales.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Store size={40} className="mx-auto mb-2 opacity-30" />
                  <p>{ar ? 'لا توجد مبيعات بعد' : 'Aucune vente enregistrée'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sales.map(sale => {
                    const saleStatusColor = sale.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : sale.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      : sale.status === 'RETURNED'  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
                    const saleStatusLabel = sale.status === 'COMPLETED' ? (ar ? 'مكتملة' : 'Terminée')
                      : sale.status === 'CANCELLED' ? (ar ? 'ملغاة' : 'Annulée')
                      : sale.status === 'RETURNED'  ? (ar ? 'مردودة' : 'Retournée')
                      : (ar ? 'مسودة' : 'Brouillon');
                    const balance = sale.totalAmount - sale.paidAmount;
                    return (
                      <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-start gap-3 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-gray-900 dark:text-white text-sm">{sale.clientName}</span>
                              <span className="text-xs text-gray-400 font-mono">{sale.saleNumber}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${saleStatusColor}`}>{saleStatusLabel}</span>
                            </div>
                            <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                              <span>{fmtDate(sale.date)}</span>
                              <span>{ar ? 'المبلغ:' : 'Montant:'} <strong className="text-gray-800 dark:text-gray-200">{fmt(sale.totalAmount)} MAD</strong></span>
                              {sale.paidAmount > 0 && <span>{ar ? 'مدفوع:' : 'Payé:'} <strong className="text-emerald-600">{fmt(sale.paidAmount)} MAD</strong></span>}
                              {balance > 0 && sale.status !== 'CANCELLED' && <span className="text-amber-600">{ar ? 'الباقي:' : 'Reste:'} <strong>{fmt(balance)} MAD</strong></span>}
                              {sale.paymentMethod && <span className="capitalize">{sale.paymentMethod}</span>}
                            </div>
                            {sale.items.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {sale.items.map((item, i) => (
                                  <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                                    {item.product?.name || item.description} ×{item.quantity}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {sale.status === 'DRAFT' && (
                              <button onClick={() => updateSaleStatus(sale.id, 'COMPLETED')} className="px-2 py-1 text-xs bg-emerald-500 text-white rounded-lg hover:bg-emerald-600">{ar ? 'تأكيد' : 'Confirmer'}</button>
                            )}
                            {sale.status === 'DRAFT' && (
                              <button onClick={() => updateSaleStatus(sale.id, 'CANCELLED')} className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600">{ar ? 'إلغاء' : 'Annuler'}</button>
                            )}
                            <button onClick={() => openSaleModal(sale)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Edit2 size={14} /></button>
                            <button onClick={() => deleteSale(sale.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Clients list ── */}
          {ventesSubTab === 'clients' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => openClientModal()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
                  <Plus size={16} />{ar ? 'عميل جديد' : 'Nouveau client'}
                </button>
              </div>
              {clients.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Users size={40} className="mx-auto mb-2 opacity-30" />
                  <p>{ar ? 'لا يوجد عملاء بعد' : 'Aucun client enregistré'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {clients.map(cl => {
                    const clientSales = sales.filter(s => s.clientId === cl.id);
                    const totalSpent = clientSales.filter(s => s.status === 'COMPLETED').reduce((a, s) => a + s.totalAmount, 0);
                    return (
                      <div key={cl.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">{cl.name}</div>
                            {cl.phone && <div className="text-xs text-gray-500 mt-0.5">{cl.phone}</div>}
                            {cl.city && <div className="text-xs text-gray-400">{cl.city}</div>}
                            <div className="mt-2 flex gap-3 text-xs">
                              <span className="text-gray-500">{clientSales.length} {ar ? 'عملية' : 'ventes'}</span>
                              {totalSpent > 0 && <span className="text-emerald-600 font-medium">{fmt(totalSpent)} MAD</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => openClientModal(cl)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"><Edit2 size={14} /></button>
                            <button onClick={() => deleteClient(cl.id)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500"><Trash2 size={14} /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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

      {/* ── BOARD MEETINGS (مجلس الإدارة) ──────────────────────────── */}
      {tab === 'board' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{ar ? 'اجتماعات مجلس الإدارة' : 'Réunions du Conseil d\'Administration'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ar ? 'المحاضر، المقررات، ومتابعة القرارات' : 'Procès-verbaux, décisions et suivi'}</p>
            </div>
            <button onClick={() => openBoardModal()} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700">
              <Plus size={16} />{ar ? 'اجتماع جديد' : 'Nouvelle réunion'}
            </button>
          </div>

          {boardMeetings.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <CalendarDays size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{ar ? 'لا توجد اجتماعات مسجلة' : 'Aucune réunion enregistrée'}</p>
            </div>
          )}

          <div className="space-y-3">
            {boardMeetings.map(mtg => {
              const isOpen = expandedMeeting === mtg.id;
              const statusColor = mtg.status === 'HELD' ? 'text-emerald-600 bg-emerald-50' : mtg.status === 'CANCELLED' ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50';
              return (
                <div key={mtg.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                      <CalendarDays size={18} className="text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{mtg.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                          {mtg.status === 'HELD' ? (ar ? 'منعقد' : 'Tenu') : mtg.status === 'CANCELLED' ? (ar ? 'ملغى' : 'Annulé') : (ar ? 'مجدول' : 'Planifié')}
                        </span>
                        {mtg.decisions.length > 0 && (
                          <span className="text-xs text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded-full">
                            {mtg.decisions.length} {ar ? 'قرار' : 'décision(s)'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span>📅 {fmtDate(mtg.date)}</span>
                        {mtg.location && <span>📍 {mtg.location}</span>}
                      </div>
                      {mtg.agenda && <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{ar ? 'جدول الأعمال: ' : 'Ordre du jour: '}{mtg.agenda}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openBoardModal(mtg)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><Edit2 size={14} /></button>
                      <button onClick={() => deleteBoardMeeting(mtg.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500"><Trash2 size={14} /></button>
                      <button onClick={() => setExpandedMeeting(isOpen ? null : mtg.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500">
                        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3 bg-gray-50 dark:bg-gray-800/50">
                      {/* PV Content */}
                      {mtg.pvContent && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{ar ? 'محضر الاجتماع' : 'Procès-verbal'}</h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">{mtg.pvContent}</p>
                        </div>
                      )}
                      {/* Decisions */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">{ar ? 'القرارات' : 'Décisions'}</h4>
                          <button onClick={() => setDecisionModal(mtg.id)} className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1">
                            <Plus size={12} />{ar ? 'إضافة قرار' : 'Ajouter'}
                          </button>
                        </div>
                        {mtg.decisions.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">{ar ? 'لا توجد قرارات مسجلة' : 'Aucune décision enregistrée'}</p>
                        ) : (
                          <div className="space-y-1.5">
                            {mtg.decisions.map(d => (
                              <div key={d.id} className="flex items-start gap-2 text-xs">
                                <button onClick={() => toggleDecisionStatus(mtg.id, d.id, d.status)} className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${d.status === 'DONE' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                  {d.status === 'DONE' && <CheckCircle size={10} />}
                                </button>
                                <span className={`flex-1 ${d.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>{d.description}</span>
                                {d.assignedTo && <span className="text-gray-400">→ {d.assignedTo}</span>}
                                {d.dueDate && <span className="text-gray-400">{fmtDate(d.dueDate)}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Mark as held */}
                      {mtg.status === 'SCHEDULED' && (
                        <button
                          onClick={() => coopApi.updateBoardMeeting(mtg.id, { status: 'HELD' }).then(() => loadBoard())}
                          className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg"
                        >
                          ✓ {ar ? 'تسجيل كمنعقد' : 'Marquer comme tenu'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Board meeting modal */}
          {boardModal && (
            <Modal title={editMeeting ? (ar ? 'تعديل الاجتماع' : 'Modifier la réunion') : (ar ? 'اجتماع جديد' : 'Nouvelle réunion')} onClose={() => setBoardModal(false)} wide>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{ar ? 'نوع الجلسة' : 'Type de séance'}</label>
                    <select className="input" value={boardForm.sessionType} onChange={e => setBoardForm(f => ({ ...f, sessionType: e.target.value }))}>
                      <option value="ORDINARY">{ar ? 'عادية' : 'Ordinaire'}</option>
                      <option value="EXTRAORDINARY">{ar ? 'استثنائية' : 'Extraordinaire'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{ar ? 'التاريخ' : 'Date'}</label>
                    <input type="date" className="input" value={boardForm.date} onChange={e => setBoardForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="label">{ar ? 'العنوان' : 'Titre'}</label>
                  <input className="input" value={boardForm.title} onChange={e => setBoardForm(f => ({ ...f, title: e.target.value }))} placeholder={ar ? 'اجتماع عادي لمجلس الإدارة' : 'Réunion ordinaire du CA'} />
                </div>
                <div>
                  <label className="label">{ar ? 'المكان' : 'Lieu'}</label>
                  <input className="input" value={boardForm.location} onChange={e => setBoardForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{ar ? 'جدول الأعمال' : 'Ordre du jour'}</label>
                  <textarea className="input resize-none" rows={3} value={boardForm.agenda} onChange={e => setBoardForm(f => ({ ...f, agenda: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{ar ? 'محضر الاجتماع (PV)' : 'Procès-verbal (PV)'}</label>
                  <textarea className="input resize-none" rows={4} value={boardForm.pvContent} onChange={e => setBoardForm(f => ({ ...f, pvContent: e.target.value }))} placeholder={ar ? 'نص المحضر الرسمي...' : 'Texte officiel du PV...'} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setBoardModal(false)} className="btn-secondary">{ar ? 'إلغاء' : 'Annuler'}</button>
                  <button onClick={saveBoardMeeting} className="btn-primary">{ar ? 'حفظ' : 'Enregistrer'}</button>
                </div>
              </div>
            </Modal>
          )}

          {/* Decision modal */}
          {decisionModal && (
            <Modal title={ar ? 'إضافة قرار' : 'Ajouter une décision'} onClose={() => setDecisionModal(null)}>
              <div className="space-y-3">
                <div>
                  <label className="label">{ar ? 'نص القرار' : 'Décision'}</label>
                  <textarea className="input resize-none" rows={3} value={decisionForm.description} onChange={e => setDecisionForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{ar ? 'مكلف بالتنفيذ' : 'Responsable'}</label>
                  <input className="input" value={decisionForm.assignedTo} onChange={e => setDecisionForm(f => ({ ...f, assignedTo: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{ar ? 'أجل التنفيذ' : 'Échéance'}</label>
                  <input type="date" className="input" value={decisionForm.dueDate} onChange={e => setDecisionForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setDecisionModal(null)} className="btn-secondary">{ar ? 'إلغاء' : 'Annuler'}</button>
                  <button onClick={saveDecision} className="btn-primary">{ar ? 'حفظ' : 'Enregistrer'}</button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── PROJECTS & PARTNERSHIPS (المشاريع والشراكات) ─────────────── */}
      {tab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">{ar ? 'المشاريع والشراكات' : 'Projets & Partenariats'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ar ? 'المشاريع الداخلية واتفاقيات الشراكة' : 'Projets internes et accords de partenariat'}</p>
            </div>
            <button onClick={() => openProjectModal()} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700">
              <Plus size={16} />{ar ? 'مشروع جديد' : 'Nouveau projet'}
            </button>
          </div>

          {/* Stats row */}
          {coopProjects.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: ar ? 'إجمالي المشاريع' : 'Total projets', value: coopProjects.length, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400' },
                { label: ar ? 'شراكات' : 'Partenariats', value: coopProjects.filter(p => p.type === 'PARTENARIAT').length, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400' },
                { label: ar ? 'قيد التنفيذ' : 'En cours', value: coopProjects.filter(p => p.status === 'IN_PROGRESS').length, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {coopProjects.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Briefcase size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">{ar ? 'لا توجد مشاريع مسجلة' : 'Aucun projet enregistré'}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coopProjects.map(proj => {
              const isPartnership = proj.type === 'PARTENARIAT';
              const partnerName = proj.generalGoal?.startsWith('Partenaire: ') ? proj.generalGoal.replace('Partenaire: ', '') : '';
              const statusMap: Record<string, { label: string; color: string }> = {
                PLANNED:     { label: ar ? 'مخطط' : 'Planifié',     color: 'bg-gray-100 text-gray-700' },
                IN_PROGRESS: { label: ar ? 'جاري' : 'En cours',     color: 'bg-blue-100 text-blue-700' },
                COMPLETED:   { label: ar ? 'منجز' : 'Terminé',      color: 'bg-emerald-100 text-emerald-700' },
                SUSPENDED:   { label: ar ? 'موقوف' : 'Suspendu',    color: 'bg-red-100 text-red-700' },
              };
              const st = statusMap[proj.status] || statusMap.PLANNED;
              return (
                <div key={proj.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-lg ${isPartnership ? '🤝' : '🏗️'}`}>{isPartnership ? '🤝' : '🏗️'}</span>
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{proj.title}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openProjectModal(proj)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"><Edit2 size={13} /></button>
                      <button onClick={() => deleteProject(proj.id)} className="p-1 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                      {isPartnership ? (ar ? 'شراكة' : 'Partenariat') : (ar ? 'مشروع داخلي' : 'Projet interne')}
                    </span>
                  </div>
                  {isPartnership && partnerName && (
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mb-1">
                      🤝 {ar ? 'الشريك: ' : 'Partenaire: '}{partnerName}
                    </div>
                  )}
                  {proj.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{proj.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    {proj.budget && <span>💰 {fmt(proj.budget)} MAD</span>}
                    {proj.startDate && <span>📅 {fmtDate(proj.startDate)}</span>}
                    {proj.endDate && <span>→ {fmtDate(proj.endDate)}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project modal */}
          {projectModal && (
            <Modal title={editProject ? (ar ? 'تعديل المشروع' : 'Modifier') : (ar ? 'مشروع جديد' : 'Nouveau projet')} onClose={() => setProjectModal(false)} wide>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">{ar ? 'نوع المشروع' : 'Type'}</label>
                    <select className="input" value={projectForm.type} onChange={e => setProjectForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="INTERNE">{ar ? 'مشروع داخلي' : 'Projet interne'}</option>
                      <option value="PARTENARIAT">{ar ? 'اتفاقية شراكة' : 'Partenariat'}</option>
                      <option value="FINANCEMENT">{ar ? 'طلب تمويل' : 'Financement'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">{ar ? 'الحالة' : 'Statut'}</label>
                    <select className="input" value={projectForm.status} onChange={e => setProjectForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="PLANNED">{ar ? 'مخطط' : 'Planifié'}</option>
                      <option value="IN_PROGRESS">{ar ? 'جاري' : 'En cours'}</option>
                      <option value="COMPLETED">{ar ? 'منجز' : 'Terminé'}</option>
                      <option value="SUSPENDED">{ar ? 'موقوف' : 'Suspendu'}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">{ar ? 'عنوان المشروع' : 'Titre du projet'}</label>
                  <input className="input" value={projectForm.title} onChange={e => setProjectForm(f => ({ ...f, title: e.target.value }))} />
                </div>
                {projectForm.type === 'PARTENARIAT' && (
                  <div>
                    <label className="label">{ar ? 'اسم الشريك' : 'Nom du partenaire'}</label>
                    <input className="input" value={projectForm.partnerName} onChange={e => setProjectForm(f => ({ ...f, partnerName: e.target.value }))} placeholder={ar ? 'وزارة، جمعية، مؤسسة...' : 'Ministère, ONG, entreprise...'} />
                  </div>
                )}
                <div>
                  <label className="label">{ar ? 'وصف' : 'Description'}</label>
                  <textarea className="input resize-none" rows={3} value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label">{ar ? 'الميزانية (MAD)' : 'Budget (MAD)'}</label>
                    <input type="number" className="input" value={projectForm.budget} onChange={e => setProjectForm(f => ({ ...f, budget: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">{ar ? 'تاريخ البداية' : 'Début'}</label>
                    <input type="date" className="input" value={projectForm.startDate} onChange={e => setProjectForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">{ar ? 'تاريخ النهاية' : 'Fin'}</label>
                    <input type="date" className="input" value={projectForm.endDate} onChange={e => setProjectForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setProjectModal(false)} className="btn-secondary">{ar ? 'إلغاء' : 'Annuler'}</button>
                  <button onClick={saveProject} className="btn-primary">{ar ? 'حفظ' : 'Enregistrer'}</button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ── REPORTS ───────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {!reports && <div className="text-center py-16 text-gray-400">{ar ? 'جاري التحميل...' : 'Chargement...'}</div>}
          {reports && (
            <>
              {/* ── Comptable-grade annual report (converted coops only) ── */}
              {isConverted && (
                <div className="space-y-4" id="annual-report-print">
                  {/* Report header */}
                  <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)' }}>
                    <p className="text-teal-100 text-xs uppercase tracking-widest mb-1">{ar ? 'التقرير السنوي' : 'RAPPORT ANNUEL'}</p>
                    <h2 className="text-white font-bold text-xl">{organization?.nameAr || organization?.name}</h2>
                    <p className="text-teal-100 text-sm mt-0.5">{ar ? `السنة المالية ${currentYear}` : `Exercice fiscal ${currentYear}`}</p>
                    {(organization as any)?.ice && <p className="text-teal-200 text-xs mt-1">ICE: {(organization as any).ice}</p>}
                    <button
                      onClick={() => window.print()}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
                    >
                      🖨️ {ar ? 'طباعة / PDF' : 'Imprimer / PDF'}
                    </button>
                  </div>

                  {/* ── 1. Compte de résultat (Income Statement) ── */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-emerald-600 px-4 py-2.5 flex items-center gap-2">
                      <TrendingUp size={16} className="text-white" />
                      <h3 className="text-white font-bold text-sm">{ar ? 'حساب النتائج — رقم الأعمال' : 'Compte de Résultat — Chiffre d\'Affaires'}</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{ar ? 'رقم الأعمال المحصَّل (فواتير مدفوعة)' : 'CA encaissé (factures payées)'}</span>
                        <span className="font-bold text-emerald-600 text-base">{fmt(reports.totalRevenue)} MAD</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-sm text-gray-500">{ar ? 'مستحقات في الانتظار' : 'Créances en attente'}</span>
                        <span className="font-semibold text-amber-600">{fmt(reports.pendingRevenue)} MAD</span>
                      </div>
                      <div className="flex justify-between items-center py-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 rounded-lg">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{ar ? 'الرقم الإجمالي للأعمال' : 'CA Total (encaissé + attente)'}</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 text-lg">{fmt(reports.totalRevenue + reports.pendingRevenue)} MAD</span>
                      </div>
                    </div>
                    {/* Monthly breakdown */}
                    <div className="px-4 pb-4">
                      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{ar ? 'التوزيع الشهري' : 'Répartition mensuelle'}</p>
                      <div className="flex items-end gap-1 h-24">
                        {reports.monthlyRevenue.map((v: number, i: number) => {
                          const max = Math.max(...reports.monthlyRevenue, 1);
                          const h = Math.round((v / max) * 100);
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              {v > 0 && <div className="text-[8px] text-gray-500 font-medium">{fmt(v)}</div>}
                              <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${h}%`, minHeight: v > 0 ? '3px' : '0' }} />
                              <div className="text-[8px] text-gray-400">{ar ? MONTHS_AR[i].slice(0,3) : MONTHS_FR[i]}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ── 2. État des parts sociales ── */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-indigo-600 px-4 py-2.5 flex items-center gap-2">
                      <Users size={16} className="text-white" />
                      <h3 className="text-white font-bold text-sm">{ar ? 'حالة الحصص الاجتماعية ورأس المال' : 'État des Parts Sociales et Capital'}</h3>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: ar ? 'مجموع الحصص المكتتبة' : 'Parts souscrites', value: fmt(reports.totalShares), color: 'text-indigo-600' },
                          { label: ar ? 'مجموع الحصص المدفوعة' : 'Parts libérées', value: fmt(reports.paidCapital / (shareValue || 1)), color: 'text-emerald-600' },
                          { label: ar ? 'رأس المال المكتتب' : 'Capital souscrit', value: `${fmt(reports.totalCapital)} MAD`, color: 'text-indigo-700' },
                          { label: ar ? 'رأس المال المدفوع' : 'Capital libéré', value: `${fmt(reports.paidCapital)} MAD`, color: 'text-emerald-700' },
                        ].map((row, i) => (
                          <div key={i} className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3">
                            <p className="text-xs text-gray-500 mb-1">{row.label}</p>
                            <p className={`font-bold ${row.color}`}>{row.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{ar ? 'نسبة التحصيل' : 'Taux de libération'}</span>
                          <span className="font-semibold text-emerald-600">{reports.totalCapital > 0 ? Math.round((reports.paidCapital / reports.totalCapital) * 100) : 0}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${reports.totalCapital > 0 ? (reports.paidCapital / reports.totalCapital) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
                        {ar ? `قيمة الحصة الواحدة: ${fmt(shareValue)} درهم` : `Valeur nominale d'une part : ${fmt(shareValue)} MAD`}
                      </div>
                    </div>
                  </div>

                  {/* ── 3. État du stock ── */}
                  {stats && stats.stockSummary.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <div className="bg-violet-600 px-4 py-2.5 flex items-center gap-2">
                        <Package size={16} className="text-white" />
                        <h3 className="text-white font-bold text-sm">{ar ? 'جرد المخزون — نهاية السنة' : 'Inventaire du Stock — Fin d\'exercice'}</h3>
                      </div>
                      <div className="p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-start py-2 text-xs text-gray-500 font-semibold">{ar ? 'المنتج' : 'Produit'}</th>
                              <th className="text-center py-2 text-xs text-gray-500 font-semibold">{ar ? 'الرصيد' : 'Solde'}</th>
                              <th className="text-end py-2 text-xs text-gray-500 font-semibold">{ar ? 'الوحدة' : 'Unité'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {stats.stockSummary.map((p: any) => (
                              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="py-2 font-medium text-gray-800 dark:text-gray-200">{p.name}</td>
                                <td className="py-2 text-center">
                                  <span className={`font-bold ${p.stock <= 0 ? 'text-red-600' : p.stock < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>{fmt(p.stock)}</span>
                                </td>
                                <td className="py-2 text-end text-gray-500 text-xs">{p.unit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── 4. Situation des factures ── */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-amber-600 px-4 py-2.5 flex items-center gap-2">
                      <FileText size={16} className="text-white" />
                      <h3 className="text-white font-bold text-sm">{ar ? 'حالة الوثائق التجارية' : 'Situation des Documents Commerciaux'}</h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(reports.invoicesByStatus).map(([s, cnt]) => (
                          <div key={s} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-2">
                            <span className="text-xs text-gray-600 dark:text-gray-400">{tr.invoices?.[s] || s}</span>
                            <span className={`font-bold text-sm ${s==='PAID' ? 'text-emerald-600' : s==='CANCELLED' ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{cnt as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── 5. Signature block (for tribunal) ── */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-5">
                    <p className="text-xs text-gray-500 text-center mb-4">{ar ? '— للاستخدام الرسمي — يُودَع هذا التقرير في كتابة الضبط بالمحكمة التجارية المختصة —' : '— Usage officiel — Ce rapport est déposé au greffe du tribunal de commerce compétent —'}</p>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="text-center">
                        <div className="h-12 border-b border-gray-400 dark:border-gray-500 mb-2" />
                        <p className="text-xs text-gray-500">{ar ? 'توقيع ومختم رئيس مجلس الإدارة' : 'Signature et cachet du Président du CA'}</p>
                      </div>
                      <div className="text-center">
                        <div className="h-12 border-b border-gray-400 dark:border-gray-500 mb-2" />
                        <p className="text-xs text-gray-500">{ar ? 'توقيع المحاسب المعتمد' : 'Signature du Comptable agréé'}</p>
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-4">{ar ? `المرجع القانوني: القانون رقم 112.12 المتعلق بالتعاونيات — السنة المالية ${currentYear}` : `Référence légale : Loi n°112.12 relative aux coopératives — Exercice ${currentYear}`}</p>
                  </div>
                </div>
              )}

              {/* ── Standard reports for non-converted orgs ── */}
              {!isConverted && (
                <>
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
                            <div className="text-[9px] text-gray-400">{ar ? MONTHS_AR[i].slice(0,3) : MONTHS_FR[i]}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('coop.reports.invoiceStatus')}</h3>
                      <div className="space-y-2">
                        {Object.entries(reports.invoicesByStatus).map(([s, cnt]) => (
                          <div key={s} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{tr.invoices?.[s] || s}</span>
                            <span className={`text-sm font-bold ${s==='PAID' ? 'text-emerald-600' : s==='CANCELLED' ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>{cnt as number}</span>
                          </div>
                        ))}
                      </div>
                    </div>
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
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label={ar ? 'رقم الأعمال الكلي' : 'CA total encaissé'} value={`${fmt(reports.totalRevenue)} MAD`} icon={<CheckCircle size={18} />} color="bg-emerald-100 text-emerald-600" />
                    <StatCard label={ar ? 'إيرادات في الانتظار' : 'CA en attente'} value={`${fmt(reports.pendingRevenue)} MAD`} icon={<Clock size={18} />} color="bg-amber-100 text-amber-600" />
                  </div>
                </>
              )}
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

      {/* ── Production Modal ── */}
      {productionModal && (
        <Modal title={editProduction ? (ar ? 'تعديل دورة الإنتاج' : 'Modifier la production') : (ar ? 'دورة إنتاج جديدة' : 'Nouvelle production')} onClose={() => setProductionModal(false)} wide>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'اسم المنتج *' : 'Produit *'}</label>
                <select value={productionForm.productId} onChange={e => { const p = products.find(x => x.id === e.target.value); setProductionForm(f => ({ ...f, productId: e.target.value, productName: p?.name || f.productName })); }} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="">{ar ? '-- اختر أو أدخل اسماً --' : '-- Choisir ou saisir --'}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'اسم المنتج (نصي)' : 'Nom produit (texte)'}</label>
                <input value={productionForm.productName} onChange={e => setProductionForm(f => ({ ...f, productName: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'الكمية المخططة *' : 'Quantité prévue *'}</label>
                <input type="number" value={productionForm.plannedQty} onChange={e => setProductionForm(f => ({ ...f, plannedQty: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'تكلفة الإنتاج (MAD)' : 'Coût production (MAD)'}</label>
                <input type="number" value={productionForm.productionCost} onChange={e => setProductionForm(f => ({ ...f, productionCost: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'تاريخ البداية' : 'Date début'}</label>
                <input type="date" value={productionForm.startDate} onChange={e => setProductionForm(f => ({ ...f, startDate: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'تاريخ النهاية' : 'Date fin'}</label>
                <input type="date" value={productionForm.endDate} onChange={e => setProductionForm(f => ({ ...f, endDate: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            {/* Inputs/matières premières */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{ar ? 'المواد المستخدمة' : 'Matières premières'}</span>
                <button onClick={() => setProductionForm(f => ({ ...f, inputs: [...f.inputs, { description: '', productId: '', quantity: '1', unit: 'unité' }] }))} className="p-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600"><Plus size={14} /></button>
              </div>
              {productionForm.inputs.map((inp, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-end">
                  <input placeholder={ar ? 'المادة' : 'Matière'} value={inp.description} onChange={e => { const ins = [...productionForm.inputs]; ins[i] = { ...ins[i], description: e.target.value }; setProductionForm(f => ({ ...f, inputs: ins })); }} className="col-span-2 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <input type="number" placeholder={ar ? 'الكمية' : 'Qté'} value={inp.quantity} onChange={e => { const ins = [...productionForm.inputs]; ins[i] = { ...ins[i], quantity: e.target.value }; setProductionForm(f => ({ ...f, inputs: ins })); }} className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  <div className="flex gap-1">
                    <input placeholder={ar ? 'الوحدة' : 'Unité'} value={inp.unit} onChange={e => { const ins = [...productionForm.inputs]; ins[i] = { ...ins[i], unit: e.target.value }; setProductionForm(f => ({ ...f, inputs: ins })); }} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <button onClick={() => setProductionForm(f => ({ ...f, inputs: f.inputs.filter((_, j) => j !== i) }))} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><X size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={productionForm.notes} onChange={e => setProductionForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <button onClick={saveProduction} className="w-full py-2 bg-teal-600 text-white rounded-xl font-medium text-sm hover:bg-teal-700">{ar ? 'حفظ' : 'Enregistrer'}</button>
          </div>
        </Modal>
      )}

      {/* ── Client Modal ── */}
      {clientModal && (
        <Modal title={editClient ? (ar ? 'تعديل العميل' : 'Modifier le client') : (ar ? 'عميل جديد' : 'Nouveau client')} onClose={() => setClientModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'الاسم *' : 'Nom *'}</label>
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
            <button onClick={saveClient} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700">{ar ? 'حفظ' : 'Enregistrer'}</button>
          </div>
        </Modal>
      )}

      {/* ── Sale Modal ── */}
      {saleModal && (
        <Modal title={editSale ? (ar ? 'تعديل البيع' : 'Modifier la vente') : (ar ? 'بيع جديد' : 'Nouvelle vente')} onClose={() => setSaleModal(false)} wide>
          <div className="space-y-3">
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
                <input value={saleForm.clientName} onChange={e => setSaleForm(f => ({ ...f, clientName: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'التاريخ' : 'Date'}</label>
                <input type="date" value={saleForm.date} onChange={e => setSaleForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'طريقة الدفع' : 'Paiement'}</label>
                <select value={saleForm.paymentMethod} onChange={e => setSaleForm(f => ({ ...f, paymentMethod: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                  <option value="CASH">{ar ? 'نقداً' : 'Espèces'}</option>
                  <option value="TRANSFER">{ar ? 'تحويل' : 'Virement'}</option>
                  <option value="CHEQUE">{ar ? 'شيك' : 'Chèque'}</option>
                </select>
              </div>
            </div>
            {/* Items */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
              <div className="font-medium text-sm text-gray-700 dark:text-gray-300">{ar ? 'المنتجات / الخدمات' : 'Articles / Services'}</div>
              {saleForm.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2">
                  <div className="flex-1 text-gray-800 dark:text-gray-200">{item.product?.name || item.description}</div>
                  <div className="text-gray-500">{item.quantity} × {fmt(item.unitPrice)} MAD</div>
                  <div className="font-semibold text-emerald-600">{fmt(item.subtotal)} MAD</div>
                  <button onClick={() => setSaleForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} className="text-red-500 hover:text-red-700"><X size={14} /></button>
                </div>
              ))}
              <div className="grid grid-cols-4 gap-2">
                <select value={newSaleItem.productId} onChange={e => { const p = products.find(x => x.id === e.target.value); setNewSaleItem(f => ({ ...f, productId: e.target.value, description: p?.name || f.description })); }} className="col-span-2 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs">
                  <option value="">{ar ? '-- منتج أو وصف --' : '-- Produit ou description --'}</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input placeholder={ar ? 'وصف' : 'Description'} value={newSaleItem.description} onChange={e => setNewSaleItem(f => ({ ...f, description: e.target.value }))} className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" style={{ display: newSaleItem.productId ? 'none' : undefined }} />
                <input type="number" placeholder={ar ? 'الكمية' : 'Qté'} value={newSaleItem.quantity} onChange={e => setNewSaleItem(f => ({ ...f, quantity: e.target.value }))} className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                <div className="flex gap-1">
                  <input type="number" placeholder={ar ? 'السعر' : 'Prix'} value={newSaleItem.unitPrice} onChange={e => setNewSaleItem(f => ({ ...f, unitPrice: e.target.value }))} className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs" />
                  <button onClick={addSaleItem} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"><Plus size={14} /></button>
                </div>
              </div>
              {saleForm.items.length > 0 && (
                <div className="text-end text-sm font-bold text-emerald-600 pt-1 border-t border-gray-200 dark:border-gray-700">
                  Total: {fmt(saleForm.items.reduce((s, i) => s + i.subtotal, 0))} MAD
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{ar ? 'ملاحظات' : 'Notes'}</label>
              <textarea value={saleForm.notes} onChange={e => setSaleForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <button onClick={saveSale} className="w-full py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm hover:bg-emerald-700">{ar ? 'حفظ' : 'Enregistrer'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
