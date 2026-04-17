import React, { useEffect, useState } from 'react';
import { Bell, Menu, CreditCard } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { remindersApi } from '../../lib/api';
import { AssocCard } from '../AssocCard';

interface HeaderProps {
  onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/members': 'nav.members',
  '/meetings': 'nav.meetings',
  '/finance': 'nav.finance',
  '/documents': 'nav.documents',
  '/projects': 'nav.projects',
  '/water': 'nav.water',
  '/reports': 'nav.reports',
  '/requests': 'nav.requests',
  '/reminders': 'nav.reminders',
  '/settings': 'nav.settings',
  '/superadmin': 'nav.superadmin',
};

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, organization } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [showCard,     setShowCard]     = useState(false);

  const pageKey = Object.keys(pageTitles).find((k) => location.pathname.startsWith(k));
  const pageTitle = pageKey ? t(pageTitles[pageKey]) : '';

  useEffect(() => {
    if (!organization) return;
    remindersApi.getCount()
      .then((r) => setUnreadCount(r.data.count))
      .catch(() => {});
  }, [organization, location.pathname]);

  return (
    <>
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex-1">{pageTitle}</h1>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Electronic card button */}
        {organization && (
          <button
            onClick={() => setShowCard(true)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('nav.card') || 'Carte électronique'}
          >
            <CreditCard size={20} />
          </button>
        )}

        {/* Reminders bell */}
        {organization && (
          <Link
            to="/reminders"
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {/* User */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <span className="text-primary-700 dark:text-primary-400 font-semibold text-xs">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-gray-900 dark:text-white leading-none">{user?.name}</div>
            {organization && (
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-none mt-0.5">{organization.name}</div>
            )}
          </div>
        </div>
      </div>
    </header>

    {showCard && <AssocCard onClose={() => setShowCard(false)} />}
    </>
  );
};
