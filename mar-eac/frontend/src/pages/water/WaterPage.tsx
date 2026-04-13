import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Droplets, Trash2, CheckCircle, Pencil, Wrench,
  BarChart2, AlertTriangle, Phone, MapPin, Hash, RefreshCw,
  TrendingUp, Banknote, FileBarChart, Activity, FileDown,
  Users, UserPlus, Eye, EyeOff, Calendar, MessageCircle,
  Flame, Gauge, Send, Bell, ClipboardList, CircleDot,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { waterApi, waterReadersApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../../lib/utils';

type Tab = 'dashboard' | 'analytics' | 'installations' | 'readings' | 'invoices' | 'repairs' | 'reports' | 'readers';

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const repairStatusColor: Record<string, string> = {
  PENDING: 'badge-yellow',
  IN_PROGRESS: 'badge-blue',
  FIXED: 'badge-green',
};

export const WaterPage: React.FC = () => {
  const { lang } = useLanguage();
  const { isWaterReader } = useAuth();
  const t = (key: string) => key; // handled inline for water-specific labels
  const w = (key: string) => {
    const map: Record<string, Record<string, string>> = {
      title: { fr: 'Gestion de l\'eau', ar: 'إدارة الماء' },
      dashboard: { fr: 'Tableau de bord', ar: 'لوحة التحكم' },
      installations: { fr: 'Installations', ar: 'المنشآت' },
      readings: { fr: 'Relevés', ar: 'قراءات العدادات' },
      invoices: { fr: 'Factures', ar: 'الفواتير' },
      repairs: { fr: 'Réparations', ar: 'الأعطال' },
      reports: { fr: 'Rapports', ar: 'التقارير' },
      addInstallation: { fr: 'Nouveau compteur', ar: 'عداد جديد' },
      editInstallation: { fr: 'Modifier', ar: 'تعديل' },
      addIntervention: { fr: 'Nouvelle intervention', ar: 'تدخل جديد' },
      typeReparation: { fr: 'Réparation', ar: 'إصلاح' },
      typeMaintenance: { fr: 'Maintenance', ar: 'صيانة' },
      typeExtension: { fr: 'Extension branchement', ar: 'مد التوصيل' },
      typeFuite: { fr: 'Fuite d\'eau', ar: 'تسرب ماء' },
      typeBranchement: { fr: 'Prob. branchement', ar: 'مشكل التوصيل' },
      interventionType: { fr: 'Type d\'intervention', ar: 'نوع التدخل' },
      householdName: { fr: 'Nom du foyer', ar: 'اسم الأسرة' },
      phone: { fr: 'Téléphone', ar: 'الهاتف' },
      meterNumber: { fr: 'N° compteur', ar: 'رقم العداد' },
      address: { fr: 'Adresse', ar: 'العنوان' },
      pricePerUnit: { fr: 'Prix/m³ (MAD)', ar: 'السعر/م³ (درهم)' },
      installDate: { fr: 'Date installation', ar: 'تاريخ التركيب' },
      addReading: { fr: 'Ajouter un relevé', ar: 'إضافة قراءة' },
      currentReading: { fr: 'Index actuel (m³)', ar: 'المؤشر الحالي (م³)' },
      previousReading: { fr: 'Index précédent', ar: 'المؤشر السابق' },
      consumption: { fr: 'Consommation', ar: 'الاستهلاك' },
      month: { fr: 'Mois', ar: 'الشهر' },
      year: { fr: 'Année', ar: 'السنة' },
      amount: { fr: 'Montant', ar: 'المبلغ' },
      paid: { fr: 'Payée', ar: 'مدفوعة' },
      unpaid: { fr: 'Impayée', ar: 'غير مدفوعة' },
      markPaid: { fr: 'Encaisser', ar: 'تحصيل' },
      paymentMethod: { fr: 'Mode de paiement', ar: 'طريقة الدفع' },
      cash: { fr: 'Espèces', ar: 'نقدًا' },
      transfer: { fr: 'Virement', ar: 'تحويل بنكي' },
      cheque: { fr: 'Chèque', ar: 'شيك' },
      dueDate: { fr: 'Échéance', ar: 'الاستحقاق' },
      addRepair: { fr: 'Signaler une panne', ar: 'الإبلاغ عن عطل' },
      repairTitle: { fr: 'Titre', ar: 'العنوان' },
      repairDesc: { fr: 'Description', ar: 'الوصف' },
      repairLocation: { fr: 'Localisation', ar: 'الموقع' },
      repairCost: { fr: 'Coût (MAD)', ar: 'التكلفة (درهم)' },
      linkedInstallation: { fr: 'Installation concernée', ar: 'المنشأة المعنية' },
      noInstallations: { fr: 'Aucune installation', ar: 'لا توجد منشآت' },
      noReadings: { fr: 'Aucun relevé', ar: 'لا توجد قراءات' },
      noInvoices: { fr: 'Aucune facture', ar: 'لا توجد فواتير' },
      noRepairs: { fr: 'Aucune panne signalée', ar: 'لا توجد أعطال' },
      pending: { fr: 'En attente', ar: 'قيد الانتظار' },
      inProgress: { fr: 'En cours', ar: 'جاري الإصلاح' },
      fixed: { fr: 'Résolu', ar: 'تم الإصلاح' },
      allInstallations: { fr: 'Toutes les installations', ar: 'كل المنشآت' },
      notes: { fr: 'Notes', ar: 'ملاحظات' },
      active: { fr: 'Active', ar: 'نشط' },
      inactive: { fr: 'Inactive', ar: 'غير نشط' },
      save: { fr: 'Enregistrer', ar: 'حفظ' },
      cancel: { fr: 'Annuler', ar: 'إلغاء' },
      delete: { fr: 'Supprimer', ar: 'حذف' },
      confirmDelete: { fr: 'Confirmer la suppression ?', ar: 'تأكيد الحذف؟' },
      loading: { fr: 'Chargement...', ar: 'جاري...' },
      error: { fr: 'Une erreur est survenue', ar: 'حدث خطأ' },
      all: { fr: 'Tous', ar: 'الكل' },
      status: { fr: 'Statut', ar: 'الحالة' },
      actions: { fr: 'Actions', ar: 'إجراءات' },
      noData: { fr: 'Aucune donnée', ar: 'لا توجد بيانات' },
      totalBilled: { fr: 'Total facturé', ar: 'إجمالي الفواتير' },
      totalPaid: { fr: 'Encaissé', ar: 'محصّل' },
      outstanding: { fr: 'Impayés', ar: 'المستحقات' },
      openRepairs: { fr: 'Pannes ouvertes', ar: 'أعطال مفتوحة' },
      consumptionThisMonth: { fr: 'Consommation ce mois', ar: 'الاستهلاك هذا الشهر' },
      monthlyTrend: { fr: 'Évolution mensuelle (12 mois)', ar: 'التطور الشهري (12 شهرًا)' },
      topConsumers: { fr: 'Top consommateurs (année)', ar: 'أعلى المستهلكين (هذه السنة)' },
      consumptionReport: { fr: 'Rapport de consommation', ar: 'تقرير الاستهلاك' },
      financialReport: { fr: 'Rapport financier', ar: 'التقرير المالي' },
      technicalReport: { fr: 'Rapport technique', ar: 'التقرير التقني' },
      totalInstallations: { fr: 'Total installations', ar: 'إجمالي المنشآت' },
      totalRepairs: { fr: 'Total réparations', ar: 'إجمالي الأعطال' },
      repairCosts: { fr: 'Coût des réparations', ar: 'تكلفة الإصلاحات' },
      readers: { fr: 'Lecteurs', ar: 'القرّاء' },
      addReader: { fr: 'Ajouter un lecteur', ar: 'إضافة قارئ' },
      readerName: { fr: 'Nom', ar: 'الاسم' },
      readerEmail: { fr: 'Email', ar: 'البريد الإلكتروني' },
      readerPassword: { fr: 'Mot de passe', ar: 'كلمة المرور' },
      readerInstCount: { fr: 'Compteurs assignés', ar: 'العدادات المسندة' },
      assignReader: { fr: 'Lecteur assigné', ar: 'القارئ المسؤول' },
      noReaders: { fr: 'Aucun lecteur configuré', ar: 'لا يوجد قرّاء' },
      technicianName: { fr: 'Nom du technicien', ar: 'اسم التقني' },
      technicianAmount: { fr: 'Montant technicien (MAD)', ar: 'أتعاب التقني (درهم)' },
      partsNeeded: { fr: 'Pièces nécessaires', ar: 'القطع اللازمة' },
      workDetails: { fr: 'Détails des travaux', ar: 'تفاصيل الأشغال' },
      deadline: { fr: 'Délai prévu', ar: 'الموعد النهائي' },
      signaler: { fr: 'Signaler un problème', ar: 'الإبلاغ عن مشكل' },
      reclamations: { fr: 'Réclamations', ar: 'الشكاوى' },
      analytics: { fr: 'Mon tableau de bord', ar: 'لوحتي' },
      waReminder: { fr: 'Rappel WhatsApp', ar: 'تذكير واتساب' },
      waPaid: { fr: 'Confirmer paiement WA', ar: 'تأكيد الدفع واتساب' },
      reference: { fr: 'Référence / N° fiche', ar: 'المرجع / رقم البطاقة' },
      reportedBy: { fr: 'Signalé par', ar: 'أبلغ عنه' },
    };
    return (map[key]?.[lang]) ?? key;
  };

  const MONTHS = lang === 'ar' ? MONTHS_AR : MONTHS_FR;

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>(isWaterReader ? 'analytics' : 'dashboard');
  const [summary, setSummary] = useState<any>(null);
  const [installations, setInstallations] = useState<any[]>([]);
  const [readings, setReadings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [readers, setReaders] = useState<any[]>([]);
  const [readerAnalytics, setReaderAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [repairFilter, setRepairFilter] = useState('');
  const [readingInstFilter, setReadingInstFilter] = useState('');

  // Modals
  const [showInstModal, setShowInstModal] = useState(false);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [showInvoicePayModal, setShowInvoicePayModal] = useState<any>(null);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showReaderModal, setShowReaderModal] = useState(false);
  const [editingInst, setEditingInst] = useState<any>(null);
  const [editingRepair, setEditingRepair] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);
  const [readingInstId, setReadingInstId] = useState('');
  const [showReaderPass, setShowReaderPass] = useState(false);

  // Forms
  const [instForm, setInstForm] = useState({ householdName: '', phone: '', address: '', meterNumber: '', pricePerUnit: '5', installDate: '', isActive: true, readerId: '' });
  const [readingForm, setReadingForm] = useState({ currentReading: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: '' });
  const [payForm, setPayForm] = useState({ method: 'CASH', reference: '', notes: '' });
  const [payReceiptFile, setPayReceiptFile] = useState<File | null>(null);
  const [repairForm, setRepairForm] = useState({
    title: '', type: 'REPARATION', description: '', location: '', installationId: '',
    cost: '', reportedDate: '', status: 'PENDING', reference: '',
    technicianName: '', technicianAmount: '', partsNeeded: '', workDetails: '', deadline: '',
  });
  const [readerForm, setReaderForm] = useState({ name: '', email: '', password: '' });
  const [readerInstIds, setReaderInstIds] = useState<string[]>([]);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async () => {
    const res = await waterApi.getSummary();
    setSummary(res.data);
  }, []);

  const loadInstallations = useCallback(async () => {
    const res = await waterApi.getInstallations();
    setInstallations(res.data);
  }, []);

  const loadReadings = useCallback(async () => {
    const params: any = {};
    if (readingInstFilter) params.installationId = readingInstFilter;
    const res = await waterApi.getAllReadings(params);
    setReadings(res.data);
  }, [readingInstFilter]);

  const loadInvoices = useCallback(async () => {
    const params: any = {};
    if (invoiceFilter !== '') params.isPaid = invoiceFilter;
    const res = await waterApi.getInvoices(params);
    setInvoices(res.data);
  }, [invoiceFilter]);

  const loadRepairs = useCallback(async () => {
    const params: any = {};
    if (repairFilter) params.status = repairFilter;
    const res = await waterApi.getRepairs(params);
    setRepairs(res.data);
  }, [repairFilter]);

  const loadReports = useCallback(async () => {
    const res = await waterApi.getReports();
    setReports(res.data);
  }, []);

  const loadReaders = useCallback(async () => {
    const res = await waterReadersApi.getAll();
    setReaders(res.data);
  }, []);

  const loadReaderAnalytics = useCallback(async () => {
    const res = await waterApi.getReaderAnalytics();
    setReaderAnalytics(res.data);
  }, []);

  // Initial load
  useEffect(() => {
    const tasks: Promise<any>[] = [loadSummary(), loadInstallations()];
    if (isWaterReader) tasks.push(loadReaderAnalytics());
    else tasks.push(loadReaders(), loadRepairs());
    Promise.all(tasks).finally(() => setLoading(false));
  }, []);

  // Tab-triggered loads
  useEffect(() => {
    if (activeTab === 'readings') loadReadings();
  }, [activeTab, readingInstFilter]);
  useEffect(() => {
    if (activeTab === 'invoices') loadInvoices();
  }, [activeTab, invoiceFilter]);
  useEffect(() => {
    if (activeTab === 'repairs') loadRepairs();
  }, [activeTab, repairFilter]);
  useEffect(() => {
    if (activeTab === 'reports') loadReports();
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === 'readers') loadReaders();
  }, [activeTab]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openInstModal = (inst?: any) => {
    if (inst) {
      setEditingInst(inst);
      setInstForm({
        householdName: inst.householdName,
        phone: inst.phone || '',
        address: inst.address || '',
        meterNumber: inst.meterNumber,
        pricePerUnit: String(inst.pricePerUnit),
        installDate: inst.installDate ? inst.installDate.split('T')[0] : '',
        isActive: inst.isActive,
        readerId: inst.readerId || '',
      });
    } else {
      setEditingInst(null);
      setInstForm({ householdName: '', phone: '', address: '', meterNumber: '', pricePerUnit: '5', installDate: '', isActive: true, readerId: '' });
    }
    setShowInstModal(true);
  };

  const handleSaveInst = async () => {
    if (!instForm.householdName || !instForm.meterNumber) return;
    setSaving(true);
    try {
      if (editingInst) {
        await waterApi.updateInstallation(editingInst.id, instForm);
      } else {
        await waterApi.createInstallation(instForm);
      }
      setShowInstModal(false);
      loadInstallations();
      loadSummary();
    } catch (err: any) {
      alert(err.response?.data?.message || w('error'));
    } finally { setSaving(false); }
  };

  const handleAddReading = async () => {
    if (!readingForm.currentReading || !readingInstId) return;
    setSaving(true);
    try {
      await waterApi.addReading(readingInstId, readingForm);
      setShowReadingModal(false);
      setReadingForm({ currentReading: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: '' });
      setReadingInstId('');
      loadSummary();
      if (activeTab === 'readings') loadReadings();
      if (activeTab === 'invoices') loadInvoices();
    } catch (err: any) {
      alert(err.response?.data?.message || w('error'));
    } finally { setSaving(false); }
  };

  const handleMarkPaid = async () => {
    if (!showInvoicePayModal) return;
    setSaving(true);
    try {
      await waterApi.markPaid(showInvoicePayModal.id, payForm);
      if (payReceiptFile) {
        await waterApi.uploadPaymentReceipt(showInvoicePayModal.id, payReceiptFile);
      }
      setShowInvoicePayModal(null);
      setPayForm({ method: 'CASH', reference: '', notes: '' });
      setPayReceiptFile(null);
      loadInvoices();
      loadSummary();
    } catch (err: any) {
      alert(err.response?.data?.message || w('error'));
    } finally { setSaving(false); }
  };

  const openRepairModal = (repair?: any) => {
    if (repair) {
      setEditingRepair(repair);
      setRepairForm({
        title: repair.title,
        type: repair.type || 'REPARATION',
        description: repair.description || '',
        location: repair.location || '',
        installationId: repair.installationId || '',
        cost: repair.cost ? String(repair.cost) : '',
        reportedDate: repair.reportedDate ? repair.reportedDate.split('T')[0] : '',
        status: repair.status,
        reference: repair.reference || '',
        technicianName: repair.technicianName || '',
        technicianAmount: repair.technicianAmount ? String(repair.technicianAmount) : '',
        partsNeeded: repair.partsNeeded || '',
        workDetails: repair.workDetails || '',
        deadline: repair.deadline ? repair.deadline.split('T')[0] : '',
      });
    } else {
      setEditingRepair(null);
      setRepairForm({
        title: '', type: isWaterReader ? 'FUITE' : 'REPARATION', description: '', location: '', installationId: '',
        cost: '', reportedDate: '', status: 'PENDING', reference: '',
        technicianName: '', technicianAmount: '', partsNeeded: '', workDetails: '', deadline: '',
      });
    }
    setShowRepairModal(true);
  };

  const handleSaveReader = async () => {
    if (!readerForm.name || !readerForm.email || !readerForm.password) return;
    setSaving(true);
    try {
      await waterReadersApi.create({ ...readerForm, installationIds: readerInstIds });
      setShowReaderModal(false);
      setReaderForm({ name: '', email: '', password: '' });
      setReaderInstIds([]);
      loadReaders();
      loadInstallations(); // refresh to show updated reader assignments
    } catch (err: any) {
      alert(err.response?.data?.message || w('error'));
    } finally { setSaving(false); }
  };

  const handleSaveRepair = async () => {
    if (!repairForm.title) return;
    setSaving(true);
    try {
      if (editingRepair) {
        await waterApi.updateRepair(editingRepair.id, repairForm);
      } else {
        await waterApi.createRepair(repairForm);
      }
      setShowRepairModal(false);
      loadRepairs();
      loadSummary();
    } catch (err: any) {
      alert(err.response?.data?.message || w('error'));
    } finally { setSaving(false); }
  };

  // ── WhatsApp helpers ──────────────────────────────────────────────────────
  const buildWaLink = (phone: string, message: string) => {
    const clean = phone.replace(/[\s\-().]/g, '').replace(/^0/, '212');
    const num = clean.startsWith('+') ? clean.slice(1) : clean;
    return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
  };

  const openWaReminder = (inv: any, orgName?: string) => {
    const phone = inv.installation?.phone;
    if (!phone) { alert(lang === 'ar' ? 'لا يوجد رقم هاتف لهذه المنشأة' : 'Aucun numéro de téléphone pour cette installation'); return; }
    const monthLabel = MONTHS[inv.reading?.month - 1] + ' ' + inv.reading?.year;
    const msg = lang === 'ar'
      ? `السلام عليكم ${inv.installation?.householdName}،\nفاتورة الماء الخاصة بكم لشهر ${monthLabel} بمبلغ ${inv.amount.toFixed(2)} درهم.\nنرجو الأداء قبل ${new Date(inv.dueDate).toLocaleDateString('ar-MA')}.\n${orgName ? `جمعية ${orgName}` : ''}`
      : `Bonjour ${inv.installation?.householdName},\nVotre facture d'eau du mois de ${monthLabel} s'élève à ${inv.amount.toFixed(2)} MAD.\nMerci de régler avant le ${new Date(inv.dueDate).toLocaleDateString('fr-MA')}.\n${orgName ? orgName : ''}`;
    window.open(buildWaLink(phone, msg), '_blank');
  };

  const openWaPaid = (inv: any, orgName?: string) => {
    const phone = inv.installation?.phone;
    if (!phone) { alert(lang === 'ar' ? 'لا يوجد رقم هاتف' : 'Aucun numéro de téléphone'); return; }
    const monthLabel = MONTHS[inv.reading?.month - 1] + ' ' + inv.reading?.year;
    const msg = lang === 'ar'
      ? `السلام عليكم ${inv.installation?.householdName}،\nتم استلام أداء فاتورة الماء لشهر ${monthLabel} بمبلغ ${inv.amount.toFixed(2)} درهم.\nشكراً لكم.\n${orgName ? `جمعية ${orgName}` : ''}`
      : `Bonjour ${inv.installation?.householdName},\nNous confirmons la réception de votre paiement de ${inv.amount.toFixed(2)} MAD pour le mois de ${monthLabel}.\nMerci.\n${orgName ? orgName : ''}`;
    window.open(buildWaLink(phone, msg), '_blank');
  };

  const handleDownloadInvoicePDF = async (invoiceId: string, meterNumber: string) => {
    try {
      const res = await waterApi.exportInvoicePDF(invoiceId);
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-eau-${meterNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert(w('error')); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'installation') {
        await waterApi.deleteInstallation(deleteTarget.id);
        loadInstallations();
        loadSummary();
      } else if (deleteTarget.type === 'repair') {
        await waterApi.deleteRepair(deleteTarget.id);
        loadRepairs();
        loadSummary();
      } else if (deleteTarget.type === 'reader') {
        await waterReadersApi.delete(deleteTarget.id);
        loadReaders();
        loadInstallations();
      }
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  };

  // ── Tab definitions ───────────────────────────────────────────────────────
  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = isWaterReader ? [
    { key: 'analytics', label: w('analytics'), icon: <BarChart2 size={14} /> },
    { key: 'installations', label: w('installations'), icon: <Droplets size={14} /> },
    { key: 'readings', label: w('readings'), icon: <Activity size={14} /> },
    { key: 'invoices', label: w('invoices'), icon: <Banknote size={14} /> },
    { key: 'repairs', label: w('reclamations'), icon: <ClipboardList size={14} /> },
  ] : [
    { key: 'dashboard', label: w('dashboard'), icon: <BarChart2 size={14} /> },
    { key: 'installations', label: w('installations'), icon: <Droplets size={14} /> },
    { key: 'readings', label: w('readings'), icon: <Activity size={14} /> },
    { key: 'invoices', label: w('invoices'), icon: <Banknote size={14} /> },
    { key: 'repairs', label: w('repairs'), icon: <Wrench size={14} /> },
    { key: 'reports', label: w('reports'), icon: <FileBarChart size={14} /> },
    { key: 'readers', label: w('readers'), icon: <Users size={14} /> },
  ];

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="page-title flex items-center gap-2">
          <Droplets size={22} className="text-blue-500" />
          {w('title')}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setReadingInstId(''); setReadingForm({ currentReading: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: '' }); setShowReadingModal(true); }} className="btn-secondary text-sm">
            <Plus size={15} />{w('addReading')}
          </button>
          <button onClick={() => openRepairModal()} className="btn-warning text-sm">
            <Plus size={15} />{w('addIntervention')}
          </button>
          {!isWaterReader && (
            <button onClick={() => openInstModal()} className="btn-primary text-sm">
              <Plus size={15} />{w('addInstallation')}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title={w('installations')} value={`${summary?.activeInstallations ?? 0} / ${summary?.totalInstallations ?? 0}`} icon={<Droplets size={18} />} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard title={w('consumptionThisMonth')} value={`${(summary?.totalConsumptionThisMonth ?? 0).toFixed(1)} m³`} icon={<TrendingUp size={18} />} iconBg="bg-teal-100 dark:bg-teal-900/30" iconColor="text-teal-600 dark:text-teal-400" />
        <StatCard title={w('outstanding')} value={formatCurrency(summary?.outstanding ?? 0, lang)} icon={<Banknote size={18} />} iconBg="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600 dark:text-red-400" />
        <StatCard title={w('openRepairs')} value={summary?.openRepairs ?? 0} icon={<Wrench size={18} />} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${activeTab === tab.key ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── READER ANALYTICS DASHBOARD ────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title={w('installations')} value={`${summary?.activeInstallations ?? 0} / ${summary?.totalInstallations ?? 0}`} icon={<Droplets size={18} />} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
            <StatCard title={lang === 'ar' ? 'فواتير غير مدفوعة' : 'Factures impayées'} value={summary?.unpaidCount ?? 0} icon={<AlertTriangle size={18} />} iconBg="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600 dark:text-red-400" />
            <StatCard title={w('openRepairs')} value={summary?.openRepairs ?? 0} icon={<Wrench size={18} />} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" />
            <StatCard title={w('consumptionThisMonth')} value={`${(summary?.totalConsumptionThisMonth ?? 0).toFixed(1)} m³`} icon={<TrendingUp size={18} />} iconBg="bg-teal-100 dark:bg-teal-900/30" iconColor="text-teal-600 dark:text-teal-400" />
          </div>

          {/* Unpaid invoices — reader alert list */}
          {readerAnalytics && readerAnalytics.unpaidInvoices.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                {lang === 'ar' ? 'فواتير غير مدفوعة — للإبلاغ للمشتركين' : 'Factures impayées — à relancer'}
                <span className="ms-auto text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {readerAnalytics.unpaidInvoices.length}
                </span>
              </h3>
              <div className="space-y-2">
                {readerAnalytics.unpaidInvoices.map((inv: any) => {
                  const overdue = new Date(inv.dueDate) < new Date();
                  return (
                    <div key={inv.id} className={`flex items-center gap-3 p-3 rounded-xl border ${overdue ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800' : 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800'}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${overdue ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">{inv.installation?.householdName}</p>
                        <p className="text-xs text-gray-400 font-mono">{inv.installation?.meterNumber} · {MONTHS[(inv.reading?.month ?? 1) - 1]} {inv.reading?.year}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-sm text-red-600">{inv.amount.toFixed(2)} MAD</p>
                        <p className="text-xs text-gray-400">{new Date(inv.dueDate).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA')}</p>
                      </div>
                      {inv.installation?.phone && (
                        <a href={`tel:${inv.installation.phone}`}
                          className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200 flex-shrink-0" title={inv.installation.phone}>
                          <Phone size={14} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Open repairs */}
          {readerAnalytics && readerAnalytics.openRepairs.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Wrench size={16} className="text-amber-500" />
                {lang === 'ar' ? 'أعطال وشكاوى مفتوحة' : 'Pannes & réclamations ouvertes'}
                <span className="ms-auto text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {readerAnalytics.openRepairs.length}
                </span>
              </h3>
              <div className="space-y-2">
                {readerAnalytics.openRepairs.map((rep: any) => (
                  <div key={rep.id} className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rep.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{rep.title}</p>
                      <p className="text-xs text-gray-400">{rep.installation?.householdName} · {rep.installation?.meterNumber}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rep.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {rep.status === 'IN_PROGRESS' ? w('inProgress') : w('pending')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All good state */}
          {readerAnalytics && readerAnalytics.unpaidInvoices.length === 0 && readerAnalytics.openRepairs.length === 0 && (
            <div className="card p-8 text-center">
              <CheckCircle size={36} className="text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900 dark:text-white">
                {lang === 'ar' ? 'كل شيء على ما يرام!' : 'Tout est en ordre !'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {lang === 'ar' ? 'لا توجد فواتير متأخرة ولا أعطال مفتوحة' : 'Aucune facture impayée ni panne ouverte'}
              </p>
            </div>
          )}

          {/* My installations quick view */}
          {readerAnalytics && readerAnalytics.installations.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Gauge size={16} className="text-blue-500" />
                {lang === 'ar' ? 'عداداتي' : 'Mes compteurs'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {readerAnalytics.installations.map((inst: any) => (
                  <div key={inst.id} className={`flex items-center gap-2 p-2.5 rounded-xl border ${inst.isActive ? 'border-blue-200 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 bg-gray-50 dark:bg-gray-800'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inst.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{inst.householdName}</p>
                      <p className="text-xs text-gray-400 font-mono">{inst.meterNumber}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Extended stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{w('totalBilled')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary?.totalBilled ?? 0, lang)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{w('totalPaid')}</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(summary?.totalPaid ?? 0, lang)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">{lang === 'ar' ? 'فواتير غير مدفوعة' : 'Factures impayées'}</p>
              <p className="text-xl font-bold text-red-500 mt-1">{summary?.unpaidCount ?? 0}</p>
            </div>
          </div>

          {/* Open réclamations (FUITE/BRANCHEMENT) alert */}
          {repairs.filter((r) => (r.type === 'FUITE' || r.type === 'BRANCHEMENT') && r.status !== 'FIXED').length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 flex items-center gap-3">
              <Flame size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-300">
                {lang === 'ar'
                  ? `${repairs.filter((r) => (r.type === 'FUITE' || r.type === 'BRANCHEMENT') && r.status !== 'FIXED').length} بلاغ تسرب / مشكل توصيل بحاجة للتدخل`
                  : `${repairs.filter((r) => (r.type === 'FUITE' || r.type === 'BRANCHEMENT') && r.status !== 'FIXED').length} fuite(s)/problème(s) de branchement signalé(s) en attente`}
              </p>
              <button onClick={() => { setRepairFilter(''); setActiveTab('repairs'); }} className="ms-auto text-xs btn-secondary py-1 whitespace-nowrap">
                {lang === 'ar' ? 'عرض البلاغات' : 'Voir les réclamations'}
              </button>
            </div>
          )}

          {/* Recent unpaid invoices alert */}
          {(summary?.unpaidCount ?? 0) > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {lang === 'ar'
                  ? `يوجد ${summary?.unpaidCount} فاتورة غير مدفوعة بمبلغ إجمالي ${formatCurrency(summary?.outstanding ?? 0, lang)}`
                  : `${summary?.unpaidCount} facture(s) impayée(s) pour un total de ${formatCurrency(summary?.outstanding ?? 0, lang)}`}
              </p>
              <button onClick={() => setActiveTab('invoices')} className="ms-auto text-xs btn-secondary py-1 whitespace-nowrap">
                {lang === 'ar' ? 'عرض الفواتير' : 'Voir les factures'}
              </button>
            </div>
          )}

          {/* Recent installations */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Droplets size={16} className="text-blue-500" />
              {lang === 'ar' ? 'آخر المنشآت' : 'Dernières installations'}
            </h3>
            {installations.slice(0, 5).map((inst) => {
              const unpaidAmount = inst.invoices?.reduce((s: number, i: any) => s + i.amount, 0) ?? 0;
              return (
                <div key={inst.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${inst.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{inst.householdName}</p>
                      <p className="text-xs text-gray-400 font-mono">{inst.meterNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {unpaidAmount > 0 ? (
                      <p className="text-sm font-semibold text-red-500">{formatCurrency(unpaidAmount, lang)}</p>
                    ) : (
                      <span className="badge-green text-xs">{lang === 'ar' ? 'محدّث' : 'À jour'}</span>
                    )}
                    <p className="text-xs text-gray-400">{inst._count?.readings ?? 0} {lang === 'ar' ? 'قراءات' : 'relevés'}</p>
                  </div>
                </div>
              );
            })}
            {installations.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">{w('noInstallations')}</p>
            )}
          </div>
        </div>
      )}

      {/* ── INSTALLATIONS ─────────────────────────────────────────────────── */}
      {activeTab === 'installations' && (
        <div className="space-y-4">
          {installations.length === 0 ? (
            <EmptyState icon={<Droplets size={28} />} title={w('noInstallations')}
              action={<button onClick={() => openInstModal()} className="btn-primary"><Plus size={16} />{w('addInstallation')}</button>} />
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th>{w('householdName')}</th>
                    <th>{w('meterNumber')}</th>
                    <th>{w('phone')}</th>
                    <th>{w('address')}</th>
                    <th>{w('pricePerUnit')}</th>
                    <th>{lang === 'ar' ? 'مستحقات' : 'Impayés'}</th>
                    {!isWaterReader && <th>{w('readers')}</th>}
                    <th>{w('status')}</th>
                    <th>{w('actions')}</th>
                  </tr></thead>
                  <tbody>
                    {installations.map((inst) => {
                      const unpaid = inst.invoices?.reduce((s: number, i: any) => s + i.amount, 0) ?? 0;
                      return (
                        <tr key={inst.id}>
                          <td>
                            <div className="font-medium text-gray-900 dark:text-white">{inst.householdName}</div>
                            <div className="text-xs text-gray-400">{inst._count?.readings} {lang === 'ar' ? 'قراءات' : 'relevés'}</div>
                          </td>
                          <td><span className="font-mono text-sm">{inst.meterNumber}</span></td>
                          <td>
                            {inst.phone ? (
                              <span className="flex items-center gap-1 text-sm"><Phone size={12} />{inst.phone}</span>
                            ) : '-'}
                          </td>
                          <td>
                            {inst.address ? (
                              <span className="flex items-center gap-1 text-sm"><MapPin size={12} />{inst.address}</span>
                            ) : '-'}
                          </td>
                          <td>{inst.pricePerUnit} MAD/m³</td>
                          <td>
                            {unpaid > 0 ? (
                              <span className="text-red-600 font-semibold text-sm">{formatCurrency(unpaid, lang)}</span>
                            ) : (
                              <span className="text-emerald-600 text-xs">{lang === 'ar' ? 'محدّث' : 'À jour'}</span>
                            )}
                          </td>
                          {!isWaterReader && (
                            <td>
                              {(() => {
                                const reader = readers.find((r) => r.id === inst.readerId);
                                return reader ? (
                                  <span className="text-xs flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                    <Users size={11} />{reader.name}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                );
                              })()}
                            </td>
                          )}
                          <td>
                            <span className={inst.isActive ? 'badge-green' : 'badge-red'}>
                              {inst.isActive ? w('active') : w('inactive')}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setReadingInstId(inst.id); setReadingForm({ currentReading: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: '' }); setShowReadingModal(true); }}
                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title={w('addReading')}>
                                <Hash size={14} />
                              </button>
                              {!isWaterReader && (
                                <>
                                  <button onClick={() => openInstModal(inst)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                    <Pencil size={14} />
                                  </button>
                                  <button onClick={() => setDeleteTarget({ type: 'installation', id: inst.id })} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── READINGS ──────────────────────────────────────────────────────── */}
      {activeTab === 'readings' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select className="input w-auto text-sm"
              value={readingInstFilter}
              onChange={(e) => setReadingInstFilter(e.target.value)}>
              <option value="">{w('allInstallations')}</option>
              {installations.map((inst) => (
                <option key={inst.id} value={inst.id}>{inst.householdName} ({inst.meterNumber})</option>
              ))}
            </select>
            <button onClick={loadReadings} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-blue-600">
              <RefreshCw size={14} />
            </button>
          </div>

          {readings.length === 0 ? (
            <EmptyState icon={<Activity size={28} />} title={w('noReadings')}
              action={<button onClick={() => setShowReadingModal(true)} className="btn-primary"><Plus size={16} />{w('addReading')}</button>} />
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th>{w('householdName')}</th>
                    <th>{w('month')}/{w('year')}</th>
                    <th>{w('previousReading')}</th>
                    <th>{w('currentReading')}</th>
                    <th>{w('consumption')}</th>
                    <th>{lang === 'ar' ? 'الفاتورة' : 'Facture'}</th>
                    <th>{w('status')}</th>
                  </tr></thead>
                  <tbody>
                    {readings.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <div className="font-medium text-gray-900 dark:text-white">{r.installation?.householdName}</div>
                          <div className="text-xs text-gray-400 font-mono">{r.installation?.meterNumber}</div>
                        </td>
                        <td className="font-medium">{MONTHS[r.month - 1]} {r.year}</td>
                        <td className="font-mono">{r.previousReading.toFixed(2)}</td>
                        <td className="font-mono">{r.currentReading.toFixed(2)}</td>
                        <td>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{r.consumption.toFixed(2)} m³</span>
                        </td>
                        <td>{r.invoice ? formatCurrency(r.invoice.amount, lang) : '-'}</td>
                        <td>
                          {r.invoice ? (
                            <span className={r.invoice.isPaid ? 'badge-green' : 'badge-yellow'}>
                              {r.invoice.isPaid ? w('paid') : w('unpaid')}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INVOICES ──────────────────────────────────────────────────────── */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-2">
              {[['', w('all')], ['false', w('unpaid')], ['true', w('paid')]].map(([v, label]) => (
                <button key={v} onClick={() => setInvoiceFilter(v)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${invoiceFilter === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>
            {!isWaterReader && invoices.filter((i) => !i.isPaid && i.installation?.phone).length > 0 && (
              <button
                onClick={() => {
                  const unpaid = invoices.filter((i) => !i.isPaid && i.installation?.phone);
                  if (unpaid.length > 0) openWaReminder(unpaid[0]);
                }}
                className="ms-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors">
                <Bell size={13} />
                {lang === 'ar' ? `تذكير (${invoices.filter((i) => !i.isPaid && i.installation?.phone).length})` : `Rappels WA (${invoices.filter((i) => !i.isPaid && i.installation?.phone).length})`}
              </button>
            )}
          </div>

          {invoices.length === 0 ? (
            <div className="card p-10 text-center text-gray-400 text-sm">{w('noInvoices')}</div>
          ) : (
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th>{w('householdName')}</th>
                    <th>{w('month')}</th>
                    <th>{w('consumption')}</th>
                    <th>{w('amount')}</th>
                    <th>{w('dueDate')}</th>
                    <th>{w('status')}</th>
                    <th>{lang === 'ar' ? 'طريقة الدفع' : 'Paiement'}</th>
                    <th>{w('actions')}</th>
                  </tr></thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const isOverdue = !inv.isPaid && new Date(inv.dueDate) < new Date();
                      return (
                        <tr key={inv.id}>
                          <td>
                            <div className="font-medium text-gray-900 dark:text-white">{inv.installation?.householdName}</div>
                            {inv.installation?.phone && (
                              <div className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{inv.installation.phone}</div>
                            )}
                          </td>
                          <td>{MONTHS[inv.reading?.month - 1]} {inv.reading?.year}</td>
                          <td>{inv.reading?.consumption?.toFixed(2)} m³</td>
                          <td className="font-semibold">{formatCurrency(inv.amount, lang)}</td>
                          <td className={isOverdue ? 'text-red-500 font-medium' : ''}>{formatDate(inv.dueDate, lang)}</td>
                          <td>
                            <span className={inv.isPaid ? 'badge-green' : isOverdue ? 'badge-red' : 'badge-yellow'}>
                              {inv.isPaid ? w('paid') : isOverdue ? (lang === 'ar' ? 'متأخرة' : 'En retard') : w('unpaid')}
                            </span>
                          </td>
                          <td>
                            {inv.payment ? (
                              <div className="text-xs text-gray-500">
                                <span>{inv.payment.method === 'CASH' ? (lang === 'ar' ? 'نقدًا' : 'Espèces') : inv.payment.method === 'TRANSFER' ? (lang === 'ar' ? 'تحويل' : 'Virement') : 'Chèque'}</span>
                                {inv.payment.reference && <div className="font-mono text-gray-400">{inv.payment.reference}</div>}
                                {inv.payment.receiptUrl && (
                                  <a href={inv.payment.receiptUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">
                                    {lang === 'ar' ? 'الإيصال' : 'Reçu'}
                                  </a>
                                )}
                              </div>
                            ) : '-'}
                          </td>
                          <td>
                            <div className="flex items-center gap-1 flex-wrap">
                              {!inv.isPaid && (
                                <button onClick={() => { setShowInvoicePayModal(inv); setPayForm({ method: 'CASH', reference: '', notes: '' }); setPayReceiptFile(null); }}
                                  className="flex items-center gap-1 text-xs btn-success py-1 px-2">
                                  <CheckCircle size={12} />{w('markPaid')}
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadInvoicePDF(inv.id, inv.installation?.meterNumber)}
                                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title={lang === 'ar' ? 'تحميل PDF' : 'Télécharger PDF'}>
                                <FileDown size={14} />
                              </button>
                              {!inv.isPaid && inv.installation?.phone && (
                                <button onClick={() => openWaReminder(inv)}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  title={w('waReminder')}>
                                  <MessageCircle size={14} />
                                </button>
                              )}
                              {inv.isPaid && inv.installation?.phone && (
                                <button onClick={() => openWaPaid(inv)}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  title={w('waPaid')}>
                                  <Send size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REPAIRS ───────────────────────────────────────────────────────── */}
      {activeTab === 'repairs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {[['', w('all')], ['PENDING', w('pending')], ['IN_PROGRESS', w('inProgress')], ['FIXED', w('fixed')]].map(([v, label]) => (
                <button key={v} onClick={() => setRepairFilter(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${repairFilter === v ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => openRepairModal()} className={`text-sm ${isWaterReader ? 'btn-warning' : 'btn-primary'}`}>
              <Plus size={15} />{isWaterReader ? w('signaler') : w('addRepair')}
            </button>
          </div>

          {repairs.length === 0 ? (
            <EmptyState icon={<Wrench size={28} />} title={w('noRepairs')}
              action={<button onClick={() => openRepairModal()} className="btn-primary"><Plus size={16} />{w('addRepair')}</button>} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {repairs.map((rep) => (
                <div key={rep.id} className={`card p-4 border-l-4 ${rep.status === 'FIXED' ? 'border-l-emerald-500' : rep.status === 'IN_PROGRESS' ? 'border-l-blue-500' : 'border-l-amber-500'}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{rep.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          rep.type === 'FUITE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                          rep.type === 'BRANCHEMENT' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                          rep.type === 'MAINTENANCE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                          rep.type === 'EXTENSION' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}>
                          {rep.type === 'MAINTENANCE' ? w('typeMaintenance') : rep.type === 'EXTENSION' ? w('typeExtension') : rep.type === 'FUITE' ? w('typeFuite') : rep.type === 'BRANCHEMENT' ? w('typeBranchement') : w('typeReparation')}
                        </span>
                      </div>
                      {rep.installation && (
                        <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                          <Droplets size={10} />{rep.installation.householdName} ({rep.installation.meterNumber})
                        </p>
                      )}
                    </div>
                    <span className={repairStatusColor[rep.status] || 'badge-gray'}>
                      {rep.status === 'PENDING' ? w('pending') : rep.status === 'IN_PROGRESS' ? w('inProgress') : w('fixed')}
                    </span>
                  </div>
                  {rep.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{rep.description}</p>}
                  {/* Technician info */}
                  {(rep.technicianName || rep.partsNeeded || rep.workDetails) && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5 mb-2 space-y-1">
                      {rep.technicianName && (
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-700 dark:text-gray-200">{w('technicianName')}: </span>{rep.technicianName}
                          {rep.technicianAmount && <span className="ms-2 text-amber-600 font-semibold">{formatCurrency(rep.technicianAmount, lang)}</span>}
                        </p>
                      )}
                      {rep.partsNeeded && (
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-700 dark:text-gray-200">{w('partsNeeded')}: </span>{rep.partsNeeded}
                        </p>
                      )}
                      {rep.workDetails && (
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-700 dark:text-gray-200">{w('workDetails')}: </span>{rep.workDetails}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mt-2">
                    {rep.reference && <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">#{rep.reference}</span>}
                    {rep.location && <span className="flex items-center gap-1"><MapPin size={10} />{rep.location}</span>}
                    {rep.cost && <span className="font-semibold text-amber-600">{formatCurrency(rep.cost, lang)}</span>}
                    <span>{formatDate(rep.reportedDate, lang)}</span>
                    {rep.deadline && <span className="flex items-center gap-1 text-orange-500"><Calendar size={10} />{lang === 'ar' ? 'الموعد: ' : 'Délai: '}{formatDate(rep.deadline, lang)}</span>}
                    {rep.resolvedDate && <span className="text-emerald-600">{lang === 'ar' ? 'تم: ' : 'Résolu: '}{formatDate(rep.resolvedDate, lang)}</span>}
                  </div>
                  <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                    {rep.status !== 'FIXED' && (
                      <button onClick={() => waterApi.updateRepair(rep.id, { status: rep.status === 'PENDING' ? 'IN_PROGRESS' : 'FIXED' }).then(loadRepairs).then(loadSummary)}
                        className="text-xs btn-secondary py-1 px-2">
                        {rep.status === 'PENDING' ? (lang === 'ar' ? 'بدء الإصلاح' : 'Démarrer') : (lang === 'ar' ? 'تعيين كمُصلح' : 'Marquer résolu')}
                      </button>
                    )}
                    <button onClick={() => openRepairModal(rep)} className="text-xs btn-secondary py-1 px-2"><Pencil size={12} /></button>
                    <button onClick={() => setDeleteTarget({ type: 'repair', id: rep.id })} className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg py-1 px-2"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REPORTS ───────────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        reports ? (
          <div className="space-y-6">
            {/* Monthly consumption chart */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" />
                {w('monthlyTrend')}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={reports.monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any, name: string) => [
                    name === 'totalConsumption' ? `${Number(v).toFixed(1)} m³` : `${Number(v).toFixed(2)} MAD`,
                    name === 'totalConsumption' ? (lang === 'ar' ? 'الاستهلاك' : 'Conso.') : name === 'totalBilled' ? (lang === 'ar' ? 'مفوتر' : 'Facturé') : (lang === 'ar' ? 'محصّل' : 'Encaissé'),
                  ]} />
                  <Area type="monotone" dataKey="totalConsumption" stroke="#3b82f6" fill="#bfdbfe" strokeWidth={2} />
                  <Area type="monotone" dataKey="totalPaid" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue chart */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Banknote size={16} className="text-emerald-500" />
                {w('financialReport')}
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={reports.monthly.slice(-6)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(2)} MAD`]} />
                  <Legend />
                  <Bar dataKey="totalBilled" name={lang === 'ar' ? 'مفوتر' : 'Facturé'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalPaid" name={lang === 'ar' ? 'محصّل' : 'Encaissé'} fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top consumers table */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity size={16} className="text-teal-500" />
                {w('topConsumers')}
              </h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr>
                    <th>#</th>
                    <th>{w('householdName')}</th>
                    <th>{w('meterNumber')}</th>
                    <th>{lang === 'ar' ? 'الاستهلاك (سنة)' : 'Conso. (année)'}</th>
                    <th>{w('totalBilled')}</th>
                    <th>{lang === 'ar' ? 'نسبة التحصيل' : 'Taux recouvrement'}</th>
                  </tr></thead>
                  <tbody>
                    {reports.installations.slice(0, 10).map((inst: any, i: number) => {
                      const rate = inst.totalBilled > 0 ? Math.round((inst.totalPaid / inst.totalBilled) * 100) : 0;
                      return (
                        <tr key={inst.id}>
                          <td className="text-gray-400 font-mono">{i + 1}</td>
                          <td className="font-medium text-gray-900 dark:text-white">{inst.householdName}</td>
                          <td className="font-mono text-sm">{inst.meterNumber}</td>
                          <td className="font-semibold text-blue-600">{inst.totalConsumption.toFixed(1)} m³</td>
                          <td>{formatCurrency(inst.totalBilled, lang)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs font-medium">{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technical report */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wrench size={16} className="text-amber-500" />
                {w('technicalReport')}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{reports.installations.length}</p>
                  <p className="text-xs text-gray-500 mt-1">{w('totalInstallations')}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{reports.repairs.byStatus.PENDING ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{w('pending')}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{reports.repairs.byStatus.IN_PROGRESS ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{w('inProgress')}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{reports.repairs.byStatus.FIXED ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">{w('fixed')}</p>
                </div>
              </div>
              {reports.repairs.totalRepairCost > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                  {lang === 'ar' ? 'إجمالي تكلفة الإصلاحات: ' : 'Coût total des réparations : '}
                  <span className="font-bold text-amber-600">{formatCurrency(reports.repairs.totalRepairCost, lang)}</span>
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        )
      )}

      {/* ── READERS ───────────────────────────────────────────────────────── */}
      {activeTab === 'readers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lang === 'ar' ? 'إدارة حسابات قرّاء العدادات' : 'Gestion des comptes lecteurs de compteurs'}
            </p>
            <button onClick={() => { setReaderForm({ name: '', email: '', password: '' }); setReaderInstIds([]); setShowReaderModal(true); }} className="btn-primary text-sm">
              <UserPlus size={15} />{w('addReader')}
            </button>
          </div>

          {readers.length === 0 ? (
            <EmptyState icon={<Users size={28} />} title={w('noReaders')}
              action={<button onClick={() => setShowReaderModal(true)} className="btn-primary"><UserPlus size={16} />{w('addReader')}</button>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {readers.map((reader) => (
                <div key={reader.id} className="card p-4 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-700 dark:text-purple-300 font-bold text-sm">{reader.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{reader.name}</p>
                        <p className="text-xs text-gray-400">{reader.email}</p>
                      </div>
                    </div>
                    <button onClick={() => setDeleteTarget({ type: 'reader', id: reader.id })}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${reader.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700'}`}>
                      {reader.isActive ? w('active') : w('inactive')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Droplets size={11} className="text-blue-400" />{reader.installationCount} {w('readerInstCount')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ───────────────────────────────────────────────────────── */}

      {/* Installation Modal */}
      <Modal isOpen={showInstModal} onClose={() => setShowInstModal(false)}
        title={editingInst ? w('editInstallation') : w('addInstallation')}
        footer={<><button onClick={() => setShowInstModal(false)} className="btn-secondary">{w('cancel')}</button><button onClick={handleSaveInst} disabled={saving} className="btn-primary">{saving ? w('loading') : w('save')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{w('householdName')} *</label>
            <input className="input" value={instForm.householdName} onChange={(e) => setInstForm({ ...instForm, householdName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{w('meterNumber')} *</label>
              <input className="input font-mono" value={instForm.meterNumber} disabled={!!editingInst}
                onChange={(e) => setInstForm({ ...instForm, meterNumber: e.target.value })} />
            </div>
            <div>
              <label className="label">{w('phone')}</label>
              <input className="input" type="tel" value={instForm.phone} onChange={(e) => setInstForm({ ...instForm, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{w('address')}</label>
            <input className="input" value={instForm.address} onChange={(e) => setInstForm({ ...instForm, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{w('pricePerUnit')}</label>
              <input className="input" type="number" step="0.01" value={instForm.pricePerUnit}
                onChange={(e) => setInstForm({ ...instForm, pricePerUnit: e.target.value })} />
            </div>
            <div>
              <label className="label">{w('installDate')}</label>
              <input className="input" type="date" value={instForm.installDate}
                onChange={(e) => setInstForm({ ...instForm, installDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{w('assignReader')}</label>
            <select className="input" value={instForm.readerId}
              onChange={(e) => setInstForm({ ...instForm, readerId: e.target.value })}>
              <option value="">{lang === 'ar' ? '— بدون قارئ —' : '— Sans lecteur —'}</option>
              {readers.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
              ))}
            </select>
          </div>
          {editingInst && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={instForm.isActive}
                onChange={(e) => setInstForm({ ...instForm, isActive: e.target.checked })} />
              <span className="text-sm text-gray-700 dark:text-gray-300">{w('active')}</span>
            </label>
          )}
        </div>
      </Modal>

      {/* Add Reading Modal */}
      <Modal isOpen={showReadingModal} onClose={() => setShowReadingModal(false)} title={w('addReading')}
        footer={<><button onClick={() => setShowReadingModal(false)} className="btn-secondary">{w('cancel')}</button><button onClick={handleAddReading} disabled={saving} className="btn-primary">{saving ? w('loading') : w('save')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{lang === 'ar' ? 'المنشأة' : 'Installation'} *</label>
            <select className="input" value={readingInstId} onChange={(e) => setReadingInstId(e.target.value)}>
              <option value="">{lang === 'ar' ? 'اختر المنشأة...' : 'Choisir une installation...'}</option>
              {installations.filter((i) => i.isActive).map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.householdName} — {inst.meterNumber}
                  {inst.readings?.[0] ? ` (${lang === 'ar' ? 'آخر مؤشر' : 'dernier index'}: ${inst.readings[0].currentReading})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{w('currentReading')} *</label>
            <input className="input font-mono" type="number" step="0.01" value={readingForm.currentReading}
              onChange={(e) => setReadingForm({ ...readingForm, currentReading: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{w('month')} *</label>
              <select className="input" value={readingForm.month}
                onChange={(e) => setReadingForm({ ...readingForm, month: parseInt(e.target.value) })}>
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{w('year')} *</label>
              <input className="input" type="number" value={readingForm.year}
                onChange={(e) => setReadingForm({ ...readingForm, year: parseInt(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="label">{w('notes')}</label>
            <textarea className="input" rows={2} value={readingForm.notes}
              onChange={(e) => setReadingForm({ ...readingForm, notes: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Pay Invoice Modal */}
      <Modal isOpen={!!showInvoicePayModal} onClose={() => setShowInvoicePayModal(null)}
        title={lang === 'ar' ? 'تحصيل الفاتورة' : 'Encaissement de la facture'}
        footer={<><button onClick={() => setShowInvoicePayModal(null)} className="btn-secondary">{w('cancel')}</button><button onClick={handleMarkPaid} disabled={saving} className="btn-success">{saving ? w('loading') : w('markPaid')}</button></>}
      >
        {showInvoicePayModal && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <span className="font-semibold">{showInvoicePayModal.installation?.householdName}</span>
                {' · '}{MONTHS[showInvoicePayModal.reading?.month - 1]} {showInvoicePayModal.reading?.year}
                {' · '}<span className="font-bold">{formatCurrency(showInvoicePayModal.amount, lang)}</span>
              </p>
            </div>
            <div>
              <label className="label">{w('paymentMethod')}</label>
              <div className="flex gap-3">
                {[['CASH', w('cash')], ['TRANSFER', w('transfer')], ['CHEQUE', w('cheque')]].map(([val, label]) => (
                  <label key={val} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${payForm.method === val ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700' : 'border-gray-200 dark:border-gray-700'}`}>
                    <input type="radio" name="method" value={val} checked={payForm.method === val}
                      onChange={() => setPayForm({ ...payForm, method: val })} className="hidden" />
                    <span className="text-sm font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            {(payForm.method === 'CHEQUE' || payForm.method === 'TRANSFER') && (
              <div>
                <label className="label">
                  {payForm.method === 'CHEQUE'
                    ? (lang === 'ar' ? 'رقم الشيك' : 'N° du chèque')
                    : (lang === 'ar' ? 'مرجع التحويل' : 'Référence virement')}
                  {' *'}
                </label>
                <input className="input font-mono" value={payForm.reference}
                  onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  placeholder={payForm.method === 'CHEQUE' ? 'Ex: 0012345' : 'Ex: VIR-2025-001'} />
              </div>
            )}
            <div>
              <label className="label">{lang === 'ar' ? 'إيصال / وصل الأداء' : 'Reçu / Justificatif'}</label>
              <label className={`flex items-center gap-3 cursor-pointer border-2 border-dashed rounded-xl p-3 transition-colors ${payReceiptFile ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}>
                <input type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={(e) => setPayReceiptFile(e.target.files?.[0] || null)} />
                {payReceiptFile ? (
                  <span className="text-sm text-blue-600 dark:text-blue-400 truncate">{payReceiptFile.name}</span>
                ) : (
                  <span className="text-sm text-gray-400">{lang === 'ar' ? 'انقر لرفع الإيصال (صورة أو PDF)' : 'Cliquer pour joindre le reçu (image ou PDF)'}</span>
                )}
              </label>
              {payReceiptFile && (
                <button type="button" onClick={() => setPayReceiptFile(null)}
                  className="text-xs text-red-500 mt-1 hover:underline">
                  {lang === 'ar' ? 'إزالة الملف' : 'Supprimer le fichier'}
                </button>
              )}
            </div>
            <div>
              <label className="label">{w('notes')}</label>
              <input className="input" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                placeholder={lang === 'ar' ? 'ملاحظات اختيارية...' : 'Notes optionnelles...'} />
            </div>
          </div>
        )}
      </Modal>

      {/* Repair / Réclamation Modal */}
      <Modal isOpen={showRepairModal} onClose={() => setShowRepairModal(false)}
        title={editingRepair
          ? (lang === 'ar' ? 'تعديل البلاغ' : 'Modifier le signalement')
          : isWaterReader ? w('signaler') : w('addRepair')}
        footer={<><button onClick={() => setShowRepairModal(false)} className="btn-secondary">{w('cancel')}</button><button onClick={handleSaveRepair} disabled={saving} className="btn-primary">{saving ? w('loading') : w('save')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{w('interventionType')}</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                ['REPARATION', w('typeReparation'), 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'],
                ['MAINTENANCE', w('typeMaintenance'), 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'],
                ['EXTENSION', w('typeExtension'), 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'],
                ['FUITE', w('typeFuite'), 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'],
                ['BRANCHEMENT', w('typeBranchement'), 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300'],
              ].map(([val, label, activeClass]) => (
                <label key={val} className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border-2 cursor-pointer text-sm font-medium transition-colors ${repairForm.type === val ? activeClass : 'border-gray-200 dark:border-gray-700 text-gray-600'}`}>
                  <input type="radio" name="repairType" value={val} checked={repairForm.type === val}
                    onChange={() => setRepairForm({ ...repairForm, type: val })} className="hidden" />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{w('linkedInstallation')} *</label>
            <select className="input" value={repairForm.installationId}
              onChange={(e) => setRepairForm({ ...repairForm, installationId: e.target.value })}>
              <option value="">{lang === 'ar' ? '— اختر العداد —' : '— Choisir un compteur —'}</option>
              {installations.map((inst) => (
                <option key={inst.id} value={inst.id}>N° {inst.meterNumber} — {inst.householdName}</option>
              ))}
            </select>
            {repairForm.installationId && (() => {
              const sel = installations.find((i) => i.id === repairForm.installationId);
              return sel ? (
                <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm">
                  <Droplets size={13} className="text-blue-500 flex-shrink-0" />
                  <span className="font-semibold text-blue-700 dark:text-blue-300 font-mono">N° {sel.meterNumber}</span>
                  <span className="text-blue-600 dark:text-blue-400">{sel.householdName}</span>
                  {sel.phone && <span className="text-blue-400 text-xs ms-auto">{sel.phone}</span>}
                </div>
              ) : null;
            })()}
          </div>
          <div>
            <label className="label">{w('repairTitle')} *</label>
            <input className="input" value={repairForm.title} onChange={(e) => setRepairForm({ ...repairForm, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{w('repairDesc')}</label>
            <textarea className="input" rows={2} value={repairForm.description}
              onChange={(e) => setRepairForm({ ...repairForm, description: e.target.value })} />
          </div>
          <div className={`grid gap-4 ${!isWaterReader ? 'grid-cols-2' : ''}`}>
            <div>
              <label className="label">{w('repairLocation')}</label>
              <input className="input" value={repairForm.location} onChange={(e) => setRepairForm({ ...repairForm, location: e.target.value })} />
            </div>
            {!isWaterReader && (
              <div>
                <label className="label">{w('repairCost')}</label>
                <input className="input" type="number" step="0.01" value={repairForm.cost}
                  onChange={(e) => setRepairForm({ ...repairForm, cost: e.target.value })} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">{w('reference')}</label>
              <input className="input font-mono" value={repairForm.reference}
                onChange={(e) => setRepairForm({ ...repairForm, reference: e.target.value })}
                placeholder="Ex: REC-2025-001" />
            </div>
            <div>
              <label className="label">{lang === 'ar' ? 'تاريخ الإبلاغ' : 'Date signalement'}</label>
              <input className="input" type="date" value={repairForm.reportedDate}
                onChange={(e) => setRepairForm({ ...repairForm, reportedDate: e.target.value })} />
            </div>
          </div>

          {/* Technician section — admin only */}
          {!isWaterReader && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {lang === 'ar' ? 'معلومات التقني' : 'Informations technicien'}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">{w('technicianName')}</label>
                  <input className="input" value={repairForm.technicianName}
                    onChange={(e) => setRepairForm({ ...repairForm, technicianName: e.target.value })}
                    placeholder={lang === 'ar' ? 'اسم التقني...' : 'Nom du technicien...'} />
                </div>
                <div>
                  <label className="label">{w('technicianAmount')}</label>
                  <input className="input" type="number" step="0.01" value={repairForm.technicianAmount}
                    onChange={(e) => setRepairForm({ ...repairForm, technicianAmount: e.target.value })} />
                </div>
              </div>
              <div className="mt-3">
                <label className="label">{w('partsNeeded')}</label>
                <input className="input" value={repairForm.partsNeeded}
                  onChange={(e) => setRepairForm({ ...repairForm, partsNeeded: e.target.value })}
                  placeholder={lang === 'ar' ? 'القطع المطلوبة...' : 'Pièces nécessaires...'} />
              </div>
              <div className="mt-3">
                <label className="label">{w('workDetails')}</label>
                <textarea className="input" rows={2} value={repairForm.workDetails}
                  onChange={(e) => setRepairForm({ ...repairForm, workDetails: e.target.value })}
                  placeholder={lang === 'ar' ? 'تفاصيل الأشغال...' : 'Détails des travaux effectués...'} />
              </div>
              <div className="mt-3">
                <label className="label">{w('deadline')}</label>
                <input className="input" type="date" value={repairForm.deadline}
                  onChange={(e) => setRepairForm({ ...repairForm, deadline: e.target.value })} />
              </div>
            </div>
          )}

          {editingRepair && (
            <div>
              <label className="label">{lang === 'ar' ? 'حالة الإصلاح' : 'Statut'}</label>
              <select className="input" value={repairForm.status}
                onChange={(e) => setRepairForm({ ...repairForm, status: e.target.value })}>
                <option value="PENDING">{w('pending')}</option>
                <option value="IN_PROGRESS">{w('inProgress')}</option>
                <option value="FIXED">{w('fixed')}</option>
              </select>
            </div>
          )}
        </div>
      </Modal>

      {/* Reader Modal */}
      <Modal isOpen={showReaderModal} onClose={() => setShowReaderModal(false)}
        title={w('addReader')}
        footer={<><button onClick={() => setShowReaderModal(false)} className="btn-secondary">{w('cancel')}</button><button onClick={handleSaveReader} disabled={saving} className="btn-primary">{saving ? w('loading') : w('save')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{w('readerName')} *</label>
            <input className="input" value={readerForm.name} onChange={(e) => setReaderForm({ ...readerForm, name: e.target.value })}
              placeholder={lang === 'ar' ? 'الاسم الكامل...' : 'Nom complet...'} />
          </div>
          <div>
            <label className="label">{w('readerEmail')} *</label>
            <input className="input" type="email" value={readerForm.email} onChange={(e) => setReaderForm({ ...readerForm, email: e.target.value })}
              placeholder="exemple@email.com" />
          </div>
          <div>
            <label className="label">{w('readerPassword')} *</label>
            <div className="relative">
              <input className="input pe-10" type={showReaderPass ? 'text' : 'password'} value={readerForm.password}
                onChange={(e) => setReaderForm({ ...readerForm, password: e.target.value })} />
              <button type="button" onClick={() => setShowReaderPass(!showReaderPass)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showReaderPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {/* Installation assignment */}
          <div>
            <label className="label">
              {lang === 'ar' ? 'أسند إليه العدادات التالية' : 'Assigner les compteurs suivants'}
              {readerInstIds.length > 0 && (
                <span className="ms-2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {readerInstIds.length} {lang === 'ar' ? 'محدد' : 'sélectionné(s)'}
                </span>
              )}
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-700">
              {installations.filter((i) => i.isActive).length === 0 ? (
                <p className="p-3 text-xs text-gray-400 text-center">{w('noInstallations')}</p>
              ) : (
                installations.filter((i) => i.isActive).map((inst) => {
                  const checked = readerInstIds.includes(inst.id);
                  const alreadyAssigned = inst.readerId && !checked;
                  return (
                    <label key={inst.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'} ${alreadyAssigned ? 'opacity-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!!alreadyAssigned}
                        onChange={(e) => {
                          setReaderInstIds(e.target.checked
                            ? [...readerInstIds, inst.id]
                            : readerInstIds.filter((id) => id !== inst.id));
                        }}
                        className="rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inst.householdName}</p>
                        <p className="text-xs text-gray-400 font-mono">{inst.meterNumber}</p>
                      </div>
                      {alreadyAssigned && (
                        <span className="text-xs text-purple-500 flex-shrink-0">
                          {readers.find((r) => r.id === inst.readerId)?.name ?? lang === 'ar' ? 'مسند' : 'assigné'}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300">
            {lang === 'ar'
              ? 'سيتمكن هذا القارئ من تسجيل الدخول وإدارة العدادات المسندة إليه فقط.'
              : 'Ce lecteur pourra se connecter et gérer uniquement les compteurs qui lui sont assignés.'}
          </div>
        </div>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={w('delete')}
        message={w('confirmDelete')}
        loading={deleting}
      />
    </div>
  );
};
