import React, { useState } from 'react';
import { Package, Tag, BarChart2, ShoppingCart, Gift, TrendingUp, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SAProductsTab }   from './tabs/SAProductsTab';
import { SACategoriesTab } from './tabs/SACategoriesTab';
import { SAStockTab }      from './tabs/SAStockTab';
import { SAOrdersTab }     from './tabs/SAOrdersTab';
import { SABundlesTab }    from './tabs/SABundlesTab';
import { SAReportsTab }    from './tabs/SAReportsTab';

type SATab = 'products' | 'categories' | 'stock' | 'orders' | 'bundles' | 'reports';

const NAV: { key: SATab; icon: React.ReactNode; labelAr: string }[] = [
  { key: 'products',   icon: <Package size={16} />,     labelAr: 'المنتجات' },
  { key: 'categories', icon: <Tag size={16} />,         labelAr: 'الفئات' },
  { key: 'stock',      icon: <BarChart2 size={16} />,   labelAr: 'المخزون' },
  { key: 'orders',     icon: <ShoppingCart size={16} />, labelAr: 'الطلبات' },
  { key: 'bundles',    icon: <Gift size={16} />,         labelAr: 'الباقات' },
  { key: 'reports',    icon: <TrendingUp size={16} />,   labelAr: 'التقارير' },
];

export function StoreAdminPage() {
  const [tab, setTab]   = useState<SATab>('products');
  const { logout }      = useAuth();
  const navigate        = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Sidebar */}
      <aside className="w-52 bg-indigo-950 flex-shrink-0 flex flex-col">
        <div className="px-4 py-5 border-b border-indigo-900">
          <div className="text-white font-black text-base">🏪 معرضنا</div>
          <div className="text-indigo-300 text-xs mt-0.5">مسؤول المتجر</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(item => (
            <button key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tab === item.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-300 hover:bg-indigo-900 hover:text-white'
              }`}>
              {item.icon}
              {item.labelAr}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-indigo-900">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-indigo-300 hover:text-red-400 hover:bg-indigo-900 transition-colors">
            <LogOut size={15} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {tab === 'products'   && <SAProductsTab />}
          {tab === 'categories' && <SACategoriesTab />}
          {tab === 'stock'      && <SAStockTab />}
          {tab === 'orders'     && <SAOrdersTab />}
          {tab === 'bundles'    && <SABundlesTab />}
          {tab === 'reports'    && <SAReportsTab />}
        </div>
      </main>
    </div>
  );
}
