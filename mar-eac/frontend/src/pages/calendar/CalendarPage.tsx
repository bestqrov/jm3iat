import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
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

const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','ماي','يونيو','يوليوز','غشت','شتنبر','أكتوبر','نونبر','دجنبر'];
const FR_DAYS   = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const AR_DAYS   = ['أح','إث','ثل','أر','خم','جم','سب'];

export const CalendarPage: React.FC = () => {
  const { lang } = useLanguage();
  const [today]   = useState(new Date());
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events,  setEvents]  = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

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

  const DAYS = lang === 'ar' ? AR_DAYS : FR_DAYS;
  const MONTHS = lang === 'ar' ? AR_MONTHS : FR_MONTHS;

  const TYPE_LABEL: Record<string, string> = {
    meeting:  lang === 'ar' ? 'اجتماع' : 'Réunion',
    reminder: lang === 'ar' ? 'تذكير' : 'Rappel',
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
          <Calendar size={18} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{lang === 'ar' ? 'التقويم' : 'Calendrier'}</h2>
          <p className="text-xs text-gray-500">{lang === 'ar' ? 'اجتماعات، تذكيرات ومواعيد' : 'Réunions, rappels et échéances'}</p>
        </div>
      </div>

      <div className="card p-4">
        {/* Nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <h3 className="font-bold text-gray-900 dark:text-white">
            {MONTHS[current.getMonth()]} {current.getFullYear()}
          </h3>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayEvs = eventsOnDay(day);
            const isToday = today.getFullYear() === current.getFullYear() && today.getMonth() === current.getMonth() && today.getDate() === day;
            const isSel = selected === key;
            return (
              <div
                key={day}
                onClick={() => setSelected(isSel ? null : key)}
                className={`min-h-[52px] p-1 rounded-lg cursor-pointer border transition-colors ${
                  isSel ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' :
                  isToday ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/10' :
                  'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>{day}</span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayEvs.slice(0, 3).map(ev => (
                    <span key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ background: ev.color }} />
                  ))}
                  {dayEvs.length > 3 && <span className="text-[9px] text-gray-400">+{dayEvs.length - 3}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      {selected && (
        <div className="card p-4">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
            {lang === 'ar' ? `أحداث يوم ${selected}` : `Événements du ${selected}`}
          </h4>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-400">{lang === 'ar' ? 'لا أحداث' : 'Aucun événement'}</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <span className="w-2.5 h-2.5 mt-1 rounded-full flex-shrink-0" style={{ background: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{ev.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{TYPE_LABEL[ev.type] || ev.type}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(ev.date).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}</span>
                      {ev.meta?.location && <span className="flex items-center gap-1"><MapPin size={10} />{ev.meta.location}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />{lang === 'ar' ? 'اجتماع' : 'Réunion'}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />{lang === 'ar' ? 'تذكير' : 'Rappel'}</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />{lang === 'ar' ? 'تذكير عاجل' : 'Rappel urgent'}</span>
      </div>
    </div>
  );
};
