import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('healthchat_user') || 'null'),
  token: localStorage.getItem('healthchat_token') || null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('healthchat_token'),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem('healthchat_token', data.token);
      localStorage.setItem('healthchat_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
  },

  register: async (formData) => {
    set({ isLoading: true });
    try {
      const { data } = await authAPI.register(formData);
      localStorage.setItem('healthchat_token', data.token);
      localStorage.setItem('healthchat_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
  },

  logout: async () => {
    try { await authAPI.logout(); } catch (e) {}
    localStorage.removeItem('healthchat_token');
    localStorage.removeItem('healthchat_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (userData) => {
    const updated = { ...get().user, ...userData };
    localStorage.setItem('healthchat_user', JSON.stringify(updated));
    set({ user: updated });
  },

  refreshUser: async () => {
    try {
      const { data } = await authAPI.getMe();
      localStorage.setItem('healthchat_user', JSON.stringify(data.user));
      set({ user: data.user });
    } catch (e) {}
  },
}));

export default useAuthStore;
