import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, Flag, Moon, ChevronDown, ChevronUp } from 'lucide-react';
import { calendarApi } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';

interface CalEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  color: string;
  link?: string;
  meta?: any;
}

interface Holiday {
  date: string; // YYYY-MM-DD
  nameAr: string;
  nameFr: string;
  type: 'national' | 'religious';
}

const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];
const FR_DAYS   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const AR_DAYS   = ['أح','إث','ثل','أر','خم','جم','سب'];

// ── Moroccan national holidays (fixed Gregorian date) ─────────────────────────
const NATIONAL_FIXED: { mmdd: string; nameAr: string; nameFr: string }[] = [
  { mmdd: '01-01', nameAr: 'رأس السنة الميلادية',          nameFr: 'Nouvel An' },
  { mmdd: '01-11', nameAr: 'ذكرى وثيقة الاستقلال',         nameFr: 'Manifeste de l\'Indépendance' },
  { mmdd: '05-01', nameAr: 'عيد الشغل',                    nameFr: 'Fête du Travail' },
  { mmdd: '07-30', nameAr: 'عيد العرش',                    nameFr: 'Fête du Trône' },
  { mmdd: '08-14', nameAr: 'استرداد وادي الذهب',            nameFr: 'Allégeance Oued Ed-Dahab' },
  { mmdd: '08-20', nameAr: 'ذكرى ثورة الملك والشعب',        nameFr: 'Révolution du Roi et du Peuple' },
  { mmdd: '08-21', nameAr: 'عيد الشباب',                   nameFr: 'Fête de la Jeunesse' },
  { mmdd: '11-06', nameAr: 'ذكرى المسيرة الخضراء',          nameFr: 'Marche Verte' },
  { mmdd: '11-18', nameAr: 'عيد الاستقلال',                 nameFr: 'Fête de l\'Indépendance' },
];

