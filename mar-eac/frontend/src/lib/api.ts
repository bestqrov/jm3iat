import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

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
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  updateOrganization: (data: any) => api.put('/auth/organization', data),
  upgradeSubscription: (plan: string) => api.post('/auth/subscription/upgrade', { plan }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
};

// ---- Members ----
export const membersApi = {
  getAll: (params?: any) => api.get('/members', { params }),
  getById: (id: string) => api.get(`/members/${id}`),
  create: (data: any) => api.post('/members', data),
  update: (id: string, data: any) => api.put(`/members/${id}`, data),
  delete: (id: string) => api.delete(`/members/${id}`),
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
  generatePV: (id: string) => api.get(`/meetings/${id}/pv/generate`, { responseType: 'blob' }),
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
  getSummary: () => api.get('/finance/summary'),
  getMonthly: (year?: number) => api.get('/finance/monthly', { params: { year } }),
  getCategories: () => api.get('/finance/categories'),
  exportPDF: (year?: number) => api.get('/finance/export/pdf', { responseType: 'blob', params: year ? { year } : {} }),
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
  exportLiterary: () => api.get('/reports/literary/export', { responseType: 'blob' }),
  exportFinancial: (year?: number) => api.get('/reports/financial/export', { responseType: 'blob', params: year ? { year } : {} }),
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

// ---- Funding ----
export const fundingApi = {
  get: (projectId: string) => api.get(`/funding/projects/${projectId}`),
  updateBudget: (projectId: string, totalBudget: number) => api.put(`/funding/projects/${projectId}/budget`, { totalBudget }),
  addEntry: (projectId: string, data: any) => api.post(`/funding/projects/${projectId}/entries`, data),
  deleteEntry: (entryId: string) => api.delete(`/funding/entries/${entryId}`),
};

// ---- Requests ----
export const requestsApi = {
  getAll: (params?: any) => api.get('/requests', { params }),
  getById: (id: string) => api.get(`/requests/${id}`),
  create: (data: any) => api.post('/requests', data),
  update: (id: string, data: any) => api.put(`/requests/${id}`, data),
  delete: (id: string) => api.delete(`/requests/${id}`),
  getStats: () => api.get('/requests/stats'),
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

// ---- Super Admin ----
export const superadminApi = {
  getStats: () => api.get('/superadmin/stats'),
  getOrganizations: (params?: any) => api.get('/superadmin/organizations', { params }),
  getOrganization: (id: string) => api.get(`/superadmin/organizations/${id}`),
  updateSubscription: (id: string, data: any) => api.put(`/superadmin/organizations/${id}/subscription`, data),
  deleteOrganization: (id: string) => api.delete(`/superadmin/organizations/${id}`),
  getUsers: (params?: any) => api.get('/superadmin/users', { params }),
  toggleUser: (userId: string) => api.put(`/superadmin/users/${userId}/toggle`),
  resetUserPassword: (userId: string) => api.post(`/superadmin/users/${userId}/reset-password`),
};
