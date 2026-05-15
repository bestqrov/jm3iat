import React, { useEffect, useState } from 'react';
import {
  Plus, Copy, Check, Trash2, ToggleLeft, ToggleRight, Tag,
  Users, TrendingUp, Wallet, Eye, X, ChevronDown, ChevronUp,
  Phone, Mail, CreditCard, BadgeDollarSign, CheckCircle2,
} from 'lucide-react';
import { superadminApi } from '../../../lib/api';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { formatDate } from '../../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoSeller {
  id: string;
  name: string;
  email: string;
  phone: string;
  bankName?: string;
  bankAccount?: string;
  bankHolder?: string;
  commissionPerUse: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  promoCodes: { id: string; code: string; usedCount: number }[];
  totalUses: number;
  totalBenefice: number;
  unpaidBenefice: number;
}

interface PromoCode {
  id: string;
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
  applicableTo: string[];
  sellerId?: string;
  commissionOverride?: number;
  seller?: { id: string; name: string; email: string };
  createdAt: string;
}

interface Usage {
  id: string;
  orgName: string;
  discountAmount: number;
  commissionAmount: number;
  isPaid: boolean;
  usedAt: string;
  promoCode: { code: string };
}

const ASSOC_TYPES = ['REGULAR', 'PROJECTS', 'WATER', 'PRODUCTIVE', 'PRODUCTIVE_WATER'];

// ─── Shared styles ────────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

// ─── Seller Card ─────────────────────────────────────────────────────────────

