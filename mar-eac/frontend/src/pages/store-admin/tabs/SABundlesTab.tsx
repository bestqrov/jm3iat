import React from 'react';
import { BundlesTab } from '../../superadmin/tabs/BundlesTab';

export function SABundlesTab() {
  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-4">الباقات</h1>
      <BundlesTab />
    </div>
  );
}
