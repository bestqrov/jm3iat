import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title, value, icon, iconBg = 'bg-primary-100 dark:bg-primary-900/30',
  iconColor = 'text-primary-600 dark:text-primary-400', subtitle,
}) => (
  <div className="stat-card">
    <div className={`stat-icon ${iconBg}`}>
      <span className={iconColor}>{icon}</span>
    </div>
    <div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
    </div>
  </div>
);
