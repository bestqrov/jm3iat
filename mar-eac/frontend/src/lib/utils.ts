export const formatDate = (date: string | Date, lang = 'fr') => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-MA' : 'fr-MA', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

export const formatCurrency = (amount: number, lang = 'fr') => {
  if (amount === undefined || amount === null) return '-';
  return `${amount.toFixed(2)} ${lang === 'ar' ? 'درهم' : 'MAD'}`;
};

export const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(' ');

export const getStatusBadge = (status: string): string => {
  const map: Record<string, string> = {
    ACTIVE: 'badge-green', COMPLETED: 'badge-green', APPROVED: 'badge-green', paid: 'badge-green',
    IN_PROGRESS: 'badge-blue', TRIAL: 'badge-blue', SCHEDULED: 'badge-blue',
    PENDING: 'badge-yellow', PLANNED: 'badge-yellow',
    EXPIRED: 'badge-red', CANCELLED: 'badge-red', REJECTED: 'badge-red', INACTIVE: 'badge-red',
  };
  return map[status] || 'badge-gray';
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const formatFileSize = (bytes: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getTrialDaysRemaining = (trialEndsAt: string) => {
  const end = new Date(trialEndsAt);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

export const PLAN_FEATURES = {
  BASIC: ['members', 'meetings', 'documents'],
  STANDARD: ['members', 'meetings', 'documents', 'finance', 'reports'],
  PREMIUM: ['members', 'meetings', 'documents', 'finance', 'reports', 'projects', 'water', 'reminders'],
};
