import React, { useEffect, useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, ClipboardList, Clock, Stamp, User, CheckCircle, Building2, Banknote, Scale, Users, ShieldCheck } from 'lucide-react';
import { documentsApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatFileSize, downloadBlob } from '../../lib/utils';

const DOC_TYPES = ['ALL', 'PV', 'REPORT', 'CONTRACT', 'OTHER'];
const typeColors: Record<string, string> = { PV: 'badge-blue', REPORT: 'badge-green', CONTRACT: 'badge-purple', OTHER: 'badge-gray' };

// ── Administrative procedures data ───────────────────────────────────────────
type Procedure = {
  nameAr: string; nameFr: string;
  descAr: string; descFr: string;
  responsible: string[];   // role keys
  timbre: 'free' | 'paid';
  timeAr: string; timeFr: string;
  category: 'creation' | 'governance' | 'finance' | 'legal' | 'external';
};

const ROLE_LABELS: Record<string, { ar: string; fr: string; color: string }> = {
  president:  { ar: 'الرئيس',       fr: 'Président',    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  secretary:  { ar: 'الكاتب العام', fr: 'Secrétaire',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  treasurer:  { ar: 'أمين المال',   fr: 'Trésorier',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  bureau:     { ar: 'المكتب كاملاً', fr: 'Bureau complet', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  ag:         { ar: 'الجمعية العامة', fr: 'Assemblée Générale', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
};

const CATEGORY_META: Record<string, { labelAr: string; labelFr: string; color: string; dotColor: string; icon: React.ReactNode }> = {
  creation:   { labelAr: 'التأسيس والهيكلة',    labelFr: 'Création & Structure',     color: 'from-blue-500 to-indigo-600',   dotColor: 'bg-blue-400',    icon: <Building2 size={16}/> },
  governance: { labelAr: 'الحوكمة والتغييرات',  labelFr: 'Gouvernance & Changements', color: 'from-violet-500 to-purple-600', dotColor: 'bg-violet-400',  icon: <Users size={16}/> },
  finance:    { labelAr: 'المالية والدعم',       labelFr: 'Finance & Subventions',     color: 'from-emerald-500 to-teal-600',  dotColor: 'bg-emerald-400', icon: <Banknote size={16}/> },
  legal:      { labelAr: 'القانونية والإدارية', labelFr: 'Juridique & Administratif', color: 'from-rose-500 to-pink-600',     dotColor: 'bg-rose-400',    icon: <Scale size={16}/> },
  external:   { labelAr: 'العلاقات الخارجية',   labelFr: 'Relations Extérieures',     color: 'from-amber-500 to-orange-500',  dotColor: 'bg-amber-400',   icon: <ShieldCheck size={16}/> },
};

const PROCEDURES: Procedure[] = [
  // ── Création ──
  { category: 'creation',
    nameAr: 'إيداع ملف التأسيس', nameFr: 'Dépôt du dossier de création',
    descAr: 'إيداع الملف الكامل لدى السلطة الإدارية المحلية (العمالة أو الباشوية)',
    descFr: "Dépôt du dossier complet auprès de l'autorité administrative locale (Préfecture ou Caïdat)",
    responsible: ['president', 'secretary'], timbre: 'free',
    timeAr: 'فور الإيداع يُسلَّم وصل، والتأسيس ساري بعد 60 يوماً بدون اعتراض',
    timeFr: 'Récépissé immédiat, association valide après 60 jours sans opposition' },

  { category: 'creation',
    nameAr: 'الحصول على وصل الإيداع', nameFr: 'Obtention du récépissé de dépôt',
    descAr: 'استلام الوصل الرسمي الذي يُثبت إيداع ملف التأسيس لدى السلطة',
    descFr: "Réception du récépissé officiel prouvant le dépôt du dossier auprès de l'autorité",
    responsible: ['president'], timbre: 'free',
    timeAr: 'فوري عند الإيداع', timeFr: 'Immédiat lors du dépôt' },

  { category: 'creation',
    nameAr: 'فتح الحساب البنكي', nameFr: 'Ouverture du compte bancaire',
    descAr: 'فتح حساب بنكي باسم الجمعية لاستقبال الاشتراكات والدعم',
    descFr: "Ouverture d'un compte bancaire au nom de l'association pour recevoir cotisations et subventions",
    responsible: ['president', 'treasurer'], timbre: 'free',
    timeAr: '5 إلى 15 يوم عمل', timeFr: '5 à 15 jours ouvrables' },

  // ── Gouvernance ──
  { category: 'governance',
    nameAr: 'التصريح بانتخاب المكتب الجديد', nameFr: "Déclaration d'élection du nouveau bureau",
    descAr: 'تقديم محضر انتخاب المكتب المسير الجديد وقائمة الأعضاء للسلطة الإدارية',
    descFr: "Remise du PV d'élection du nouveau bureau directeur et liste des membres à l'autorité administrative",
    responsible: ['president', 'secretary'], timbre: 'free',
    timeAr: 'خلال 30 يوماً من تاريخ الانتخاب', timeFr: "Dans les 30 jours suivant l'élection" },

  { category: 'governance',
    nameAr: 'تعديل القانون الأساسي', nameFr: 'Modification des statuts',
    descAr: 'إيداع نسخة من القانون الأساسي المعدَّل المصادق عليه من الجمعية العامة',
    descFr: "Dépôt d'une copie des statuts modifiés approuvés par l'assemblée générale",
    responsible: ['ag', 'president', 'secretary'], timbre: 'free',
    timeAr: 'خلال 30 يوماً من المصادقة في الجمعية العامة', timeFr: "Dans les 30 jours suivant l'approbation en AG" },

  { category: 'governance',
    nameAr: 'التصريح بتغيير المقر', nameFr: 'Déclaration de changement de siège',
    descAr: 'إخبار السلطة الإدارية بتغيير العنوان الرسمي للجمعية',
    descFr: "Information de l'autorité administrative du changement d'adresse officielle de l'association",
    responsible: ['president'], timbre: 'free',
    timeAr: 'خلال 30 يوماً من التغيير', timeFr: 'Dans les 30 jours suivant le changement' },

  { category: 'governance',
    nameAr: 'إيداع محضر الجمعية العامة', nameFr: "Dépôt du PV d'assemblée générale",
    descAr: 'إيداع محضر الجمعية العامة السنوية أو الاستثنائية لدى السلطة الإدارية',
    descFr: "Dépôt du procès-verbal de l'assemblée générale ordinaire ou extraordinaire auprès de l'autorité",
    responsible: ['secretary', 'president'], timbre: 'free',
    timeAr: 'خلال 30 يوماً من انعقاد الجمعية العامة', timeFr: "Dans les 30 jours suivant la tenue de l'AG" },

  // ── Finance ──
  { category: 'finance',
    nameAr: 'طلب منحة أو دعم عمومي', nameFr: 'Demande de subvention publique',
    descAr: 'تقديم ملف طلب الدعم المالي لدى الجماعة أو الوزارة أو المجلس الإقليمي',
    descFr: 'Dépôt du dossier de demande de subvention auprès de la Commune, Ministère ou Conseil Régional',
    responsible: ['president', 'treasurer'], timbre: 'free',
    timeAr: 'متغير: 1 إلى 6 أشهر حسب الجهة المانحة', timeFr: "Variable : 1 à 6 mois selon l'organisme" },

  { category: 'finance',
    nameAr: 'تقديم الحساب المالي السنوي', nameFr: 'Présentation des comptes annuels',
    descAr: 'عرض الحساب الختامي للسنة المالية على الجمعية العامة والمصادقة عليه',
    descFr: "Présentation des comptes clôturés de l'exercice à l'assemblée générale pour approbation",
    responsible: ['treasurer', 'ag'], timbre: 'free',
    timeAr: 'خلال 6 أشهر من نهاية السنة المالية', timeFr: "Dans les 6 mois suivant la clôture de l'exercice" },

  { category: 'finance',
    nameAr: 'طلب الإعفاء الضريبي', nameFr: "Demande d'exonération fiscale",
    descAr: 'تقديم طلب الاستفادة من الإعفاء الضريبي المنصوص عليه قانوناً للجمعيات',
    descFr: "Demande de bénéfice de l'exonération fiscale prévue par la loi pour les associations",
    responsible: ['president', 'treasurer'], timbre: 'free',
    timeAr: '30 إلى 90 يوم عمل', timeFr: '30 à 90 jours ouvrables' },

  // ── Juridique ──
  { category: 'legal',
    nameAr: 'الحصول على الاعتراف بالمنفعة العامة', nameFr: "Obtention de la reconnaissance d'utilité publique",
    descAr: 'تقديم طلب الحصول على صفة المنفعة العامة من الحكومة بعد 3 سنوات من النشاط',
    descFr: "Dépôt de la demande de statut d'utilité publique auprès du gouvernement après 3 ans d'activité",
    responsible: ['bureau'], timbre: 'free',
    timeAr: 'يتطلب 3 سنوات من النشاط — قرار الحكومة: 6 إلى 12 شهراً', timeFr: "Requiert 3 ans d'activité — décision gouvernementale : 6 à 12 mois" },

  { category: 'legal',
    nameAr: 'تقديم الشكاوى أو التظلمات', nameFr: 'Dépôt de plaintes ou recours',
    descAr: 'تقديم شكوى إدارية أو قضائية نيابةً عن الجمعية',
    descFr: "Dépôt d'une plainte administrative ou judiciaire au nom de l'association",
    responsible: ['president'], timbre: 'free',
    timeAr: 'فور وقوع النزاع', timeFr: 'Dès la survenue du litige' },

  // ── Relations extérieures ──
  { category: 'external',
    nameAr: 'التحالف أو الانخراط في شبكة', nameFr: 'Affiliation ou adhésion à un réseau',
    descAr: 'الانخراط الرسمي في اتحاد أو شبكة جمعوية على المستوى الوطني أو الدولي',
    descFr: "Adhésion officielle à une fédération ou réseau associatif national ou international",
    responsible: ['bureau'], timbre: 'free',
    timeAr: 'حسب شروط الجهة المستقبِلة', timeFr: "Selon les conditions de l'organisme d'accueil" },

  { category: 'external',
    nameAr: 'إبرام اتفاقية شراكة', nameFr: "Signature d'une convention de partenariat",
    descAr: 'توقيع اتفاقية تعاون مع جماعة ترابية أو مؤسسة عمومية أو خاصة',
    descFr: "Signature d'une convention de coopération avec une collectivité, établissement public ou privé",
    responsible: ['president'], timbre: 'free',
    timeAr: 'حسب مدة التفاوض والموافقة', timeFr: "Selon la durée de négociation et d'approbation" },
];

export const DocumentsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<'docs' | 'procedures'>('docs');
  const [docs, setDocs] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'OTHER', documentDate: '' });
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await documentsApi.getAll(typeFilter && typeFilter !== 'ALL' ? { type: typeFilter } : {});
      setDocs(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [typeFilter]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await documentsApi.upload(file, form);
      setShowModal(false);
      setFile(null);
      setForm({ title: '', type: 'OTHER', documentDate: '' });
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || t('common.error'));
    } finally { setUploading(false); }
  };

  const handleDownload = async (doc: any) => {
    try {
      const res = await documentsApi.download(doc.id);
      downloadBlob(new Blob([res.data]), doc.filename || doc.title);
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await documentsApi.delete(deleteId);
      setDeleteId(null);
      load();
    } finally { setDeleting(false); }
  };

  // Group procedures by category
  const proceduresByCategory = Object.keys(CATEGORY_META).map(cat => ({
    cat,
    meta: CATEGORY_META[cat],
    items: PROCEDURES.filter(p => p.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-500 to-sky-500 p-5 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow">
            <FileText size={24} className="text-teal-200" />
            {t('documents.title')}
          </h2>
          {activeTab === 'docs' && (
            <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-teal-700 hover:bg-teal-50 text-sm font-semibold transition-colors shadow">
              <Upload size={15} />{t('documents.upload')}
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'docs' ? 'bg-white text-teal-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>
            <FileText size={14} />{isAr ? 'وثائقي' : 'Mes documents'}
          </button>
          <button onClick={() => setActiveTab('procedures')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'procedures' ? 'bg-white text-teal-700' : 'bg-white/20 text-white hover:bg-white/30'}`}>
            <ClipboardList size={14} />{isAr ? 'الإجراءات الإدارية' : 'Procédures administratives'}
          </button>
        </div>
      </div>

      {/* ── TAB: My Documents ── */}
      {activeTab === 'docs' && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {DOC_TYPES.map((tp) => (
              <button key={tp} onClick={() => setTypeFilter(tp === 'ALL' ? '' : tp)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${(tp === 'ALL' ? typeFilter === '' : typeFilter === tp) ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}`}>
                {tp === 'ALL' ? t('common.all') : t(`documents.types.${tp}`)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : docs.length === 0 ? (
            <EmptyState icon={<FileText size={28} />} title={t('documents.noDocuments')} action={<button onClick={() => setShowModal(true)} className="btn-primary"><Upload size={16} />{t('documents.upload')}</button>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {docs.map((doc) => (
                <div key={doc.id} className="card p-4 hover:shadow-md transition-shadow group">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mb-3">
                    <FileText size={22} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm mb-1 truncate">{doc.title}</div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={typeColors[doc.type]}>{t(`documents.types.${doc.type}`)}</span>
                    <span className="text-xs text-gray-400">{formatFileSize(doc.size)}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-3">
                    {doc.documentDate
                      ? (lang === 'ar' ? `تاريخ الوثيقة: ${formatDate(doc.documentDate, lang)}` : `Date doc. : ${formatDate(doc.documentDate, lang)}`)
                      : formatDate(doc.createdAt, lang)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleDownload(doc)} className="flex-1 btn-secondary text-xs py-1.5 justify-center">
                      <Download size={13} />{t('documents.download')}
                    </button>
                    <button onClick={() => setDeleteId(doc.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── TAB: Administrative Procedures ── */}
      {activeTab === 'procedures' && (
        <div className="space-y-6">
          {/* Info banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {isAr
                ? 'جميع الإجراءات الإدارية معفاة من الطابع الجبائي بموجب القانون المغربي للجمعيات — ظهير 15 نوفمبر 1958 وتعديلاته'
                : 'Toutes ces procédures sont exonérées de timbre fiscal selon la loi marocaine sur les associations — Dahir du 15 novembre 1958 et ses modifications'}
            </p>
          </div>

          {proceduresByCategory.map(({ cat, meta, items }) => (
            <div key={cat} className="card overflow-hidden">
              {/* Category header */}
              <div className={`flex items-center gap-3 px-5 py-3 bg-gradient-to-r ${meta.color} text-white`}>
                {meta.icon}
                <h3 className="font-semibold text-base">{isAr ? meta.labelAr : meta.labelFr}</h3>
                <span className="ms-auto text-white/70 text-xs">{items.length} {isAr ? 'إجراء' : 'procédures'}</span>
              </div>

              {/* Procedure cards */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((proc, idx) => (
                  <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      {/* Left: name + desc */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                          {isAr ? proc.nameAr : proc.nameFr}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                          {isAr ? proc.descAr : proc.descFr}
                        </p>

                        {/* Responsible badges */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            <User size={10} />{isAr ? 'المسؤول:' : 'Resp.:'}
                          </span>
                          {proc.responsible.map(r => (
                            <span key={r} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ROLE_LABELS[r].color}`}>
                              {isAr ? ROLE_LABELS[r].ar : ROLE_LABELS[r].fr}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: timbre + time */}
                      <div className="flex flex-col gap-2 flex-shrink-0 min-w-[160px]">
                        {/* Timbre fiscal */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                          <Stamp size={13} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                              {isAr ? 'الطابع الجبائي' : 'Timbre fiscal'}
                            </div>
                            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              {isAr ? '✓ معفى مجاناً' : '✓ Exonéré — Gratuit'}
                            </div>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                          <Clock size={13} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                              {isAr ? 'المدة' : 'Délai'}
                            </div>
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 leading-snug">
                              {isAr ? proc.timeAr : proc.timeFr}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t('documents.upload')}
        footer={<><button onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button><button onClick={handleUpload} disabled={uploading || !file} className="btn-primary">{uploading ? t('common.loading') : t('common.save')}</button></>}
      >
        <div className="space-y-4">
          <div>
            <label className="label">{lang === 'ar' ? 'اختر ملفاً' : 'Choisir un fichier'} *</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
            >
              {file ? (
                <div>
                  <FileText size={24} className="mx-auto text-primary-600 mb-2" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
              ) : (
                <div>
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">{lang === 'ar' ? 'انقر لاختيار ملف' : 'Cliquez pour choisir un fichier'}</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, Images (max 10MB)</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setFile(f); setForm({ ...form, title: form.title || f.name }); }
              }}
            />
          </div>
          <div>
            <label className="label">{t('documents.docTitle')}</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{lang === 'ar' ? 'تاريخ الوثيقة' : 'Date du document'}</label>
            <input className="input" type="date" value={form.documentDate} onChange={(e) => setForm({ ...form, documentDate: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('documents.type')}</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {['PV', 'REPORT', 'CONTRACT', 'OTHER'].map((tp) => <option key={tp} value={tp}>{t(`documents.types.${tp}`)}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={lang === 'ar' ? 'حذف الوثيقة' : 'Supprimer le document'} message={t('common.confirmDelete')} loading={deleting} />
    </div>
  );
};
