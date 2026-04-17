import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, Trash2, X, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { notificationsApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  titleAr?: string;
  body?: string;
  bodyAr?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle2 size={14} className="text-emerald-500" />,
  WARNING: <AlertTriangle size={14} className="text-amber-500" />,
  DANGER:  <AlertCircle size={14} className="text-red-500" />,
  INFO:    <Info size={14} className="text-blue-500" />,
};

export const NotificationsBell: React.FC = () => {
  const { lang } = useLanguage();
  const [open, setOpen]             = useState(false);
  const [items, setItems]           = useState<Notification[]>([]);
  const [unread, setUnread]         = useState(0);
  const [loading, setLoading]       = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const r = await notificationsApi.getAll();
      setItems(r.data.notifications || []);
      setUnread(r.data.unread || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Poll every 60s
  useEffect(() => {
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setItems(p => p.map(n => ({ ...n, isRead: true })));
    setUnread(0);
  };

  const markOne = async (id: string) => {
    await notificationsApi.markRead(id);
    setItems(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(p => Math.max(0, p - 1));
  };

  const removeOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationsApi.remove(id);
    setItems(p => p.filter(n => n.id !== id));
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return lang === 'ar' ? 'الآن' : 'À l\'instant';
    if (mins < 60) return lang === 'ar' ? `منذ ${mins} د` : `il y a ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return lang === 'ar' ? `منذ ${hrs} س` : `il y a ${hrs}h`;
    return lang === 'ar' ? `منذ ${Math.floor(hrs/24)} يوم` : `il y a ${Math.floor(hrs/24)}j`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) load(); }}
        className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-10 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">
              {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
              {unread > 0 && <span className="ms-1.5 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{unread}</span>}
            </span>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button onClick={markAllRead} title={lang === 'ar' ? 'قراءة الكل' : 'Tout lire'} className="p-1 rounded text-gray-400 hover:text-primary-600">
                  <CheckCheck size={15} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
            {loading && items.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">{lang === 'ar' ? 'جارٍ التحميل...' : 'Chargement...'}</div>
            )}
            {!loading && items.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-400">{lang === 'ar' ? 'لا توجد إشعارات' : 'Aucune notification'}</div>
            )}
            {items.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.isRead) markOne(n.id); if (n.link) window.location.href = n.link; }}
                className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
              >
                <div className="mt-0.5 flex-shrink-0">{TYPE_ICON[n.type] || TYPE_ICON.INFO}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                    {lang === 'ar' && n.titleAr ? n.titleAr : n.title}
                  </p>
                  {(n.body || n.bodyAr) && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {lang === 'ar' && n.bodyAr ? n.bodyAr : n.body}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                <button onClick={(e) => removeOne(n.id, e)} className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100">
                  <Trash2 size={12} />
                </button>
                {!n.isRead && <span className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-500" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
