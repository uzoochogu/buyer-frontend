import axios from 'axios';

const BACKEND_HOSTNAME = import.meta.env.VITE_APP_BACKEND_URL;

// Create axios instance with base URL
const api = axios.create({
  baseURL: BACKEND_HOSTNAME,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Add request interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't already tried to refresh the token
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // No refresh token available, redirect to login
          window.location.href = '/';
          return Promise.reject(error);
        }

        // Try to refresh the token
        const response = await axios.post(`${BACKEND_HOSTNAME}/api/v1/auth/refresh`, {
          refresh_token: refreshToken
        });

        if (response.data.status === 'success') {
          // Update tokens in localStorage
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('refreshToken', response.data.refresh_token);

          // Update the authorization header
          api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;

          // Retry the original request
          return api(originalRequest);
        } else {
          // Refresh failed, redirect to login
          localStorage.clear();
          window.location.href = '/';
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API service functions
export const authService = {
  login: (username, password) => api.post('/api/v1/auth/login', { username, password }),
  register: (username, email, password) => api.post('/api/v1/auth/register', { username, email, password }),
  logout: () => api.post('/api/v1/auth/logout'),
  refresh: (refreshToken) => api.post('/api/v1/auth/refresh', { refresh_token: refreshToken }),
};

export const dashboardService = {
  getDashboardData: () => api.get('/api/v1/dashboard'),
};

export const communityService = {
  getPosts: (page = 1) => api.get(`/api/v1/posts?page=${page}`),
  createPost: (content) => api.post('/api/v1/posts', { user_id: localStorage.getItem('userId') || 1, content }),
};

export const chatService = {
  getChats: () => api.get('/api/v1/chats'),
  sendChat: (message) => api.post('/api/v1/chats', { user_id: localStorage.getItem('userId') || 1, message }),
};

export const orderService = {
  getOrders: () => api.get('/api/v1/orders'),
  createOrder: (orderData) => api.post('/api/v1/orders', orderData),
};

export const searchService = {
  search: (query) => api.get(`/api/v1/search?query=${encodeURIComponent(query)}`),
};

export default api;
