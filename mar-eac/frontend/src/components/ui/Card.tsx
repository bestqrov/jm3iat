import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  flat?: boolean;
  onClick?: () => void;
}

const PADDING = { sm: 'p-3', md: 'p-4', lg: 'p-6' } as const;

export const Card: React.FC<CardProps> = ({ children, className = '', size = 'md', flat = false, onClick }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 ${PADDING[size]} ${flat ? '' : 'shadow-sm'} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
    onClick={onClick}
  >
    {children}
  </div>
);
