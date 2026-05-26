cat > client/src/services/api.js << 'APIEOF'
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('healthchat_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('healthchat_token');
      localStorage.removeItem('healthchat_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (data) => api.put('/auth/password', data),
  logout: () => api.post('/auth/logout'),
};

export const usersAPI = {
  getDoctors: (params) => api.get('/users/doctors', { params }),
  getDoctor: (id) => api.get(`/users/doctors/${id}`),
};

export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (userId, params) => api.get(`/chat/messages/${userId}`, { params }),
  sendMessage: (data) => api.post('/chat/messages', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  deleteMessage: (id) => api.delete(`/chat/messages/${id}`),
  getChatUsers: () => api.get('/chat/users'),
};

export const appointmentsAPI = {
  getAppointments: (params) => api.get('/appointments', { params }),
  getAppointment: (id) => api.get(`/appointments/${id}`),
  bookAppointment: (data) => api.post('/appointments', data),
  updateStatus: (id, data) => api.put(`/appointments/${id}/status`, data),
  cancelAppointment: (id, data) => api.put(`/appointments/${id}/cancel`, data),
  getAvailableSlots: (doctorId, date) => api.get(`/appointments/slots/${doctorId}`, { params: { date } }),
};

export const prescriptionsAPI = {
  getPrescriptions: () => api.get('/prescriptions'),
  getPrescription: (id) => api.get(`/prescriptions/${id}`),
  createPrescription: (data) => api.post('/prescriptions', data),
};

export const reportsAPI = {
  getReports:   () => api.get('/reports'),
  getReport:    (id) => api.get(`/reports/${id}`),
  uploadReport: (data) => api.post('/reports', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteReport: (id) => api.delete(`/reports/${id}`),
  shareReport:  (id) => api.put(`/reports/${id}/share`),
};

export const notificationsAPI = {
  getNotifications: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getUsers: (params) => api.get('/admin/users', { params }),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle`),
  verifyDoctor: (id) => api.put(`/admin/users/${id}/verify`),
  getAppointments: () => api.get('/admin/appointments'),
};

export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
  analyzeSymptoms: (data) => api.post('/ai/analyze-symptoms', data),
  getRecommendations: (data) => api.post('/ai/recommendations', data),
};

export default api;
APIEOF