// ── Moroccan Islamic holidays (approximate Gregorian dates) ───────────────────
const RELIGIOUS_HOLIDAYS: Holiday[] = [
  // 2024
  { date: '2024-04-09', nameAr: 'عيد الفطر',                nameFr: 'Aïd al-Fitr',          type: 'religious' },
  { date: '2024-04-10', nameAr: 'عيد الفطر (اليوم الثاني)', nameFr: 'Aïd al-Fitr (2ème)',   type: 'religious' },
  { date: '2024-06-16', nameAr: 'عيد الأضحى',               nameFr: 'Aïd al-Adha',          type: 'religious' },
  { date: '2024-06-17', nameAr: 'عيد الأضحى (اليوم الثاني)',nameFr: 'Aïd al-Adha (2ème)',   type: 'religious' },
  { date: '2024-07-07', nameAr: 'رأس السنة الهجرية 1446',   nameFr: 'Nouvel An Hégirien',   type: 'religious' },
  { date: '2024-07-16', nameAr: 'عاشوراء',                  nameFr: 'Achoura',               type: 'religious' },
  { date: '2024-09-15', nameAr: 'المولد النبوي الشريف',      nameFr: 'Aïd al-Mawlid',        type: 'religious' },
  // 2025
  { date: '2025-03-30', nameAr: 'عيد الفطر',                nameFr: 'Aïd al-Fitr',          type: 'religious' },
  { date: '2025-03-31', nameAr: 'عيد الفطر (اليوم الثاني)', nameFr: 'Aïd al-Fitr (2ème)',   type: 'religious' },
  { date: '2025-06-06', nameAr: 'عيد الأضحى',               nameFr: 'Aïd al-Adha',          type: 'religious' },
  { date: '2025-06-07', nameAr: 'عيد الأضحى (اليوم الثاني)',nameFr: 'Aïd al-Adha (2ème)',   type: 'religious' },
  { date: '2025-06-26', nameAr: 'رأس السنة الهجرية 1447',   nameFr: 'Nouvel An Hégirien',   type: 'religious' },
  { date: '2025-07-05', nameAr: 'عاشوراء',                  nameFr: 'Achoura',               type: 'religious' },
  { date: '2025-09-04', nameAr: 'المولد النبوي الشريف',      nameFr: 'Aïd al-Mawlid',        type: 'religious' },
  // 2026
  { date: '2026-03-20', nameAr: 'عيد الفطر',                nameFr: 'Aïd al-Fitr',          type: 'religious' },
  { date: '2026-03-21', nameAr: 'عيد الفطر (اليوم الثاني)', nameFr: 'Aïd al-Fitr (2ème)',   type: 'religious' },
  { date: '2026-05-27', nameAr: 'عيد الأضحى',               nameFr: 'Aïd al-Adha',          type: 'religious' },
  { date: '2026-05-28', nameAr: 'عيد الأضحى (اليوم الثاني)',nameFr: 'Aïd al-Adha (2ème)',   type: 'religious' },
  { date: '2026-06-16', nameAr: 'رأس السنة الهجرية 1448',   nameFr: 'Nouvel An Hégirien',   type: 'religious' },
  { date: '2026-06-25', nameAr: 'عاشوراء',                  nameFr: 'Achoura',               type: 'religious' },
  { date: '2026-08-25', nameAr: 'المولد النبوي الشريف',      nameFr: 'Aïd al-Mawlid',        type: 'religious' },
  // 2027
  { date: '2027-03-09', nameAr: 'عيد الفطر',                nameFr: 'Aïd al-Fitr',          type: 'religious' },
  { date: '2027-03-10', nameAr: 'عيد الفطر (اليوم الثاني)', nameFr: 'Aïd al-Fitr (2ème)',   type: 'religious' },
  { date: '2027-05-16', nameAr: 'عيد الأضحى',               nameFr: 'Aïd al-Adha',          type: 'religious' },
  { date: '2027-05-17', nameAr: 'عيد الأضحى (اليوم الثاني)',nameFr: 'Aïd al-Adha (2ème)',   type: 'religious' },
  { date: '2027-06-06', nameAr: 'رأس السنة الهجرية 1449',   nameFr: 'Nouvel An Hégirien',   type: 'religious' },
  { date: '2027-06-15', nameAr: 'عاشوراء',                  nameFr: 'Achoura',               type: 'religious' },
  { date: '2027-08-14', nameAr: 'المولد النبوي الشريف',      nameFr: 'Aïd al-Mawlid',        type: 'religious' },
];

function buildNationalHolidays(year: number): Holiday[] {
  return NATIONAL_FIXED.map(h => ({
    date: `${year}-${h.mmdd}`,
    nameAr: h.nameAr,
    nameFr: h.nameFr,
    type: 'national' as const,
  }));
}