const SellerCard: React.FC<{
  seller: PromoSeller;
  isAr: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPaid: () => void;
  onViewUsages: () => void;
}> = ({ seller, isAr, onEdit, onDelete, onMarkPaid, onViewUsages }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border ${seller.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'} shadow-sm overflow-hidden`}>
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
          <Users size={18} className="text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">{seller.name}</span>
            {!seller.isActive && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">{isAr ? 'غير نشط' : 'Inactif'}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-500"><Mail size={10} />{seller.email}</span>
            <span className="flex items-center gap-1 text-xs text-gray-500"><Phone size={10} />{seller.phone}</span>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-600 transition-colors text-xs">
            ✏️
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-px bg-gray-100 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-700">
        <div className="bg-white dark:bg-gray-800 px-3 py-2 text-center">
          <div className="text-xs text-gray-500 mb-0.5">{isAr ? 'الاستخدامات' : 'Utilisations'}</div>
          <div className="font-bold text-gray-900 dark:text-white text-sm">{seller.totalUses}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 px-3 py-2 text-center">
          <div className="text-xs text-gray-500 mb-0.5">{isAr ? 'إجمالي الأرباح' : 'Total bénéfices'}</div>
          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{seller.totalBenefice.toFixed(2)} MAD</div>
        </div>
        <div className="bg-white dark:bg-gray-800 px-3 py-2 text-center">
          <div className="text-xs text-gray-500 mb-0.5">{isAr ? 'غير مدفوع' : 'Impayé'}</div>
          <div className={`font-bold text-sm ${seller.unpaidBenefice > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
            {seller.unpaidBenefice.toFixed(2)} MAD
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {/* Commission */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 flex items-center gap-1"><TrendingUp size={11} /> {isAr ? 'العمولة لكل استخدام' : 'Commission par usage'}</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{seller.commissionPerUse.toFixed(2)} MAD</span>
          </div>

          {/* Bank info */}
          {(seller.bankName || seller.bankAccount) && (
            <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-1">
              <div className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                <CreditCard size={11} /> {isAr ? 'معلومات البنك' : 'Infos bancaires'}
              </div>
              {seller.bankHolder && <p className="text-xs text-gray-700 dark:text-gray-300">{isAr ? 'الاسم:' : 'Titulaire:'} {seller.bankHolder}</p>}
              {seller.bankName && <p className="text-xs text-gray-700 dark:text-gray-300">{isAr ? 'البنك:' : 'Banque:'} {seller.bankName}</p>}
              {seller.bankAccount && <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">{seller.bankAccount}</p>}
            </div>
          )}

          {/* Codes */}
          {seller.promoCodes.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-1">{isAr ? 'الأكواد المرتبطة:' : 'Codes associés:'}</p>
              <div className="flex flex-wrap gap-1">
                {seller.promoCodes.map(c => (
                  <span key={c.id} className="text-xs font-mono px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full">
                    {c.code} ({c.usedCount})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {seller.notes && (
            <p className="text-xs text-gray-500 italic">{seller.notes}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onViewUsages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Eye size={11} /> {isAr ? 'سجل الاستخدام' : 'Historique'}
            </button>
            {seller.unpaidBenefice > 0 && (
              <button
                onClick={onMarkPaid}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
              >
                <CheckCircle2 size={11} /> {isAr ? 'تأكيد الدفع' : 'Marquer payé'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PromoCodesTab: React.FC = () => {
  const { lang, t } = useLanguage();
  const isAr = lang === 'ar';
  const pr = (k: string) => t(`sa.promos.${k}`);
  const sh = (k: string) => t(`sa.shared.${k}`);

  const [activeSection, setActiveSection] = useState<'codes' | 'sellers'>('codes');

  // ── Promo Codes state ──
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [deleteCodeId, setDeleteCodeId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingCode, setSavingCode] = useState(false);

  const emptyCodeForm = {
    code: '', description: '',
    discountType: 'PERCENTAGE', discountValue: 10,
    maxUses: '', expiresAt: '', applicableTo: [] as string[],
    sellerId: '', commissionOverride: '',
  };
  const [codeForm, setCodeForm] = useState(emptyCodeForm);

  // ── Sellers state ──
  const [sellers, setSellers] = useState<PromoSeller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [showSellerForm, setShowSellerForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState<PromoSeller | null>(null);
  const [deleteSellerData, setDeleteSellerData] = useState<{ id: string; name: string } | null>(null);
  const [savingSeller, setSavingSeller] = useState(false);
  const [markPaidData, setMarkPaidData] = useState<{ id: string; name: string; amount: number } | null>(null);
  const [usagesData, setUsagesData] = useState<{ seller: PromoSeller; usages: Usage[] } | null>(null);

  const emptySellerForm = {
    name: '', email: '', phone: '',
    bankName: '', bankAccount: '', bankHolder: '',
    commissionPerUse: '0', notes: '', isActive: true,
  };
  const [sellerForm, setSellerForm] = useState<any>(emptySellerForm);

  // ── Load ──
  const loadCodes = async () => {
    setLoadingCodes(true);
    try { const res = await superadminApi.getPromoCodes(); setCodes(res.data); }
    finally { setLoadingCodes(false); }
  };

  const loadSellers = async () => {
    setLoadingSellers(true);
    try { const res = await superadminApi.getPromoSellers(); setSellers(res.data); }
    finally { setLoadingSellers(false); }
  };

  useEffect(() => { loadCodes(); loadSellers(); }, []);

  // ── Code handlers ──
  const handleSaveCode = async () => {
    setSavingCode(true);
    try {
      await superadminApi.createPromoCode({
        ...codeForm,
        discountValue: Number(codeForm.discountValue),
        maxUses: codeForm.maxUses ? Number(codeForm.maxUses) : undefined,
        expiresAt: codeForm.expiresAt || undefined,
        sellerId: codeForm.sellerId || undefined,
        commissionOverride: codeForm.commissionOverride !== '' ? Number(codeForm.commissionOverride) : undefined,
      });
      setShowCodeForm(false);
      setCodeForm(emptyCodeForm);
      await loadCodes();
    } finally { setSavingCode(false); }
  };

  const handleToggleCode = async (code: PromoCode) => {
    await superadminApi.updatePromoCode(code.id, { isActive: !code.isActive });
    await loadCodes();
  };

  const handleDeleteCode = async () => {
    if (!deleteCodeId) return;
    await superadminApi.deletePromoCode(deleteCodeId);
    setDeleteCodeId(null);
    await loadCodes();
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleApplicable = (type: string) => {
    setCodeForm((f: any) => ({
      ...f,
      applicableTo: f.applicableTo.includes(type)
        ? f.applicableTo.filter((t: string) => t !== type)
        : [...f.applicableTo, type],
    }));
  };

  const genCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setCodeForm((f: any) => ({ ...f, code }));
  };

  // ── Seller handlers ──
  const openNewSeller = () => {
    setEditingSeller(null);
    setSellerForm(emptySellerForm);
    setShowSellerForm(true);
  };

  const openEditSeller = (s: PromoSeller) => {
    setEditingSeller(s);
    setSellerForm({
      name: s.name, email: s.email, phone: s.phone,
      bankName: s.bankName || '', bankAccount: s.bankAccount || '', bankHolder: s.bankHolder || '',
      commissionPerUse: String(s.commissionPerUse), notes: s.notes || '', isActive: s.isActive,
    });
    setShowSellerForm(true);
  };

  const handleSaveSeller = async () => {
    setSavingSeller(true);
    try {
      const data = { ...sellerForm, commissionPerUse: Number(sellerForm.commissionPerUse) };
      if (editingSeller) {
        await superadminApi.updatePromoSeller(editingSeller.id, data);
      } else {
        await superadminApi.createPromoSeller(data);
      }
      setShowSellerForm(false);
      await loadSellers();
    } finally { setSavingSeller(false); }
  };

  const handleDeleteSeller = async () => {
    if (!deleteSellerData) return;
    await superadminApi.deletePromoSeller(deleteSellerData.id);
    setDeleteSellerData(null);
    await loadSellers();
  };

  const handleMarkPaid = async () => {
    if (!markPaidData) return;
    await superadminApi.markSellerPaid(markPaidData.id);
    setMarkPaidData(null);
    await loadSellers();
  };

  const handleViewUsages = async (seller: PromoSeller) => {
    const res = await superadminApi.getPromoSellerUsages(seller.id);
    setUsagesData({ seller, usages: res.data });
  };

  const totalUnpaid = sellers.reduce((s, sel) => s + sel.unpaidBenefice, 0);
  const totalBenefice = sellers.reduce((s, sel) => s + sel.totalBenefice, 0);

  return (
    <div className="space-y-6">
      {/* Section tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveSection('codes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'codes' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Tag size={14} /> {isAr ? 'أكواد الخصم' : 'Codes de réduction'}
        </button>
        <button
          onClick={() => setActiveSection('sellers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'sellers' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          <Users size={14} /> {isAr ? 'المسوّقون' : 'Distributeurs'}
          {sellers.length > 0 && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">{sellers.length}</span>
          )}
        </button>
      </div>

      {/* ── PROMO CODES SECTION ─────────────────────────────────────────── */}
      {activeSection === 'codes' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{pr('title')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {isAr ? 'إنشاء وإدارة أكواد الخصم للمنظمات' : 'Créez et gérez des codes de réduction pour les organisations'}
              </p>
            </div>
            <button
              onClick={() => setShowCodeForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} /> {pr('createCode')}
            </button>
          </div>

          {loadingCodes ? (
            <div className="text-center py-10 text-gray-400">{sh('loading')}</div>
          ) : codes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Tag size={48} className="mx-auto mb-3 opacity-30" />
              <p>{pr('noCodes')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {codes.map(code => {
                const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
                const isExhausted = code.maxUses != null && code.usedCount >= code.maxUses;
                const isEffective = code.isActive && !isExpired && !isExhausted;

                return (
                  <div
                    key={code.id}
                    className={`bg-white dark:bg-gray-800 rounded-2xl border ${isEffective ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'} p-4 shadow-sm flex flex-col gap-3`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 tracking-widest">{code.code}</div>
                      <button onClick={() => copyCode(code.code, code.id)} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        {copiedId === code.id ? <><Check size={11} className="text-emerald-500" /> {pr('copied')}</> : <><Copy size={11} /> {pr('copyCode')}</>}
                      </button>
                    </div>

                    {code.description && <p className="text-sm text-gray-500 dark:text-gray-400">{code.description}</p>}

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        -{code.discountValue}{code.discountType === 'PERCENTAGE' ? '%' : ' MAD'}
                      </span>
                      <span className="text-xs text-gray-400">{code.discountType === 'PERCENTAGE' ? pr('percentage') : pr('fixed')}</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{pr('usedCount')}</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{code.usedCount}{code.maxUses ? ` / ${code.maxUses}` : ''}</span>
                      </div>
                      {code.maxUses && (
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (code.usedCount / code.maxUses) * 100)}%` }} />
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-400">
                      {code.expiresAt
                        ? <span className={isExpired ? 'text-red-500' : ''}>{pr('expiresAt')}: {formatDate(code.expiresAt)}</span>
                        : pr('noExpiry')}
                    </div>

                    {code.applicableTo.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {code.applicableTo.map(type => (
                          <span key={type} className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full">{type}</span>
                        ))}
                      </div>
                    )}

                    {code.seller && (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                        <Users size={11} className="text-violet-500 flex-shrink-0" />
                        <span className="text-xs text-violet-700 dark:text-violet-300 truncate">{code.seller.name}</span>
                        {code.commissionOverride != null && (
                          <span className="ms-auto text-xs text-violet-500 font-mono whitespace-nowrap">{code.commissionOverride} MAD</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      <button onClick={() => handleToggleCode(code)} className={`flex items-center gap-1 text-xs transition-colors ${code.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        {code.isActive ? <><ToggleRight size={15} /> {sh('active')}</> : <><ToggleLeft size={15} /> {sh('inactive')}</>}
                      </button>
                      <button onClick={() => setDeleteCodeId(code.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── SELLERS SECTION ─────────────────────────────────────────────── */}
      {activeSection === 'sellers' && (
        <>
          {/* Summary bar */}
          {sellers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: isAr ? 'المسوّقون' : 'Distributeurs', value: sellers.length, icon: <Users size={14} />, color: 'text-violet-600 dark:text-violet-400' },
                { label: isAr ? 'إجمالي الاستخدامات' : 'Total utilisations', value: sellers.reduce((s, x) => s + x.totalUses, 0), icon: <Tag size={14} />, color: 'text-indigo-600 dark:text-indigo-400' },
                { label: isAr ? 'إجمالي الأرباح' : 'Total bénéfices', value: `${totalBenefice.toFixed(2)} MAD`, icon: <TrendingUp size={14} />, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: isAr ? 'مبالغ غير مدفوعة' : 'Impayés', value: `${totalUnpaid.toFixed(2)} MAD`, icon: <Wallet size={14} />, color: totalUnpaid > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
                  <div className={`flex items-center gap-1.5 text-xs mb-1 ${stat.color}`}>{stat.icon}{stat.label}</div>
                  <div className={`font-bold text-lg ${stat.color}`}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isAr ? 'إدارة المسوّقين' : 'Gestion des distributeurs'}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {isAr ? 'تتبع المسوّقين وعمولاتهم وأرباحهم' : 'Suivez les distributeurs, leurs commissions et bénéfices'}
              </p>
            </div>
            <button
              onClick={openNewSeller}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} /> {isAr ? 'إضافة مسوّق' : 'Ajouter distributeur'}
            </button>
          </div>

          {loadingSellers ? (
            <div className="text-center py-10 text-gray-400">{sh('loading')}</div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <p>{isAr ? 'لا يوجد مسوّقون بعد' : 'Aucun distributeur encore'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sellers.map(seller => (
                <SellerCard
                  key={seller.id}
                  seller={seller}
                  isAr={isAr}
                  onEdit={() => openEditSeller(seller)}
                  onDelete={() => setDeleteSellerData({ id: seller.id, name: seller.name })}
                  onMarkPaid={() => setMarkPaidData({ id: seller.id, name: seller.name, amount: seller.unpaidBenefice })}
                  onViewUsages={() => handleViewUsages(seller)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CREATE CODE MODAL ─────────────────────────────────────────────── */}
      <Modal isOpen={showCodeForm} onClose={() => setShowCodeForm(false)} title={pr('createCode')}>
        <div className="space-y-4">
          <div>
            <label className={lbl}>{pr('code')} *</label>
            <div className="flex gap-2">
              <input className={inp} value={codeForm.code} onChange={e => setCodeForm((f: any) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="EX: SUMMER25" />
              <button onClick={genCode} className="px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors whitespace-nowrap">
                {isAr ? 'توليد' : 'Générer'}
              </button>
            </div>
          </div>

          <div>
            <label className={lbl}>{pr('description')}</label>
            <input className={inp} value={codeForm.description} onChange={e => setCodeForm((f: any) => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{pr('discountType')}</label>
              <select className={inp} value={codeForm.discountType} onChange={e => setCodeForm((f: any) => ({ ...f, discountType: e.target.value }))}>
                <option value="PERCENTAGE">{pr('percentage')}</option>
                <option value="FIXED">{pr('fixed')}</option>
              </select>
            </div>
            <div>
              <label className={lbl}>{pr('discountValue')} *</label>
              <input type="number" min="0" className={inp} value={codeForm.discountValue} onChange={e => setCodeForm((f: any) => ({ ...f, discountValue: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>{pr('maxUses')} ({isAr ? 'اختياري' : 'optionnel'})</label>
              <input type="number" className={inp} value={codeForm.maxUses} onChange={e => setCodeForm((f: any) => ({ ...f, maxUses: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>{pr('expiresAt')} ({isAr ? 'اختياري' : 'optionnel'})</label>
              <input type="date" className={inp} value={codeForm.expiresAt} onChange={e => setCodeForm((f: any) => ({ ...f, expiresAt: e.target.value }))} />
            </div>
          </div>

          {/* Seller assignment */}
          <div className="p-3 bg-violet-50 dark:bg-violet-900/10 rounded-xl border border-violet-100 dark:border-violet-800 space-y-3">
            <p className="text-xs font-medium text-violet-700 dark:text-violet-300 flex items-center gap-1"><Users size={12} /> {isAr ? 'تعيين مسوّق (اختياري)' : 'Assigner un distributeur (optionnel)'}</p>
            <div>
              <label className={lbl}>{isAr ? 'المسوّق' : 'Distributeur'}</label>
              <select className={inp} value={codeForm.sellerId} onChange={e => setCodeForm((f: any) => ({ ...f, sellerId: e.target.value }))}>
                <option value="">{isAr ? 'بدون مسوّق' : 'Sans distributeur'}</option>
                {sellers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            </div>
            {codeForm.sellerId && (
              <div>
                <label className={lbl}>{isAr ? 'تجاوز العمولة (MAD) — اختياري' : 'Remplacer commission (MAD) — optionnel'}</label>
                <input type="number" min="0" step="0.01" className={inp} value={codeForm.commissionOverride}
                  onChange={e => setCodeForm((f: any) => ({ ...f, commissionOverride: e.target.value }))}
                  placeholder={isAr ? 'تركه فارغاً = استخدام عمولة المسوّق' : 'Vide = utiliser commission du distributeur'}
                />
              </div>
            )}
          </div>

          <div>
            <label className={lbl}>{pr('applicableTo')} ({isAr ? 'فارغ = الكل' : 'vide = tous'})</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ASSOC_TYPES.map(type => (
                <button key={type} type="button" onClick={() => toggleApplicable(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${codeForm.applicableTo.includes(type) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowCodeForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{sh('cancel')}</button>
          <button onClick={handleSaveCode} disabled={savingCode || !codeForm.code || !codeForm.discountValue}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {savingCode ? sh('loading') : sh('create')}
          </button>
        </div>
      </Modal>

      {/* ── SELLER FORM MODAL ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showSellerForm}
        onClose={() => setShowSellerForm(false)}
        title={editingSeller ? (isAr ? 'تعديل المسوّق' : 'Modifier le distributeur') : (isAr ? 'إضافة مسوّق جديد' : 'Ajouter un distributeur')}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>{isAr ? 'الاسم الكامل' : 'Nom complet'} *</label>
              <input className={inp} value={sellerForm.name} onChange={e => setSellerForm((f: any) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>{isAr ? 'البريد الإلكتروني' : 'Email'} *</label>
              <input type="email" className={inp} dir="ltr" value={sellerForm.email} onChange={e => setSellerForm((f: any) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>{isAr ? 'الهاتف / واتساب' : 'Téléphone / WhatsApp'} *</label>
              <input type="tel" className={inp} dir="ltr" value={sellerForm.phone} onChange={e => setSellerForm((f: any) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={lbl}>{isAr ? 'العمولة لكل استخدام (MAD)' : 'Commission par utilisation (MAD)'}</label>
            <div className="relative">
              <input type="number" min="0" step="0.01" className={inp} value={sellerForm.commissionPerUse}
                onChange={e => setSellerForm((f: any) => ({ ...f, commissionPerUse: e.target.value }))} />
              <span className="absolute inset-y-0 end-3 flex items-center text-xs text-gray-400 pointer-events-none">MAD</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isAr ? 'المبلغ الذي يكسبه المسوّق في كل مرة يُستخدم فيها كوده' : "Montant gagné par le distributeur à chaque utilisation de son code"}
            </p>
          </div>

          {/* Bank info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 space-y-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1"><CreditCard size={12} /> {isAr ? 'معلومات الحساب البنكي' : 'Informations bancaires'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>{isAr ? 'صاحب الحساب' : 'Titulaire du compte'}</label>
                <input className={inp} value={sellerForm.bankHolder} onChange={e => setSellerForm((f: any) => ({ ...f, bankHolder: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>{isAr ? 'اسم البنك' : 'Nom de la banque'}</label>
                <input className={inp} value={sellerForm.bankName} onChange={e => setSellerForm((f: any) => ({ ...f, bankName: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className={lbl}>{isAr ? 'رقم الحساب / RIB' : 'Numéro de compte / RIB'}</label>
                <input className={inp} dir="ltr" value={sellerForm.bankAccount} onChange={e => setSellerForm((f: any) => ({ ...f, bankAccount: e.target.value }))} placeholder="RIB / IBAN" />
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>{isAr ? 'ملاحظات' : 'Notes'}</label>
            <textarea className={inp} rows={2} value={sellerForm.notes} onChange={e => setSellerForm((f: any) => ({ ...f, notes: e.target.value }))} />
          </div>

          {editingSeller && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="sellerActive" checked={sellerForm.isActive} onChange={e => setSellerForm((f: any) => ({ ...f, isActive: e.target.checked }))} />
              <label htmlFor="sellerActive" className="text-sm text-gray-700 dark:text-gray-300">{isAr ? 'نشط' : 'Actif'}</label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setShowSellerForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">{sh('cancel')}</button>
          <button onClick={handleSaveSeller} disabled={savingSeller || !sellerForm.name || !sellerForm.email || !sellerForm.phone}
            className="px-6 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {savingSeller ? sh('loading') : (editingSeller ? sh('save') || (isAr ? 'حفظ' : 'Enregistrer') : sh('create'))}
          </button>
        </div>
      </Modal>

      {/* ── USAGES MODAL ─────────────────────────────────────────────────── */}
      {usagesData && (
        <Modal isOpen onClose={() => setUsagesData(null)} title={isAr ? `سجل الاستخدام — ${usagesData.seller.name}` : `Historique — ${usagesData.seller.name}`}>
          {usagesData.usages.length === 0 ? (
            <p className="text-center py-8 text-gray-400">{isAr ? 'لا يوجد استخدامات بعد' : 'Aucune utilisation encore'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-start py-2 font-medium">{isAr ? 'المنظمة' : 'Organisation'}</th>
                    <th className="text-start py-2 font-medium">{isAr ? 'الكود' : 'Code'}</th>
                    <th className="text-end py-2 font-medium">{isAr ? 'الخصم' : 'Remise'}</th>
                    <th className="text-end py-2 font-medium">{isAr ? 'العمولة' : 'Commission'}</th>
                    <th className="text-end py-2 font-medium">{isAr ? 'الحالة' : 'Statut'}</th>
                    <th className="text-end py-2 font-medium">{isAr ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {usagesData.usages.map(u => (
                    <tr key={u.id} className="text-gray-700 dark:text-gray-300">
                      <td className="py-2.5 font-medium text-xs">{u.orgName}</td>
                      <td className="py-2.5 font-mono text-xs text-indigo-600 dark:text-indigo-400">{u.promoCode.code}</td>
                      <td className="py-2.5 text-end text-xs">{u.discountAmount}</td>
                      <td className="py-2.5 text-end text-xs text-emerald-600 dark:text-emerald-400 font-semibold">{u.commissionAmount.toFixed(2)} MAD</td>
                      <td className="py-2.5 text-end">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          {u.isPaid ? (isAr ? 'مدفوع' : 'Payé') : (isAr ? 'معلق' : 'En attente')}
                        </span>
                      </td>
                      <td className="py-2.5 text-end text-xs text-gray-400">{formatDate(u.usedAt)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-600 font-semibold text-sm">
                    <td colSpan={3} className="py-2 text-gray-700 dark:text-gray-300">{isAr ? 'الإجمالي' : 'Total'}</td>
                    <td className="py-2 text-end text-emerald-600 dark:text-emerald-400">
                      {usagesData.usages.reduce((s, u) => s + u.commissionAmount, 0).toFixed(2)} MAD
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Modal>
      )}

      {/* ── CONFIRM DELETE CODE ──────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteCodeId}
        onClose={() => setDeleteCodeId(null)}
        onConfirm={handleDeleteCode}
        title={pr('confirmDelete')}
        message={isAr ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'Cette action est irréversible.'}
        variant="danger"
      />

      {/* ── CONFIRM DELETE SELLER ────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteSellerData}
        onClose={() => setDeleteSellerData(null)}
        onConfirm={handleDeleteSeller}
        title={isAr ? 'حذف المسوّق' : 'Supprimer le distributeur'}
        message={isAr ? `هل أنت متأكد من حذف "${deleteSellerData?.name}"؟` : `Supprimer "${deleteSellerData?.name}" ?`}
        variant="danger"
      />

      {/* ── CONFIRM MARK PAID ────────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!markPaidData}
        onClose={() => setMarkPaidData(null)}
        onConfirm={handleMarkPaid}
        title={isAr ? 'تأكيد الدفع' : 'Confirmer le paiement'}
        message={isAr
          ? `هل تأكيد دفع ${markPaidData?.amount.toFixed(2)} MAD لـ "${markPaidData?.name}"؟`
          : `Confirmer le paiement de ${markPaidData?.amount.toFixed(2)} MAD à "${markPaidData?.name}" ?`}
        variant="warning"
      />
    </div>
  );
};
