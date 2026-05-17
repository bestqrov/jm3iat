import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// No-auth instance for public store
export const publicApi2 = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ---- Auth ----
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  validatePromoCode: (code: string, assocType?: string) => api.get('/auth/validate-promo', { params: { code, assocType } }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  updateOrganization: (data: any) => api.put('/auth/organization', data),
  uploadLogo: (file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post('/auth/organization/logo', fd);
  },
  upgradeSubscription:  (plan: string) => api.post('/auth/subscription/upgrade', { plan }),
  cancelDowngrade:      ()             => api.post('/auth/subscription/cancel-downgrade'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  toggleAddon: (addon: string) => api.post('/auth/addon/toggle', { addon }),
  requestConversion: () => api.post('/auth/request-conversion'),
};

// ---- Members ----
export const membersApi = {
  getAll: (params?: any) => api.get('/members', { params }),
  getById: (id: string) => api.get(`/members/${id}`),
  create: (data: any) => api.post('/members', data),
  update: (id: string, data: any) => api.put(`/members/${id}`, data),
  delete: (id: string) => api.delete(`/members/${id}`),
  approve: (id: string) => api.post(`/members/${id}/approve`),
  renew: (id: string) => api.post(`/members/${id}/renew`),
  downloadCard: (id: string, lang = 'ar') => api.get(`/members/${id}/card`, { params: { lang }, responseType: 'blob' }),
  getBoard: () => api.get('/members/board'),
  getStats: () => api.get('/members/stats'),
};

// ---- Meetings ----
export const meetingsApi = {
  getAll: (params?: any) => api.get('/meetings', { params }),
  getById: (id: string) => api.get(`/meetings/${id}`),
  create: (data: any) => api.post('/meetings', data),
  update: (id: string, data: any) => api.put(`/meetings/${id}`, data),
  delete: (id: string) => api.delete(`/meetings/${id}`),
  addAttendees: (id: string, memberIds: string[]) => api.post(`/meetings/${id}/attendees`, { memberIds }),
  markAttendance: (id: string, memberId: string, present: boolean) => api.put(`/meetings/${id}/attendance`, { memberId, present }),
  addDecision: (id: string, data: any) => api.post(`/meetings/${id}/decisions`, data),
  updateDecision: (id: string, decisionId: string, data: any) => api.put(`/meetings/${id}/decisions/${decisionId}`, data),
  uploadPV: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/meetings/${id}/pv/upload`, fd);
  },
  generatePV: (id: string, lang = 'ar') => api.get(`/meetings/${id}/pv/generate`, { responseType: 'blob', params: { lang } }),
  getStats: () => api.get('/meetings/stats'),
};

// ---- Voting ----
export const votingApi = {
  getSessions: (meetingId: string) => api.get(`/voting/meetings/${meetingId}/sessions`),
  createSession: (meetingId: string, data: any) => api.post(`/voting/meetings/${meetingId}/sessions`, data),
  castVote: (sessionId: string, data: any) => api.post(`/voting/sessions/${sessionId}/vote`, data),
  closeSession: (sessionId: string) => api.put(`/voting/sessions/${sessionId}/close`),
  getResults: (sessionId: string) => api.get(`/voting/sessions/${sessionId}/results`),
};

// ---- Finance ----
export const financeApi = {
  getAll: (params?: any) => api.get('/finance', { params }),
  getById: (id: string) => api.get(`/finance/${id}`),
  create: (data: any) => api.post('/finance', data),
  update: (id: string, data: any) => api.put(`/finance/${id}`, data),
  delete: (id: string) => api.delete(`/finance/${id}`),
  getSummary: (year?: number) => api.get('/finance/summary', { params: year ? { year } : {} }),
  getMonthly: (year?: number) => api.get('/finance/monthly', { params: { year } }),
  getCategories: () => api.get('/finance/categories'),
  exportPDF: (year?: number, lang?: string) => api.get('/finance/export/pdf', { responseType: 'blob', params: { ...(year ? { year } : {}), ...(lang ? { lang } : {}) } }),
  uploadReceipt: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('receipt', file);
    return api.post(`/finance/${id}/receipt`, fd);
  },
};

// ---- Documents ----
export const documentsApi = {
  getAll: (params?: any) => api.get('/documents', { params }),
  getById: (id: string) => api.get(`/documents/${id}`),
  upload: (file: File, data: any) => {
    const fd = new FormData();
    fd.append('file', file);
    Object.entries(data).forEach(([k, v]) => v && fd.append(k, v as string));
    return api.post('/documents', fd);
  },
  delete: (id: string) => api.delete(`/documents/${id}`),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
};

// ---- Reports ----
export const reportsApi = {
  getLiterary: () => api.get('/reports/literary'),
  getFinancial: () => api.get('/reports/financial'),
  exportLiterary: (year?: number, lang?: string) => api.get('/reports/literary/export', { responseType: 'blob', params: { ...(year ? { year } : {}), ...(lang ? { lang } : {}) } }),
  exportFinancial: (year?: number, lang?: string) => api.get('/reports/financial/export', { responseType: 'blob', params: { ...(year ? { year } : {}), ...(lang ? { lang } : {}) } }),
  // Association reports
  getAssocLiterary: (params?: any) => api.get('/reports/assoc/literary', { params }),
  getAssocFinancial: (params?: any) => api.get('/reports/assoc/financial', { params }),
  getAssocAdvanced: (params?: any) => api.get('/reports/assoc/advanced', { params }),
  exportAssocLiterary: (params?: any) => api.get('/reports/assoc/literary/export', { responseType: 'blob', params }),
  exportAssocFinancial: (params?: any) => api.get('/reports/assoc/financial/export', { responseType: 'blob', params }),
};

// ---- Projects ----
export const projectsApi = {
  getAll: (params?: any) => api.get('/projects', { params }),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  getStats: () => api.get('/projects/stats'),
};

// ---- Project Milestones ----
export const milestonesApi = {
  getAll: (projectId: string) => api.get(`/projects/${projectId}/milestones`),
  create: (projectId: string, data: any) => api.post(`/projects/${projectId}/milestones`, data),
  update: (projectId: string, milestoneId: string, data: any) => api.put(`/projects/${projectId}/milestones/${milestoneId}`, data),
  delete: (projectId: string, milestoneId: string) => api.delete(`/projects/${projectId}/milestones/${milestoneId}`),
  generatePlan: (projectId: string) => api.post(`/projects/${projectId}/milestones/generate`),
  exportReport: (projectId: string, lang?: string) => api.get(`/projects/${projectId}/report`, { responseType: 'blob', params: { lang } }),
};

// ---- Technical Card ----
export const technicalCardApi = {
  get:    (projectId: string)            => api.get(`/projects/${projectId}/technical-card`),
  save:   (projectId: string, data: any) => api.put(`/projects/${projectId}/technical-card`, data),
  exportPdf: (projectId: string)         => api.get(`/projects/${projectId}/technical-card/pdf`, { responseType: 'blob' }),
  uploadLogo: (projectId: string, file: File) => {
    const fd = new FormData();
    fd.append('logo', file);
    return api.post(`/projects/${projectId}/technical-card/logo`, fd);
  },
};

// ---- Funding ----
export const fundingApi = {
  get: (projectId: string) => api.get(`/funding/projects/${projectId}`),
  updateBudget: (projectId: string, totalBudget: number) => api.put(`/funding/projects/${projectId}/budget`, { totalBudget }),
  addEntry: (projectId: string, data: any) => api.post(`/funding/projects/${projectId}/entries`, data),
  deleteEntry: (entryId: string) => api.delete(`/funding/entries/${entryId}`),
};

// ---- Requests ----
export const requestsApi = {
  getAll:        (params?: any)                              => api.get('/requests', { params }),
  getById:       (id: string)                               => api.get(`/requests/${id}`),
  create:        (data: any)                                => api.post('/requests', data),
  update:        (id: string, data: any)                    => api.put(`/requests/${id}`, data),
  delete:        (id: string)                               => api.delete(`/requests/${id}`),
  getStats:      ()                                         => api.get('/requests/stats'),
  getTemplates:  ()                                         => api.get('/requests/templates'),
  downloadPdf:   (id: string, templateId: string, lang: string) =>
    api.get(`/requests/${id}/pdf`, { params: { templateId, lang }, responseType: 'blob' }),
  sendLetter:    (id: string, data: { templateId: string; channel: string; lang: string; toPhone?: string; toEmail?: string }) =>
    api.post(`/requests/${id}/send`, data),
};

// ---- Water ----
export const waterApi = {
  // Installations
  getInstallations: (params?: any) => api.get('/water', { params }),
  getInstallation: (id: string) => api.get(`/water/${id}`),
  createInstallation: (data: any) => api.post('/water', data),
  updateInstallation: (id: string, data: any) => api.put(`/water/${id}`, data),
  deleteInstallation: (id: string) => api.delete(`/water/${id}`),
  // Readings
  getAllReadings: (params?: any) => api.get('/water/readings', { params }),
  getReadings: (id: string) => api.get(`/water/${id}/readings`),
  addReading: (id: string, data: any) => api.post(`/water/${id}/readings`, data),
  // Smart meter OCR
  scanMeter: (imageBase64: string) => api.post('/water/ocr-reading', { imageBase64 }),
  // Invoices
  getInvoices: (params?: any) => api.get('/water/invoices', { params }),
  markPaid: (invoiceId: string, data?: any) => api.put(`/water/invoices/${invoiceId}/pay`, data),
  // Repairs
  getRepairs: (params?: any) => api.get('/water/repairs', { params }),
  createRepair: (data: any) => api.post('/water/repairs', data),
  updateRepair: (id: string, data: any) => api.put(`/water/repairs/${id}`, data),
  deleteRepair: (id: string) => api.delete(`/water/repairs/${id}`),
  // Summary & Reports
  getSummary: () => api.get('/water/summary'),
  getReports: () => api.get('/water/reports'),
  getReaderAnalytics: () => api.get('/water/reader-analytics'),
  // Tariff
  getTariff: () => api.get('/water/tariff'),
  updateTariff: (data: { fixedFee: number; tranches: any[] }) => api.put('/water/tariff', data),
  exportInvoicePDF: (invoiceId: string) => api.get(`/water/invoices/${invoiceId}/pdf`, { responseType: 'blob' }),
  uploadPaymentReceipt: (invoiceId: string, file: File) => {
    const fd = new FormData();
    fd.append('receipt', file);
    return api.post(`/water/invoices/${invoiceId}/receipt`, fd);
  },
};

// ---- Water Readers ----
export const waterReadersApi = {
  getAll: () => api.get('/water/readers'),
  create: (data: { name: string; email: string; password: string; installationIds?: string[] }) => api.post('/water/readers', data),
  delete: (readerId: string) => api.delete(`/water/readers/${readerId}`),
};

// ---- Reminders ----
export const remindersApi = {
  getAll: (params?: any) => api.get('/reminders', { params }),
  getCount: () => api.get('/reminders/count'),
  markRead: (id: string) => api.put(`/reminders/${id}/read`),
  markAllRead: () => api.put('/reminders/read-all'),
  create: (data: any) => api.post('/reminders', data),
  delete: (id: string) => api.delete(`/reminders/${id}`),
};

// ---- Assoc Production ----
export const assocApi = {
  getStats: () => api.get('/assoc/stats'),
  getStock: () => api.get('/assoc/stock'),
  // Products
  getProducts: () => api.get('/assoc/products'),
  createProduct: (data: any) => api.post('/assoc/products', data),
  updateProduct: (id: string, data: any) => api.put(`/assoc/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/assoc/products/${id}`),
  // Productions
  getProductions: (params?: any) => api.get('/assoc/productions', { params }),
  createProduction: (data: any) => api.post('/assoc/productions', data),
  deleteProduction: (id: string) => api.delete(`/assoc/productions/${id}`),
  // Clients
  getClients: () => api.get('/assoc/clients'),
  createClient: (data: any) => api.post('/assoc/clients', data),
  updateClient: (id: string, data: any) => api.put(`/assoc/clients/${id}`, data),
  deleteClient: (id: string) => api.delete(`/assoc/clients/${id}`),
  getClientHistory: (id: string) => api.get(`/assoc/clients/${id}/history`),
  // Sales
  getSales: (params?: any) => api.get('/assoc/sales', { params }),
  createSale: (data: any) => api.post('/assoc/sales', data),
  deleteSale: (id: string) => api.delete(`/assoc/sales/${id}`),
  // Events
  getEvents: () => api.get('/assoc/events'),
  createEvent: (data: any) => api.post('/assoc/events', data),
  updateEvent: (id: string, data: any) => api.put(`/assoc/events/${id}`, data),
  deleteEvent: (id: string) => api.delete(`/assoc/events/${id}`),
};

// ---- Super Admin ----
export const superadminApi = {
  // ── Core Stats & Analytics ──────────────────────────────────────────────────
  getStats:             ()                               => api.get('/superadmin/stats'),
  getAnalytics:         ()                               => api.get('/superadmin/analytics'),
  getFeatureUsage:      ()                               => api.get('/superadmin/feature-usage'),
  getAIInsights:        ()                               => api.get('/superadmin/ai-insights'),

  // ── Organizations ───────────────────────────────────────────────────────────
  getOrganizations:     (params?: any)                   => api.get('/superadmin/organizations', { params }),
  getOrganization:      (id: string)                     => api.get(`/superadmin/organizations/${id}`),
  updateSubscription:   (id: string, data: any)          => api.put(`/superadmin/organizations/${id}/subscription`, data),
  deleteOrganization:   (id: string)                     => api.delete(`/superadmin/organizations/${id}`),

  // ── Subscriptions ───────────────────────────────────────────────────────────
  getSubscriptions:     (params?: any)                   => api.get('/superadmin/subscriptions', { params }),

  // ── Downgrade Requests ──────────────────────────────────────────────────────
  getDowngradeRequests: ()                               => api.get('/superadmin/downgrade-requests'),
  approveDowngrade:     (orgId: string)                  => api.post(`/superadmin/downgrade-requests/${orgId}/approve`),
  rejectDowngrade:      (orgId: string)                  => api.post(`/superadmin/downgrade-requests/${orgId}/reject`),

  // ── Conversion Requests ─────────────────────────────────────────────────────
  getConversionRequests: ()              => api.get('/superadmin/conversion-requests'),
  approveConversion:     (orgId: string) => api.post(`/superadmin/conversion-requests/${orgId}/approve`),
  rejectConversion:      (orgId: string) => api.post(`/superadmin/conversion-requests/${orgId}/reject`),
  activateAsCoop:        (orgId: string) => api.post(`/superadmin/organizations/${orgId}/activate-coop`),
  deactivateAsCoop:      (orgId: string) => api.post(`/superadmin/organizations/${orgId}/deactivate-coop`),

  // ── Payments ────────────────────────────────────────────────────────────────
  getPayments:          (params?: any)                   => api.get('/superadmin/payments', { params }),
  createPayment:        (fd: FormData)                   => api.post('/superadmin/payments', fd),
  uploadPaymentReceipt: (paymentId: string, file: File)  => {
    const fd = new FormData();
    fd.append('receipt', file);
    return api.post(`/superadmin/payments/${paymentId}/receipt`, fd);
  },
  deletePayment:        (paymentId: string)              => api.delete(`/superadmin/payments/${paymentId}`),

  // ── Users ───────────────────────────────────────────────────────────────────
  getUsers:             (params?: any)                   => api.get('/superadmin/users', { params }),
  toggleUser:           (userId: string)                 => api.put(`/superadmin/users/${userId}/toggle`),
  resetUserPassword:    (userId: string)                 => api.post(`/superadmin/users/${userId}/reset-password`),

  // ── Packs ───────────────────────────────────────────────────────────────────
  seedDefaultPacks:     ()                               => api.post('/superadmin/packs/seed-defaults'),
  getPacks:             ()                               => api.get('/superadmin/packs'),
  createPack:           (data: any)                      => api.post('/superadmin/packs', data),
  updatePack:           (packId: string, data: any)      => api.put(`/superadmin/packs/${packId}`, data),
  deletePack:           (packId: string)                 => api.delete(`/superadmin/packs/${packId}`),

  // ── Promo Sellers ───────────────────────────────────────────────────────────
  getPromoSellers:          ()                                    => api.get('/superadmin/promo-sellers'),
  createPromoSeller:        (data: any)                          => api.post('/superadmin/promo-sellers', data),
  updatePromoSeller:        (sellerId: string, data: any)        => api.put(`/superadmin/promo-sellers/${sellerId}`, data),
  deletePromoSeller:        (sellerId: string)                   => api.delete(`/superadmin/promo-sellers/${sellerId}`),
  getPromoSellerUsages:     (sellerId: string)                   => api.get(`/superadmin/promo-sellers/${sellerId}/usages`),
  markSellerPaid:           (sellerId: string)                   => api.post(`/superadmin/promo-sellers/${sellerId}/mark-paid`),

  // ── Promo Codes ─────────────────────────────────────────────────────────────
  getPromoCodes:        ()                               => api.get('/superadmin/promo-codes'),
  createPromoCode:      (data: any)                      => api.post('/superadmin/promo-codes', data),
  updatePromoCode:      (promoId: string, data: any)     => api.put(`/superadmin/promo-codes/${promoId}`, data),
  deletePromoCode:      (promoId: string)                => api.delete(`/superadmin/promo-codes/${promoId}`),

  // ── Email Campaigns ─────────────────────────────────────────────────────────
  getEmailCampaigns:    ()                               => api.get('/superadmin/campaigns'),
  createEmailCampaign:  (data: any)                      => api.post('/superadmin/campaigns', data),
  sendEmailCampaign:    (campaignId: string)             => api.post(`/superadmin/campaigns/${campaignId}/send`),
  deleteEmailCampaign:  (campaignId: string)             => api.delete(`/superadmin/campaigns/${campaignId}`),

  // ── WhatsApp ────────────────────────────────────────────────────────────────
  getWhatsAppMessages:  ()                               => api.get('/superadmin/whatsapp'),
  sendWhatsApp:         (data: any)                      => api.post('/superadmin/whatsapp/send', data),
  sendBulkWhatsApp:     (data: any)                      => api.post('/superadmin/whatsapp/bulk', data),

  // ── Automation ──────────────────────────────────────────────────────────────
  getAutomationRules:   ()                               => api.get('/superadmin/automation'),
  createAutomationRule: (data: any)                      => api.post('/superadmin/automation', data),
  updateAutomationRule: (ruleId: string, data: any)      => api.put(`/superadmin/automation/${ruleId}`, data),
  deleteAutomationRule: (ruleId: string)                 => api.delete(`/superadmin/automation/${ruleId}`),
  runAutomationRule:    (ruleId: string)                 => api.post(`/superadmin/automation/${ruleId}/run`),

  // ── Platform Settings ───────────────────────────────────────────────────────
  getPlatformSettings:  ()                               => api.get('/superadmin/settings'),
  updatePlatformSettings: (data: any)                    => api.put('/superadmin/settings', data),

  // ── Marketing Campaigns (unified) — superadmin namespace (legacy) ──────────
  getMarketingCampaigns:   ()           => api.get('/superadmin/marketing-campaigns'),
  createMarketingCampaign: (data: any)  => api.post('/superadmin/marketing-campaigns', data),
  deleteMarketingCampaign: (id: string) => api.delete(`/superadmin/marketing-campaigns/${id}`),
  getMarketingTemplates:   ()           => api.get('/superadmin/marketing-templates'),
};

// ── WhatsApp Instance ─────────────────────────────────────────────────────────
export const whatsappApi = {
  getStatus:    () => api.get('/whatsapp/status'),
  getQr:        () => api.get('/whatsapp/qr'),
  confirm:      () => api.post('/whatsapp/confirm'),
  disconnect:   () => api.delete('/whatsapp/disconnect'),
};

// ── Dedicated Marketing API (/api/marketing) ──────────────────────────────────
export const marketingApi = {
  send:              (data: any)           => api.post('/marketing/send', data),
  getCampaigns:      (params?: any)        => api.get('/marketing/campaigns', { params }),
  deleteCampaign:    (id: string)          => api.delete(`/marketing/campaigns/${id}`),
  getTemplates:      ()                    => api.get('/marketing/templates'),
  previewSegment:    (segmentation: string[]) => api.post('/marketing/preview-segment', { segmentation }),
  getOrganizations:  (q?: string)          => api.get('/marketing/organizations', { params: q ? { q } : {} }),
};

// ── Staff Accounts (Settings) ─────────────────────────────────────────────────
export const staffApi = {
  getAll:  ()                          => api.get('/settings/staff'),
  create:  (data: any)                 => api.post('/settings/staff', data),
  update:  (id: string, data: any)     => api.put(`/settings/staff/${id}`, data),
  remove:  (id: string)                => api.delete(`/settings/staff/${id}`),
};

// ── Transport Module ──────────────────────────────────────────────────────────
export const transportApi = {
  getStats:    ()                          => api.get('/transport/stats'),
  // Drivers
  getDrivers:  ()                          => api.get('/transport/drivers'),
  createDriver: (data: any)               => api.post('/transport/drivers', data),
  updateDriver: (id: string, data: any)   => api.put(`/transport/drivers/${id}`, data),
  deleteDriver: (id: string)              => api.delete(`/transport/drivers/${id}`),
  // Vehicles
  getVehicles: ()                          => api.get('/transport/vehicles'),
  createVehicle: (data: any)               => api.post('/transport/vehicles', data),
  updateVehicle: (id: string, data: any)   => api.put(`/transport/vehicles/${id}`, data),
  deleteVehicle: (id: string)              => api.delete(`/transport/vehicles/${id}`),
  // Students
  getStudents: (params?: any)              => api.get('/transport/students', { params }),
  createStudent: (data: any)               => api.post('/transport/students', data),
  updateStudent: (id: string, data: any)   => api.put(`/transport/students/${id}`, data),
  deleteStudent: (id: string)              => api.delete(`/transport/students/${id}`),
  // Routes
  getRoutes:   ()                          => api.get('/transport/routes'),
  createRoute: (data: any)                 => api.post('/transport/routes', data),
  updateRoute: (id: string, data: any)     => api.put(`/transport/routes/${id}`, data),
  deleteRoute: (id: string)                => api.delete(`/transport/routes/${id}`),
  // Subscriptions
  getSubscriptions: (params?: any)         => api.get('/transport/subscriptions', { params }),
  bulkCreateSubscriptions: (data: any)     => api.post('/transport/subscriptions/bulk', data),
  updateSubscription: (id: string, data: any) => api.put(`/transport/subscriptions/${id}`, data),
  // Payments
  getPayments: (params?: any)              => api.get('/transport/payments', { params }),
  createPayment: (data: any)               => api.post('/transport/payments', data),
  deletePayment: (id: string)              => api.delete(`/transport/payments/${id}`),
  // Attendance
  getAttendance: (params?: any)            => api.get('/transport/attendance', { params }),
  markAttendance: (data: any)              => api.post('/transport/attendance', data),
  bulkMarkAttendance: (data: any)          => api.post('/transport/attendance/bulk', data),
  // Expenses
  getExpenses: ()                          => api.get('/transport/expenses'),
  createExpense: (data: any)               => api.post('/transport/expenses', data),
  deleteExpense: (id: string)              => api.delete(`/transport/expenses/${id}`),
};

// ---- Activity Log ----
export const activityApi = {
  getLogs: (params?: any) => api.get('/activity', { params }),
};

// ---- Notifications ----
export const notificationsApi = {
  getAll:   ()           => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: ()        => api.put('/notifications/all/read'),
  remove:   (id: string) => api.delete(`/notifications/${id}`),
};

// ---- Recurring Payments ----
export const recurringApi = {
  getAll:  ()              => api.get('/recurring'),
  create:  (data: any)     => api.post('/recurring', data),
  update:  (id: string, data: any) => api.put(`/recurring/${id}`, data),
  remove:  (id: string)    => api.delete(`/recurring/${id}`),
};

// ---- Export ----
const downloadXlsx = async (url: string, filename: string) => {
  const res = await api.get(url, { responseType: 'blob' });
  const href = URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = href; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(href);
};

export const exportApi = {
  members:           () => downloadXlsx('/export/members', `membres_${Date.now()}.xlsx`),
  finance:           (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to)   q.set('to', to);
    return downloadXlsx(`/export/finance?${q}`, `finance_${Date.now()}.xlsx`);
  },
  transportStudents: () => downloadXlsx('/export/transport/students', `transport_eleves_${Date.now()}.xlsx`),
  invoice:           (txId: string) => { window.open(`/api/finance/${txId}/invoice`, '_blank'); },
};

// ---- Calendar ----
export const calendarApi = {
  getEvents: (from?: string, to?: string) => api.get('/calendar', { params: { from, to } }),
};

// ---- Public ----
export const publicApi = {
  getProfile:      (slug: string)            => api.get(`/public/${slug}`),
  submitJoin:      (slug: string, data: any) => api.post(`/public/${slug}/join`, data),
  uploadReceipt:   (slug: string, file: File) => {
    const fd = new FormData();
    fd.append('receipt', file);
    return api.post(`/public/${slug}/receipt`, fd);
  },
  getSupportContact: ()                      => api.get('/public/contact'),
};

// ---- Backup ----
export const backupApi = {
  toggle:  ()  => api.post('/backup/toggle'),
  list:    ()  => api.get('/backup'),
  create:  ()  => { window.open('/api/backup/create', '_blank'); },
};

// ---- Assets ----
export const assetsApi = {
  getAll:   (params?: any)              => api.get('/assets', { params }),
  getStats: ()                          => api.get('/assets/stats'),
  getById:  (id: string)                => api.get(`/assets/${id}`),
  create:   (data: any)                 => api.post('/assets', data),
  update:   (id: string, data: any)     => api.put(`/assets/${id}`, data),
  remove:   (id: string)                => api.delete(`/assets/${id}`),
};

// ---- Sports ----
export const sportsApi = {
  getStats:   ()                              => api.get('/sports/stats'),
  // Teams
  getTeams:   ()                              => api.get('/sports/teams'),
  createTeam: (data: any)                     => api.post('/sports/teams', data),
  updateTeam: (id: string, data: any)         => api.put(`/sports/teams/${id}`, data),
  deleteTeam: (id: string)                    => api.delete(`/sports/teams/${id}`),
  // Players
  getPlayers:   (params?: any)                => api.get('/sports/players', { params }),
  createPlayer: (data: any)                   => api.post('/sports/players', data),
  updatePlayer: (id: string, data: any)       => api.put(`/sports/players/${id}`, data),
  deletePlayer: (id: string)                  => api.delete(`/sports/players/${id}`),
  // Trainings
  getTrainings:   (params?: any)              => api.get('/sports/trainings', { params }),
  createTraining: (data: any)                 => api.post('/sports/trainings', data),
  updateTraining: (id: string, data: any)     => api.put(`/sports/trainings/${id}`, data),
  deleteTraining: (id: string)                => api.delete(`/sports/trainings/${id}`),
  markAttendance: (data: any)                 => api.post('/sports/trainings/attendance', data),
  // Matches
  getMatches:     (params?: any)              => api.get('/sports/matches', { params }),
  createMatch:    (data: any)                 => api.post('/sports/matches', data),
  updateMatch:    (id: string, data: any)     => api.put(`/sports/matches/${id}`, data),
  deleteMatch:    (id: string)                => api.delete(`/sports/matches/${id}`),
  upsertMatchStat:(matchId: string, data: any)=> api.post(`/sports/matches/${matchId}/stats`, data),
};

// ---- Cooperatives ----
export const coopApi = {
  getStats:    ()                              => api.get('/coop/stats'),
  getReports:  ()                              => api.get('/coop/reports'),
  // Products
  getProducts:    ()                           => api.get('/coop/products'),
  createProduct:  (data: any)                  => api.post('/coop/products', data),
  updateProduct:  (id: string, data: any)      => api.put(`/coop/products/${id}`, data),
  deleteProduct:  (id: string)                 => api.delete(`/coop/products/${id}`),
  // Stock movements
  getMovements:   (params?: any)               => api.get('/coop/movements', { params }),
  createMovement: (data: any)                  => api.post('/coop/movements', data),
  deleteMovement: (id: string)                 => api.delete(`/coop/movements/${id}`),
  // Member shares
  getShares:    ()                             => api.get('/coop/shares'),
  upsertShare:  (data: any)                    => api.post('/coop/shares', data),
  deleteShare:  (id: string)                   => api.delete(`/coop/shares/${id}`),
  // Invoices / Devis / BL
  getInvoices:    (params?: any)               => api.get('/coop/invoices', { params }),
  createInvoice:  (data: any)                  => api.post('/coop/invoices', data),
  updateInvoice:  (id: string, data: any)      => api.put(`/coop/invoices/${id}`, data),
  deleteInvoice:  (id: string)                 => api.delete(`/coop/invoices/${id}`),
  // Board meetings (مجلس الإدارة)
  getBoardMeetings:   ()                                    => api.get('/coop/board-meetings'),
  createBoardMeeting: (data: any)                           => api.post('/coop/board-meetings', data),
  updateBoardMeeting: (id: string, data: any)               => api.put(`/coop/board-meetings/${id}`, data),
  deleteBoardMeeting: (id: string)                          => api.delete(`/coop/board-meetings/${id}`),
  addBoardDecision:   (id: string, data: any)               => api.post(`/coop/board-meetings/${id}/decisions`, data),
  updateBoardDecision:(id: string, decisionId: string, data: any) => api.put(`/coop/board-meetings/${id}/decisions/${decisionId}`, data),
  // Projects & partnerships (المشاريع والشراكات)
  getCoopProjects:    ()                        => api.get('/coop/projects'),
  createCoopProject:  (data: any)               => api.post('/coop/projects', data),
  updateCoopProject:  (id: string, data: any)   => api.put(`/coop/projects/${id}`, data),
  deleteCoopProject:  (id: string)              => api.delete(`/coop/projects/${id}`),
  // Production (دورات الإنتاج)
  getProductions:     ()                        => api.get('/coop/productions'),
  createProduction:   (data: any)               => api.post('/coop/productions', data),
  updateProduction:   (id: string, data: any)   => api.put(`/coop/productions/${id}`, data),
  deleteProduction:   (id: string)              => api.delete(`/coop/productions/${id}`),
  // Clients
  getClients:         ()                        => api.get('/coop/clients'),
  createClient:       (data: any)               => api.post('/coop/clients', data),
  updateClient:       (id: string, data: any)   => api.put(`/coop/clients/${id}`, data),
  deleteClient:       (id: string)              => api.delete(`/coop/clients/${id}`),
  // Sales / Ventes
  getSales:           (params?: any)            => api.get('/coop/sales', { params }),
  getSalesStats:      ()                        => api.get('/coop/sales/stats'),
  createSale:         (data: any)               => api.post('/coop/sales', data),
  updateSale:         (id: string, data: any)   => api.put(`/coop/sales/${id}`, data),
  deleteSale:         (id: string)              => api.delete(`/coop/sales/${id}`),
};

// ---- Commerce ----
export const commerceApi = {
  getStats:       ()                            => api.get('/commerce/stats'),
  // Products
  getProducts:    ()                            => api.get('/commerce/products'),
  createProduct:  (data: any)                   => api.post('/commerce/products', data),
  updateProduct:  (id: string, data: any)       => api.put(`/commerce/products/${id}`, data),
  deleteProduct:  (id: string)                  => api.delete(`/commerce/products/${id}`),
  // Warehouse / Stock
  getStock:       ()                            => api.get('/commerce/stock'),
  addStock:       (data: any)                   => api.post('/commerce/stock', data),
  // Orders
  getOrders:      (params?: any)                => api.get('/commerce/orders', { params }),
  createOrder:    (data: any)                   => api.post('/commerce/orders', data),
  updateOrder:    (id: string, data: any)       => api.put(`/commerce/orders/${id}`, data),
  deleteOrder:    (id: string)                  => api.delete(`/commerce/orders/${id}`),
  // Profits / COD
  getProfits:     ()                            => api.get('/commerce/profits'),
  // Payouts
  getPayouts:     ()                            => api.get('/commerce/payouts'),
  createPayout:   (data: any)                   => api.post('/commerce/payouts', data),
};

export const storeApi = {
  getProducts:   (params?: any)                => publicApi2.get('/store/products', { params }),
  getProduct:    (id: string)                  => publicApi2.get(`/store/products/${id}`),
  getOrgs:       ()                            => publicApi2.get('/store/orgs'),
  getCategories: ()                            => publicApi2.get('/store/categories'),
  placeOrder:    (data: any)                   => publicApi2.post('/store/orders', data),
};