export const CalendarPage: React.FC = () => {
  const { lang } = useLanguage();
  const [today]   = useState(new Date());
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events,  setEvents]  = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const [showNational,  setShowNational]  = useState(true);
  const [showReligious, setShowReligious] = useState(true);
  const [listOpenNat,   setListOpenNat]   = useState(true);
  const [listOpenRel,   setListOpenRel]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const from = new Date(current.getFullYear(), current.getMonth(), 1).toISOString();
    const to   = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59).toISOString();
    try {
      const r = await calendarApi.getEvents(from, to);
      setEvents(r.data.events || []);
    } catch {} finally { setLoading(false); }
  }, [current]);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
  const firstDow    = new Date(current.getFullYear(), current.getMonth(), 1).getDay();

  // All holidays for current year
  const nationalHolidays = buildNationalHolidays(current.getFullYear());

  const holidaysOnDay = (dayKey: string): Holiday[] => {
    const result: Holiday[] = [];
    if (showNational)  result.push(...nationalHolidays.filter(h => h.date === dayKey));
    if (showReligious) result.push(...RELIGIOUS_HOLIDAYS.filter(h => h.date === dayKey));
    return result;
  };

  const eventsOnDay = (day: number) => {
    const d = new Date(current.getFullYear(), current.getMonth(), day);
    return events.filter(e => {
      const ed = new Date(e.date);
      return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth() && ed.getDate() === d.getDate();
    });
  };

  const selectedKey = selected;
  const selectedEvents = selectedKey
    ? events.filter(e => {
        const ed = new Date(e.date);
        const [y, m, dd] = selectedKey.split('-').map(Number);
        return ed.getFullYear() === y && ed.getMonth() === m - 1 && ed.getDate() === dd;
      })
    : [];
  const selectedHolidays = selectedKey ? holidaysOnDay(selectedKey) : [];

  const DAYS   = lang === 'ar' ? AR_DAYS   : FR_DAYS;
  const MONTHS = lang === 'ar' ? AR_MONTHS : FR_MONTHS;

  // Holidays for current month (for the list panel)
  const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
  const monthNational  = nationalHolidays.filter(h  => h.date.startsWith(monthKey));
  const monthReligious = RELIGIOUS_HOLIDAYS.filter(h => h.date.startsWith(monthKey));

  // All holidays for the year (for full list)
  const yearNational  = nationalHolidays;
  const yearReligious = RELIGIOUS_HOLIDAYS.filter(h => h.date.startsWith(String(current.getFullYear())));

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA', { day: 'numeric', month: 'long' });
  };

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-cyan-600 to-teal-500 p-5 shadow-lg">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 drop-shadow">
          <Calendar size={24} className="text-indigo-200" />
          {lang === 'ar' ? 'التقويم' : 'Calendrier'}
        </h2>
        <p className="text-indigo-100 text-sm mt-0.5 opacity-90">
          {lang === 'ar' ? 'اجتماعات، تذكيرات والأعياد' : 'Réunions, rappels et jours fériés'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Compact Calendar ── */}
        <div className="lg:col-span-2 card p-3">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white">
              {MONTHS[current.getMonth()]} {current.getFullYear()}
            </h3>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-0.5">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayEvs = eventsOnDay(day);
              const dayHols = holidaysOnDay(key);
              const isToday = today.getFullYear() === current.getFullYear() && today.getMonth() === current.getMonth() && today.getDate() === day;
              const isSel = selected === key;
              const hasNat = dayHols.some(h => h.type === 'national');
              const hasRel = dayHols.some(h => h.type === 'religious');

              return (
                <div
                  key={day}
                  onClick={() => setSelected(isSel ? null : key)}
                  className={`min-h-[38px] p-1 rounded-md cursor-pointer border transition-colors ${
                    isSel     ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' :
                    isToday   ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/10' :
                    hasNat    ? 'border-green-200 bg-green-50/60 dark:bg-green-900/10' :
                    hasRel    ? 'border-amber-200 bg-amber-50/60 dark:bg-amber-900/10' :
                    'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <span className={`text-[11px] font-semibold ${
                    isToday ? 'text-indigo-700 dark:text-indigo-300' :
                    hasNat  ? 'text-green-700 dark:text-green-400' :
                    hasRel  ? 'text-amber-700 dark:text-amber-400' :
                    'text-gray-700 dark:text-gray-300'
                  }`}>{day}</span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {hasNat && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" title="عيد وطني" />}
                    {hasRel && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="عيد ديني" />}
                    {dayEvs.slice(0, 2).map(ev => (
                      <span key={ev.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                    ))}
                    {(dayEvs.length > 2 || dayHols.length + dayEvs.length > 3) && (
                      <span className="text-[8px] text-gray-400 leading-none">+</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-500">
            {showNational  && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{lang === 'ar' ? 'عيد وطني' : 'Fête nationale'}</span>}
            {showReligious && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />{lang === 'ar' ? 'عيد ديني' : 'Fête religieuse'}</span>}
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" />{lang === 'ar' ? 'اجتماع' : 'Réunion'}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{lang === 'ar' ? 'تذكير' : 'Rappel'}</span>
          </div>
        </div>

        {/* ── Holidays panel ── */}
        <div className="space-y-3">

          {/* Toggle buttons */}
          <div className="card p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {lang === 'ar' ? 'إظهار على التقويم' : 'Afficher sur le calendrier'}
            </p>
            <button
              onClick={() => setShowNational(v => !v)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border-2 ${
                showNational ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              <Flag size={14} className={showNational ? 'text-green-600' : 'text-gray-400'} />
              {lang === 'ar' ? 'الأعياد الوطنية' : 'Fêtes nationales'}
              <span className={`ms-auto text-xs px-1.5 py-0.5 rounded-full font-bold ${showNational ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {yearNational.length}
              </span>
            </button>
            <button
              onClick={() => setShowReligious(v => !v)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border-2 ${
                showReligious ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'
              }`}
            >
              <Moon size={14} className={showReligious ? 'text-amber-500' : 'text-gray-400'} />
              {lang === 'ar' ? 'الأعياد الدينية' : 'Fêtes religieuses'}
              <span className={`ms-auto text-xs px-1.5 py-0.5 rounded-full font-bold ${showReligious ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {yearReligious.length}
              </span>
            </button>
          </div>

          {/* National holidays list */}
          {showNational && (
            <div className="card overflow-hidden">
              <button
                onClick={() => setListOpenNat(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/40 text-sm font-semibold text-green-800 dark:text-green-300"
              >
                <Flag size={13} className="text-green-600" />
                {lang === 'ar' ? 'الأعياد الوطنية' : 'Fêtes nationales'}
                <span className="ms-auto text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full">{yearNational.length}</span>
                {listOpenNat ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {listOpenNat && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-60 overflow-y-auto">
                  {yearNational.map((h, i) => {
                    const isThisMonth = h.date.startsWith(monthKey);
                    return (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 ${isThisMonth ? 'bg-green-50/70 dark:bg-green-900/10' : ''}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isThisMonth ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {lang === 'ar' ? h.nameAr : h.nameFr}
                          </p>
                          <p className="text-[10px] text-gray-400">{fmtDate(h.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Religious holidays list */}
          {showReligious && (
            <div className="card overflow-hidden">
              <button
                onClick={() => setListOpenRel(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40 text-sm font-semibold text-amber-800 dark:text-amber-300"
              >
                <Moon size={13} className="text-amber-500" />
                {lang === 'ar' ? 'الأعياد الدينية' : 'Fêtes religieuses'}
                <span className="ms-auto text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded-full">{yearReligious.length}</span>
                {listOpenRel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {listOpenRel && (
                <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-60 overflow-y-auto">
                  {yearReligious.map((h, i) => {
                    const isThisMonth = h.date.startsWith(monthKey);
                    return (
                      <div key={i} className={`flex items-center gap-2 px-3 py-2 ${isThisMonth ? 'bg-amber-50/70 dark:bg-amber-900/10' : ''}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isThisMonth ? 'bg-amber-500' : 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {lang === 'ar' ? h.nameAr : h.nameFr}
                          </p>
                          <p className="text-[10px] text-gray-400">{fmtDate(h.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Selected day detail */}
      {selected && (selectedEvents.length > 0 || selectedHolidays.length > 0) && (
        <div className="card p-4">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
            {lang === 'ar' ? `أحداث يوم ${selected}` : `Événements du ${selected}`}
          </h4>
          <div className="space-y-2">
            {selectedHolidays.map((h, i) => (
              <div key={`h-${i}`} className={`flex items-center gap-3 p-2.5 rounded-lg ${h.type === 'national' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'}`}>
                {h.type === 'national' ? <Flag size={14} className="text-green-600 flex-shrink-0" /> : <Moon size={14} className="text-amber-500 flex-shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{lang === 'ar' ? h.nameAr : h.nameFr}</p>
                  <p className="text-xs text-gray-500">{h.type === 'national' ? (lang === 'ar' ? 'عيد وطني' : 'Fête nationale') : (lang === 'ar' ? 'عيد ديني' : 'Fête religieuse')}</p>
                </div>
              </div>
            ))}
            {selectedEvents.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <span className="w-2.5 h-2.5 mt-1 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock size={10} />{new Date(ev.date).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}</span>
                    {ev.meta?.location && <span className="flex items-center gap-1"><MapPin size={10} />{ev.meta.location}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
