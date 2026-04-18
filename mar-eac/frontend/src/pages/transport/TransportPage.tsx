import React, { useEffect, useState, useCallback } from 'react';
import {
  Bus, Users, MapPin, CreditCard, Calendar, TrendingUp, TrendingDown,
  Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, XCircle, Clock, Fuel, Wrench, ShieldCheck, Package,
  Phone, School, Home, User, AlertCircle,
} from 'lucide-react';
import { transportApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency, formatDate } from '../../lib/utils';

// ── helpers ───────────────────────────────────────────────────────────────────

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];

const Badge: React.FC<{ children: React.ReactNode; color: string }> = ({ children, color }) => {
  const map: Record<string, string> = {
    green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    gray:   'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[color] || map.gray}`}>{children}</span>;
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"><X size={18} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    emerald:'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    amber:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    teal:   'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
  };
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
};

// ── DRIVERS TAB ───────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   'green',
  INACTIVE: 'gray',
  ON_LEAVE: 'amber',
};

const DriversTab: React.FC<{ lang: string; t: (k: string) => string }> = ({ lang, t }) => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<any>(null);
  const emptyForm = { fullName: '', phone: '', cinNumber: '', licenseNumber: '', licenseExpiry: '', address: '', status: 'ACTIVE', notes: '' };
  const [form, setForm]       = useState(emptyForm);

  const load = useCallback(() => {
    setLoading(true);
    transportApi.getDrivers().then(r => setDrivers(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal('add'); };
  const openEdit = (d: any) => {
    setForm({
      fullName:      d.fullName,
      phone:         d.phone         || '',
      cinNumber:     d.cinNumber     || '',
      licenseNumber: d.licenseNumber || '',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : '',
      address:       d.address       || '',
      status:        d.status,
      notes:         d.notes         || '',
    });
    setEditing(d);
    setModal('edit');
  };

  const submit = async () => {
    try {
      if (editing) await transportApi.updateDriver(editing.id, form);
      else         await transportApi.createDriver(form);
      setModal(null); load();
    } catch {}
  };

  const del = async (id: string) => {
    if (!confirm(lang === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Supprimer ce conducteur ?')) return;
    await transportApi.deleteDriver(id); load();
  };

  const isExpiringSoon = (expiry: string | null) => {
    if (!expiry) return false;
    const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
    return days > 0 && days < 30;
  };
  const isExpired = (expiry: string | null) => expiry ? new Date(expiry) < new Date() : false;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {lang === 'ar' ? 'السائقون' : 'Conducteurs'}
        </h3>
        <button onClick={openAdd} className="btn-primary text-sm gap-1.5">
          <Plus size={15} />{lang === 'ar' ? 'إضافة سائق' : 'Ajouter un conducteur'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
      ) : drivers.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <User size={40} className="mx-auto mb-3 opacity-30" />
          {lang === 'ar' ? 'لا يوجد سائقون حتى الآن' : 'Aucun conducteur enregistré'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left rtl:text-right">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{lang === 'ar' ? 'الاسم' : 'Nom'}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{lang === 'ar' ? 'الهاتف' : 'Téléphone'}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{lang === 'ar' ? 'رقم الرخصة' : 'N° Permis'}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{lang === 'ar' ? 'صلاحية الرخصة' : 'Expiry Permis'}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{lang === 'ar' ? 'الحافلات' : 'Véhicules'}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{lang === 'ar' ? 'الحالة' : 'Statut'}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {drivers.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                        {d.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div>{d.fullName}</div>
                        {d.cinNumber && <div className="text-xs text-gray-400">{d.cinNumber}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{d.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{d.licenseNumber || '—'}</td>
                  <td className="px-4 py-3">
                    {d.licenseExpiry ? (
                      <span className={`text-xs font-medium ${isExpired(d.licenseExpiry) ? 'text-red-500' : isExpiringSoon(d.licenseExpiry) ? 'text-amber-500' : 'text-gray-600 dark:text-gray-400'}`}>
                        {isExpired(d.licenseExpiry) && '⚠ '}
                        {new Date(d.licenseExpiry).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA')}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{d._count?.vehicles ?? 0}</td>
                  <td className="px-4 py-3"><Badge color={STATUS_COLORS[d.status] || 'gray'}>{d.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={14} /></button>
                      <button onClick={() => del(d.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'add' ? (lang === 'ar' ? 'إضافة سائق' : 'Ajouter un conducteur') : (lang === 'ar' ? 'تعديل السائق' : 'Modifier le conducteur')}
          onClose={() => setModal(null)}
        >
          <div className="space-y-3">
            <div><label className="label">{lang === 'ar' ? 'الاسم الكامل' : 'Nom complet'} *</label><input className="input" value={form.fullName} onChange={e => setForm(p => ({...p, fullName: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{lang === 'ar' ? 'الهاتف' : 'Téléphone'}</label><input className="input" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} /></div>
              <div><label className="label">{lang === 'ar' ? 'رقم البطاقة الوطنية' : 'N° CIN'}</label><input className="input" value={form.cinNumber} onChange={e => setForm(p => ({...p, cinNumber: e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{lang === 'ar' ? 'رقم رخصة القيادة' : 'N° Permis'}</label><input className="input" value={form.licenseNumber} onChange={e => setForm(p => ({...p, licenseNumber: e.target.value}))} /></div>
              <div><label className="label">{lang === 'ar' ? 'تاريخ انتهاء الرخصة' : 'Expiry Permis'}</label><input className="input" type="date" value={form.licenseExpiry} onChange={e => setForm(p => ({...p, licenseExpiry: e.target.value}))} /></div>
            </div>
            <div><label className="label">{lang === 'ar' ? 'العنوان' : 'Adresse'}</label><input className="input" value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} /></div>
            <div>
              <label className="label">{lang === 'ar' ? 'الحالة' : 'Statut'}</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                <option value="ACTIVE">{lang === 'ar' ? 'نشط' : 'Actif'}</option>
                <option value="INACTIVE">{lang === 'ar' ? 'غير نشط' : 'Inactif'}</option>
                <option value="ON_LEAVE">{lang === 'ar' ? 'في إجازة' : 'En congé'}</option>
              </select>
            </div>
            <div><label className="label">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={submit} className="btn-primary flex-1">{lang === 'ar' ? 'حفظ' : 'Enregistrer'}</button>
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">{lang === 'ar' ? 'إلغاء' : 'Annuler'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── VEHICLES TAB ──────────────────────────────────────────────────────────────

const VehiclesTab: React.FC<{ lang: string; t: (k: string) => string }> = ({ lang, t }) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers,  setDrivers]  = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState({ name: '', plateNumber: '', capacity: '20', driverId: '', driverName: '', driverPhone: '', status: 'ACTIVE', notes: '' });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      transportApi.getVehicles(),
      transportApi.getDrivers(),
    ]).then(([vr, dr]) => { setVehicles(vr.data); setDrivers(dr.data); }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const emptyForm = { name: '', plateNumber: '', capacity: '20', driverId: '', driverName: '', driverPhone: '', status: 'ACTIVE', notes: '' };
  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal('add'); };
  const openEdit = (v: any) => {
    setForm({ name: v.name, plateNumber: v.plateNumber, capacity: String(v.capacity), driverId: v.driverId || '', driverName: v.driverName || '', driverPhone: v.driverPhone || '', status: v.status, notes: v.notes || '' });
    setEditing(v); setModal('edit');
  };

  const handleDriverChange = (driverId: string) => {
    const d = drivers.find(dr => dr.id === driverId);
    setForm(p => ({ ...p, driverId, driverName: d ? d.fullName : '', driverPhone: d ? (d.phone || '') : '' }));
  };

  const submit = async () => {
    try {
      if (editing) await transportApi.updateVehicle(editing.id, form);
      else         await transportApi.createVehicle(form);
      setModal(null); load();
    } catch {}
  };

  const del = async (id: string) => {
    if (!confirm(t('transport.confirmDelete'))) return;
    await transportApi.deleteVehicle(id); load();
  };

  const statusBadge = (s: string) => s === 'ACTIVE'
    ? <Badge color="green">{t('transport.vehicles.statuses.ACTIVE')}</Badge>
    : <Badge color="amber">{t('transport.vehicles.statuses.MAINTENANCE')}</Badge>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('transport.vehicles.title')}</h3>
        <button onClick={openAdd} className="btn-primary text-sm gap-1.5"><Plus size={15} />{t('transport.vehicles.add')}</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
      ) : vehicles.length === 0 ? (
        <div className="card p-10 text-center text-gray-400"><Bus size={40} className="mx-auto mb-3 opacity-30" />{t('transport.vehicles.noVehicles')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left rtl:text-right">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.vehicles.name')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.vehicles.plateNumber')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.vehicles.capacity')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.vehicles.driverName')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.vehicles.status')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400 text-right rtl:text-left">{''}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {vehicles.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2"><Bus size={15} className="text-blue-500" />{v.name}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">{v.plateNumber}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.capacity} <span className="text-xs text-gray-400">{t('transport.vehicles.students')}</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    <div>{v.driverName || '—'}</div>
                    {v.driverPhone && <div className="text-xs text-gray-400">{v.driverPhone}</div>}
                  </td>
                  <td className="px-4 py-3">{statusBadge(v.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={14} /></button>
                      <button onClick={() => del(v.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? t('transport.vehicles.add') : t('transport.vehicles.edit')} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('transport.vehicles.name')} *</label><input className="input" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} /></div>
              <div><label className="label">{t('transport.vehicles.plateNumber')} *</label><input className="input" value={form.plateNumber} onChange={e => setForm(p => ({...p, plateNumber: e.target.value}))} /></div>
            </div>
            <div><label className="label">{t('transport.vehicles.capacity')}</label><input className="input" type="number" min="1" value={form.capacity} onChange={e => setForm(p => ({...p, capacity: e.target.value}))} /></div>
            <div>
              <label className="label">{t('transport.vehicles.driverName')}</label>
              <select className="input" value={form.driverId} onChange={e => handleDriverChange(e.target.value)}>
                <option value="">{lang === 'ar' ? '— بدون سائق —' : '— Aucun conducteur —'}</option>
                {drivers.filter(d => d.status === 'ACTIVE').map(d => (
                  <option key={d.id} value={d.id}>{d.fullName}{d.phone ? ` — ${d.phone}` : ''}</option>
                ))}
              </select>
              {form.driverId && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Phone size={11} />{form.driverPhone || (lang === 'ar' ? 'لا يوجد هاتف' : 'Pas de téléphone')}
                </p>
              )}
            </div>
            <div>
              <label className="label">{t('transport.vehicles.status')}</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({...p, status: e.target.value}))}>
                <option value="ACTIVE">{t('transport.vehicles.statuses.ACTIVE')}</option>
                <option value="MAINTENANCE">{t('transport.vehicles.statuses.MAINTENANCE')}</option>
              </select>
            </div>
            <div><label className="label">{t('transport.vehicles.notes')}</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={submit} className="btn-primary flex-1">{t('common.save') || 'Save'}</button>
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">{t('common.cancel') || 'Cancel'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── STUDENTS TAB ──────────────────────────────────────────────────────────────

const StudentsTab: React.FC<{ lang: string; t: (k: string) => string }> = ({ lang, t }) => {
  const [students, setStudents]   = useState<any[]>([]);
  const [vehicles, setVehicles]   = useState<any[]>([]);
  const [routes, setRoutes]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modal, setModal]         = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing]     = useState<any>(null);
  const emptyForm = { fullName: '', school: '', address: '', phone: '', parentName: '', parentPhone: '', assignedVehicleId: '', routeId: '', isActive: true };
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      transportApi.getStudents({ search: search || undefined }),
      transportApi.getVehicles(),
      transportApi.getRoutes(),
    ]).then(([s, v, r]) => { setStudents(s.data); setVehicles(v.data); setRoutes(r.data); }).catch(() => {}).finally(() => setLoading(false));
  }, [search]);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal('add'); };
  const openEdit = (s: any) => { setForm({ fullName: s.fullName, school: s.school || '', address: s.address || '', phone: s.phone || '', parentName: s.parentName || '', parentPhone: s.parentPhone || '', assignedVehicleId: s.assignedVehicleId || '', routeId: s.routeId || '', isActive: s.isActive }); setEditing(s); setModal('edit'); };

  const submit = async () => {
    try {
      const payload = { ...form, assignedVehicleId: form.assignedVehicleId || null, routeId: form.routeId || null };
      if (editing) await transportApi.updateStudent(editing.id, payload);
      else         await transportApi.createStudent(payload);
      setModal(null); load();
    } catch {}
  };

  const del = async (id: string) => {
    if (!confirm(t('transport.confirmDelete'))) return;
    await transportApi.deleteStudent(id); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('transport.students.title')}</h3>
        <div className="flex items-center gap-2">
          <input className="input py-1.5 text-sm w-44" placeholder={`${t('common.search') || 'Search'}...`} value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={openAdd} className="btn-primary text-sm gap-1.5"><Plus size={15} />{t('transport.students.add')}</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
      ) : students.length === 0 ? (
        <div className="card p-10 text-center text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30" />{t('transport.students.noStudents')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left rtl:text-right">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.students.fullName')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.students.school')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.students.assignedVehicle')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.students.assignedRoute')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.students.status')}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{''}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{s.fullName}</div>
                    {s.phone && <div className="text-xs text-gray-400 flex items-center gap-1"><Phone size={10} />{s.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.school || '—'}</td>
                  <td className="px-4 py-3">
                    {s.vehicle ? <Badge color="blue">{s.vehicle.name}</Badge> : <span className="text-gray-400 text-xs">{t('transport.students.noVehicle')}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.route ? <Badge color="purple">{s.route.routeName}</Badge> : <span className="text-gray-400 text-xs">{t('transport.students.noRoute')}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {s.isActive ? <Badge color="green">{t('transport.students.active')}</Badge> : <Badge color="gray">{t('transport.students.inactive')}</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={14} /></button>
                      <button onClick={() => del(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? t('transport.students.add') : t('transport.students.edit')} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div><label className="label">{t('transport.students.fullName')} *</label><input className="input" value={form.fullName} onChange={e => setForm(p => ({...p, fullName: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('transport.students.school')}</label><input className="input" value={form.school} onChange={e => setForm(p => ({...p, school: e.target.value}))} /></div>
              <div><label className="label">{t('transport.students.phone')}</label><input className="input" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} /></div>
            </div>
            <div><label className="label">{t('transport.students.address')}</label><input className="input" value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('transport.students.parentName')}</label><input className="input" value={form.parentName} onChange={e => setForm(p => ({...p, parentName: e.target.value}))} /></div>
              <div><label className="label">{t('transport.students.parentPhone')}</label><input className="input" value={form.parentPhone} onChange={e => setForm(p => ({...p, parentPhone: e.target.value}))} /></div>
            </div>
            <div>
              <label className="label">{t('transport.students.assignedVehicle')}</label>
              <select className="input" value={form.assignedVehicleId} onChange={e => setForm(p => ({...p, assignedVehicleId: e.target.value}))}>
                <option value="">{t('transport.students.noVehicle')}</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} — {v.plateNumber}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('transport.students.assignedRoute')}</label>
              <select className="input" value={form.routeId} onChange={e => setForm(p => ({...p, routeId: e.target.value}))}>
                <option value="">{t('transport.students.noRoute')}</option>
                {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(p => ({...p, isActive: e.target.checked}))} />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">{t('transport.students.active')}</label>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={submit} className="btn-primary flex-1">{t('common.save') || 'Save'}</button>
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">{t('common.cancel') || 'Cancel'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── ROUTES TAB ────────────────────────────────────────────────────────────────

const RoutesTab: React.FC<{ lang: string; t: (k: string) => string }> = ({ lang, t }) => {
  const [routes, setRoutes]     = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing]   = useState<any>(null);
  const empty = { routeName: '', stops: '', assignedVehicleId: '', notes: '' };
  const [form, setForm] = useState(empty);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([transportApi.getRoutes(), transportApi.getVehicles()])
      .then(([r, v]) => { setRoutes(r.data); setVehicles(v.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(empty); setEditing(null); setModal('add'); };
  const openEdit = (r: any) => { setForm({ routeName: r.routeName, stops: (r.stops || []).join(', '), assignedVehicleId: r.assignedVehicleId || '', notes: r.notes || '' }); setEditing(r); setModal('edit'); };

  const submit = async () => {
    try {
      const payload = { ...form, stops: form.stops.split(',').map((s: string) => s.trim()).filter(Boolean), assignedVehicleId: form.assignedVehicleId || null };
      if (editing) await transportApi.updateRoute(editing.id, payload);
      else         await transportApi.createRoute(payload);
      setModal(null); load();
    } catch {}
  };

  const del = async (id: string) => {
    if (!confirm(t('transport.confirmDelete'))) return;
    await transportApi.deleteRoute(id); load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('transport.routes.title')}</h3>
        <button onClick={openAdd} className="btn-primary text-sm gap-1.5"><Plus size={15} />{t('transport.routes.add')}</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
      ) : routes.length === 0 ? (
        <div className="card p-10 text-center text-gray-400"><MapPin size={40} className="mx-auto mb-3 opacity-30" />{t('transport.routes.noRoutes')}</div>
      ) : (
        <div className="grid gap-3">
          {routes.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={16} className="text-purple-500 flex-shrink-0" />
                    <span className="font-semibold text-gray-900 dark:text-white">{r.routeName}</span>
                    {r.vehicle && <Badge color="blue">{r.vehicle.name}</Badge>}
                    <Badge color="gray">{r._count?.students || 0} {t('transport.routes.students')}</Badge>
                  </div>
                  {r.stops?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.stops.map((stop: string, i: number) => (
                        <span key={i} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs flex items-center justify-center font-medium">{i + 1}</span>
                          {stop}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ms-3">
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Pencil size={14} /></button>
                  <button onClick={() => del(r.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === 'add' ? t('transport.routes.add') : t('transport.routes.edit')} onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div><label className="label">{t('transport.routes.routeName')} *</label><input className="input" value={form.routeName} onChange={e => setForm(p => ({...p, routeName: e.target.value}))} /></div>
            <div>
              <label className="label">{t('transport.routes.stops')}</label>
              <textarea className="input" rows={3} placeholder={t('transport.routes.stopsPlaceholder')} value={form.stops} onChange={e => setForm(p => ({...p, stops: e.target.value}))} />
            </div>
            <div>
              <label className="label">{t('transport.routes.assignedVehicle')}</label>
              <select className="input" value={form.assignedVehicleId} onChange={e => setForm(p => ({...p, assignedVehicleId: e.target.value}))}>
                <option value="">{t('transport.selectVehicle')}</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} — {v.plateNumber}</option>)}
              </select>
            </div>
            <div><label className="label">{t('transport.routes.notes')}</label><textarea className="input" rows={2} value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={submit} className="btn-primary flex-1">{t('common.save') || 'Save'}</button>
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">{t('common.cancel') || 'Cancel'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── SUBSCRIPTIONS TAB ─────────────────────────────────────────────────────────

const SubscriptionsTab: React.FC<{ lang: string; t: (k: string) => string }> = ({ lang, t }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [subs, setSubs]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkFee, setBulkFee]     = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const MONTHS = lang === 'ar' ? MONTHS_AR : MONTHS_FR;

  const load = useCallback(() => {
    setLoading(true);
    transportApi.getSubscriptions({ month, year }).then(r => setSubs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [month, year]);
  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (sub: any) => {
    const newStatus = sub.status === 'PAID' ? 'UNPAID' : 'PAID';
    await transportApi.updateSubscription(sub.id, { status: newStatus });
    load();
  };

  const bulk = async () => {
    if (!bulkFee) return;
    setBulkLoading(true);
    try {
      await transportApi.bulkCreateSubscriptions({ month, year, monthlyFee: bulkFee });
      setBulkModal(false); setBulkFee(''); load();
    } catch {} finally { setBulkLoading(false); }
  };

  const paid   = subs.filter(s => s.status === 'PAID').length;
  const unpaid = subs.filter(s => s.status === 'UNPAID').length;
  const total  = subs.reduce((acc, s) => acc + (s.status === 'PAID' ? s.monthlyFee : 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={16} /></button>
          <span className="font-semibold text-gray-900 dark:text-white w-32 text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={16} /></button>
        </div>
        <button onClick={() => setBulkModal(true)} className="btn-primary text-sm gap-1.5"><Plus size={15} />{t('transport.subscriptions.bulkGenerate')}</button>
      </div>

      {subs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="card p-3 text-center"><div className="text-xl font-bold text-emerald-600">{paid}</div><div className="text-xs text-gray-500">{t('transport.subscriptions.statuses.PAID')}</div></div>
          <div className="card p-3 text-center"><div className="text-xl font-bold text-red-600">{unpaid}</div><div className="text-xs text-gray-500">{t('transport.subscriptions.statuses.UNPAID')}</div></div>
          <div className="card p-3 text-center"><div className="text-xl font-bold text-blue-600">{total.toLocaleString()} MAD</div><div className="text-xs text-gray-500">{t('transport.stats.monthRevenue')}</div></div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
      ) : subs.length === 0 ? (
        <div className="card p-10 text-center text-gray-400"><CreditCard size={40} className="mx-auto mb-3 opacity-30" />{t('transport.subscriptions.noSubs')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left rtl:text-right">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.students.fullName')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.students.school')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.subscriptions.monthlyFee')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.subscriptions.status')}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{''}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {subs.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.student?.fullName}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{s.student?.school || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{s.monthlyFee} MAD</td>
                  <td className="px-4 py-3">
                    {s.status === 'PAID'
                      ? <Badge color="green"><CheckCircle2 size={11} className="me-1" />{t('transport.subscriptions.statuses.PAID')}</Badge>
                      : <Badge color="red"><XCircle size={11} className="me-1" />{t('transport.subscriptions.statuses.UNPAID')}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right rtl:text-left">
                    <button onClick={() => toggleStatus(s)} className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400">
                      {s.status === 'PAID' ? t('transport.subscriptions.markUnpaid') : t('transport.subscriptions.markPaid')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bulkModal && (
        <Modal title={t('transport.subscriptions.bulkGenerate')} onClose={() => setBulkModal(false)}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{MONTHS[month - 1]} {year}</p>
          <div className="mb-4"><label className="label">{t('transport.subscriptions.monthlyFee')} (MAD) *</label><input className="input" type="number" min="0" value={bulkFee} onChange={e => setBulkFee(e.target.value)} /></div>
          <div className="flex gap-2">
            <button onClick={bulk} disabled={bulkLoading} className="btn-primary flex-1">{bulkLoading ? <Loader2 size={15} className="animate-spin" /> : t('transport.subscriptions.generate')}</button>
            <button onClick={() => setBulkModal(false)} className="btn-secondary flex-1">{t('common.cancel') || 'Cancel'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── PAYMENTS TAB ──────────────────────────────────────────────────────────────

const PaymentsTab: React.FC<{ lang: string; t: (k: string) => string }> = ({ lang, t }) => {
  const now = new Date();
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [year, setYear]       = useState(now.getFullYear());
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ studentId: '', amount: '', date: new Date().toISOString().split('T')[0], method: 'CASH', notes: '' });

  const MONTHS = lang === 'ar' ? MONTHS_AR : MONTHS_FR;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      transportApi.getPayments({ month, year }),
      transportApi.getStudents(),
    ]).then(([p, s]) => { setPayments(p.data); setStudents(s.data); }).catch(() => {}).finally(() => setLoading(false));
  }, [month, year]);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    try {
      await transportApi.createPayment(form);
      setModal(false); setForm({ studentId: '', amount: '', date: new Date().toISOString().split('T')[0], method: 'CASH', notes: '' }); load();
    } catch {}
  };

  const del = async (id: string) => {
    if (!confirm(t('transport.confirmDelete'))) return;
    await transportApi.deletePayment(id); load();
  };

  const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft size={16} /></button>
          <span className="font-semibold text-gray-900 dark:text-white w-32 text-center">{MONTHS[month - 1]} {year}</span>
          <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight size={16} /></button>
        </div>
        <div className="flex items-center gap-3">
          {payments.length > 0 && <span className="text-sm font-semibold text-emerald-600">{totalRevenue.toLocaleString()} MAD</span>}
          <button onClick={() => setModal(true)} className="btn-primary text-sm gap-1.5"><Plus size={15} />{t('transport.payments.add')}</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
      ) : payments.length === 0 ? (
        <div className="card p-10 text-center text-gray-400"><CreditCard size={40} className="mx-auto mb-3 opacity-30" />{t('transport.payments.noPayments')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left rtl:text-right">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.payments.student')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.payments.amount')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.payments.date')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.payments.method')}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{''}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.student?.fullName}</td>
                  <td className="px-4 py-3"><span className="font-semibold text-emerald-600">+{p.amount} MAD</span></td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(p.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}</td>
                  <td className="px-4 py-3"><Badge color="gray">{t(`transport.payments.methods.${p.method}`) || p.method}</Badge></td>
                  <td className="px-4 py-3 text-right rtl:text-left">
                    <button onClick={() => del(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={t('transport.payments.add')} onClose={() => setModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="label">{t('transport.payments.student')} *</label>
              <select className="input" value={form.studentId} onChange={e => setForm(p => ({...p, studentId: e.target.value}))}>
                <option value="">{t('transport.selectStudent')}</option>
                {students.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('transport.payments.amount')} (MAD) *</label><input className="input" type="number" min="0" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} /></div>
              <div><label className="label">{t('transport.payments.date')}</label><input className="input" type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            </div>
            <div>
              <label className="label">{t('transport.payments.method')}</label>
              <select className="input" value={form.method} onChange={e => setForm(p => ({...p, method: e.target.value}))}>
                {['CASH','TRANSFER','CHECK'].map(m => <option key={m} value={m}>{t(`transport.payments.methods.${m}`)}</option>)}
              </select>
            </div>
            <div><label className="label">{t('transport.payments.notes')}</label><input className="input" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={submit} className="btn-primary flex-1">{t('common.save') || 'Save'}</button>
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('common.cancel') || 'Cancel'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── ATTENDANCE TAB ────────────────────────────────────────────────────────────

const AttendanceTab: React.FC<{ lang: string; t: (k: string) => string }> = ({ lang, t }) => {
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [local, setLocal]       = useState<Record<string, string>>({});

  useEffect(() => {
    transportApi.getVehicles().then(r => setVehicles(r.data)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    transportApi.getAttendance({ date, vehicleId: vehicleId || undefined })
      .then(r => {
        setData(r.data);
        const map: Record<string, string> = {};
        r.data.students.forEach((s: any) => { if (s.attendance) map[s.student.id] = s.attendance.status; });
        setLocal(map);
      }).catch(() => {}).finally(() => setLoading(false));
  }, [date, vehicleId]);
  useEffect(() => { load(); }, [load]);

  const toggle = (studentId: string) => {
    setLocal(p => ({ ...p, [studentId]: p[studentId] === 'PRESENT' ? 'ABSENT' : p[studentId] === 'ABSENT' ? 'PRESENT' : 'PRESENT' }));
  };

  const markAll = () => {
    if (!data) return;
    const map: Record<string, string> = {};
    data.students.forEach((s: any) => { map[s.student.id] = 'PRESENT'; });
    setLocal(map);
  };

  const saveAll = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const records = Object.entries(local).map(([studentId, status]) => ({ studentId, status }));
      await transportApi.bulkMarkAttendance({ date, records });
      load();
    } catch {} finally { setSaving(false); }
  };

  const presentCount = Object.values(local).filter(s => s === 'PRESENT').length;
  const absentCount  = Object.values(local).filter(s => s === 'ABSENT').length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input type="date" className="input py-1.5 text-sm w-40" value={date} onChange={e => setDate(e.target.value)} />
        <select className="input py-1.5 text-sm w-44" value={vehicleId} onChange={e => setVehicleId(e.target.value)}>
          <option value="">{t('transport.attendance.allVehicles')}</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        {data?.students.length > 0 && (
          <div className="flex items-center gap-2 ms-auto">
            <span className="text-xs text-emerald-600 font-medium">{presentCount} {t('transport.attendance.present')}</span>
            <span className="text-xs text-red-500 font-medium">{absentCount} {t('transport.attendance.absent')}</span>
            <button onClick={markAll} className="btn-secondary text-xs py-1.5 px-3">{t('transport.attendance.markAll')}</button>
            <button onClick={saveAll} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
              {saving ? <Loader2 size={13} className="animate-spin" /> : t('transport.attendance.saveAll')}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
      ) : !data || data.students.length === 0 ? (
        <div className="card p-10 text-center text-gray-400"><Calendar size={40} className="mx-auto mb-3 opacity-30" />{t('transport.attendance.noStudents')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left rtl:text-right">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.students.fullName')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.students.school')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.attendance.vehicle')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.attendance.title')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.students.map(({ student }: any) => {
                const status = local[student.id];
                return (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{student.fullName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{student.school || '—'}</td>
                    <td className="px-4 py-3">
                      {student.vehicle ? <Badge color="blue">{student.vehicle.name}</Badge> : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(student.id)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
                          status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700' :
                          status === 'ABSENT'  ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700' :
                          'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600'
                        }`}
                      >
                        {status === 'PRESENT' ? <CheckCircle2 size={13} /> : status === 'ABSENT' ? <XCircle size={13} /> : <Clock size={13} />}
                        {status === 'PRESENT' ? t('transport.attendance.present') : status === 'ABSENT' ? t('transport.attendance.absent') : t('transport.attendance.notMarked')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── EXPENSES TAB ──────────────────────────────────────────────────────────────

const ExpensesTab: React.FC<{ lang: string; t: (k: string) => string }> = ({ lang, t }) => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [form, setForm]         = useState({ vehicleId: '', category: 'FUEL', amount: '', date: new Date().toISOString().split('T')[0], description: '' });

  const CAT_ICONS: Record<string, React.ReactNode> = {
    FUEL:        <Fuel size={14} />,
    MAINTENANCE: <Wrench size={14} />,
    INSURANCE:   <ShieldCheck size={14} />,
    OTHER:       <Package size={14} />,
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([transportApi.getExpenses(), transportApi.getVehicles()])
      .then(([e, v]) => { setExpenses(e.data); setVehicles(v.data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    try {
      await transportApi.createExpense({ ...form, vehicleId: form.vehicleId || null });
      setModal(false); setForm({ vehicleId: '', category: 'FUEL', amount: '', date: new Date().toISOString().split('T')[0], description: '' }); load();
    } catch {}
  };

  const del = async (id: string) => {
    if (!confirm(t('transport.confirmDelete'))) return;
    await transportApi.deleteExpense(id); load();
  };

  const total = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('transport.expenses.title')}</h3>
          {expenses.length > 0 && <p className="text-sm text-red-500 font-medium">{total.toLocaleString()} MAD {lang === 'ar' ? 'إجمالي' : 'total'}</p>}
        </div>
        <button onClick={() => setModal(true)} className="btn-primary text-sm gap-1.5"><Plus size={15} />{t('transport.expenses.add')}</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={28} className="animate-spin text-primary-500" /></div>
      ) : expenses.length === 0 ? (
        <div className="card p-10 text-center text-gray-400"><Wrench size={40} className="mx-auto mb-3 opacity-30" />{t('transport.expenses.noExpenses')}</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr className="text-left rtl:text-right">
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.expenses.category')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.expenses.amount')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.expenses.date')}</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">{t('transport.expenses.description')}</th>
                <th className="px-4 py-3 text-right rtl:text-left">{''}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-500">{CAT_ICONS[e.category]}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{t(`transport.expenses.categories.${e.category}`)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-red-500">-{e.amount} MAD</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(e.date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-FR')}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{e.description || '—'}</td>
                  <td className="px-4 py-3 text-right rtl:text-left">
                    <button onClick={() => del(e.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={t('transport.expenses.add')} onClose={() => setModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="label">{t('transport.expenses.category')} *</label>
              <select className="input" value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}>
                {['FUEL','MAINTENANCE','INSURANCE','OTHER'].map(c => <option key={c} value={c}>{t(`transport.expenses.categories.${c}`)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('transport.expenses.vehicle')}</label>
              <select className="input" value={form.vehicleId} onChange={e => setForm(p => ({...p, vehicleId: e.target.value}))}>
                <option value="">{t('transport.all')}</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">{t('transport.expenses.amount')} (MAD) *</label><input className="input" type="number" min="0" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} /></div>
              <div><label className="label">{t('transport.expenses.date')}</label><input className="input" type="date" value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} /></div>
            </div>
            <div><label className="label">{t('transport.expenses.description')}</label><input className="input" value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={submit} className="btn-primary flex-1">{t('common.save') || 'Save'}</button>
              <button onClick={() => setModal(false)} className="btn-secondary flex-1">{t('common.cancel') || 'Cancel'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'drivers' | 'vehicles' | 'students' | 'routes' | 'subscriptions' | 'payments' | 'attendance' | 'expenses';

export const TransportPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { hasModule } = useAuth();
  const [stats, setStats]   = useState<any>(null);
  const [tab, setTab]       = useState<Tab>('overview');

  useEffect(() => {
    if (hasModule('TRANSPORT')) {
      transportApi.getStats().then(r => setStats(r.data)).catch(() => {});
    }
  }, []);

  if (!hasModule('TRANSPORT')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center px-4">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-4">
          <Bus size={32} className="text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('transport.title')}</h2>
        <p className="text-gray-500 max-w-sm">{t('transport.noModule')}</p>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',      label: t('transport.tabs.overview'),      icon: <TrendingUp size={15} /> },
    { id: 'drivers',       label: lang === 'ar' ? 'السائقون' : 'Conducteurs', icon: <User size={15} /> },
    { id: 'vehicles',      label: t('transport.tabs.vehicles'),      icon: <Bus size={15} /> },
    { id: 'students',      label: t('transport.tabs.students'),      icon: <Users size={15} /> },
    { id: 'routes',        label: t('transport.tabs.routes'),        icon: <MapPin size={15} /> },
    { id: 'subscriptions', label: t('transport.tabs.subscriptions'), icon: <Calendar size={15} /> },
    { id: 'payments',      label: t('transport.tabs.payments'),      icon: <CreditCard size={15} /> },
    { id: 'attendance',    label: t('transport.tabs.attendance'),    icon: <CheckCircle2 size={15} /> },
    { id: 'expenses',      label: t('transport.tabs.expenses'),      icon: <TrendingDown size={15} /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title flex items-center gap-2"><Bus size={22} className="text-primary-500" />{t('transport.title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('transport.subtitle')}</p>
        </div>
      </div>

      {/* Stats overview (always visible) */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Users size={18} />}      label={t('transport.stats.totalStudents')}  value={stats.totalStudents}  color="blue" />
          <StatCard icon={<Bus size={18} />}         label={t('transport.stats.totalVehicles')}  value={stats.totalVehicles}  color="teal" />
          <StatCard icon={<CheckCircle2 size={18} />} label={t('transport.stats.paidSubs')}      value={stats.paidSubs}       color="emerald" />
          <StatCard icon={<XCircle size={18} />}    label={t('transport.stats.unpaidSubs')}     value={stats.unpaidSubs}     color="red" />
          <StatCard icon={<MapPin size={18} />}      label={t('transport.stats.totalRoutes')}    value={stats.totalRoutes}    color="purple" />
          <StatCard icon={<TrendingUp size={18} />} label={t('transport.stats.monthRevenue')}   value={`${(stats.monthRevenue || 0).toLocaleString()} MAD`} color="amber" />
          <StatCard icon={<TrendingDown size={18} />} label={t('transport.stats.activeVehicles')} value={stats.activeVehicles}  color="teal" />
          <StatCard icon={<Users size={18} />}      label={t('transport.stats.activeStudents')} value={stats.activeStudents} color="blue" />
          <StatCard icon={<User size={18} />}       label={lang === 'ar' ? 'السائقون النشطون' : 'Conducteurs actifs'} value={stats.totalDrivers ?? 0} color="purple" />
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
              tab === tb.id
                ? 'text-primary-600 border-b-2 border-primary-600 dark:text-primary-400 dark:border-primary-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tb.icon}{tb.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Bus size={16} className="text-blue-500" />{t('transport.tabs.vehicles')}</h3>
              <p className="text-gray-500 text-sm">{lang === 'ar' ? 'اضغط على تبويب الحافلات لإدارة الحافلات' : 'Cliquez sur l\'onglet Bus pour gérer les bus.'}</p>
            </div>
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Users size={16} className="text-purple-500" />{t('transport.tabs.students')}</h3>
              <p className="text-gray-500 text-sm">{lang === 'ar' ? 'اضغط على تبويب الطلاب لإدارة الطلاب' : 'Cliquez sur l\'onglet Élèves pour gérer les élèves.'}</p>
            </div>
          </div>
        )}
        {tab === 'drivers'       && <DriversTab       lang={lang} t={t} />}
        {tab === 'vehicles'      && <VehiclesTab      lang={lang} t={t} />}
        {tab === 'students'      && <StudentsTab      lang={lang} t={t} />}
        {tab === 'routes'        && <RoutesTab        lang={lang} t={t} />}
        {tab === 'subscriptions' && <SubscriptionsTab lang={lang} t={t} />}
        {tab === 'payments'      && <PaymentsTab      lang={lang} t={t} />}
        {tab === 'attendance'    && <AttendanceTab    lang={lang} t={t} />}
        {tab === 'expenses'      && <ExpensesTab      lang={lang} t={t} />}
      </div>
    </div>
  );
};
