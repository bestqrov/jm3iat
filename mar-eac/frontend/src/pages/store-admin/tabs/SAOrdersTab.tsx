import React from 'react';
import { FulfillmentTab } from '../../superadmin/tabs/FulfillmentTab';

export function SAOrdersTab() {
  return (
    <div>
      <h1 className="text-xl font-black text-gray-900 dark:text-white mb-4">الطلبات</h1>
      <FulfillmentTab />
    </div>
  );
}
