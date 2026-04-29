import React, { useEffect, useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download } from 'lucide-react';
import { documentsApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatFileSize, downloadBlob } from '../../lib/utils';

const DOC_TYPES = ['ALL', 'PV', 'REPORT', 'CONTRACT', 'OTHER'];
const typeColors: Record<string, string> = { PV: 'badge-blue', REPORT: 'badge-green', CONTRACT: 'badge-purple', OTHER: 'badge-gray' };

export const DocumentsPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [docs, setDocs] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'OTHER' });
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
      setForm({ title: '', type: 'OTHER' });
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-teal-600 via-cyan-500 to-sky-500 p-5 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow">
            <FileText size={24} className="text-teal-200" />
            {t('documents.title')}
          </h2>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-teal-700 hover:bg-teal-50 text-sm font-semibold transition-colors shadow"><Upload size={15} />{t('documents.upload')}</button>
        </div>
      </div>

      {/* Type filter */}
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
              <div className="text-xs text-gray-400 mb-3">{formatDate(doc.createdAt, lang)}</div>
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
