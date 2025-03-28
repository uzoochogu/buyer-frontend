import axios from 'axios';

const BACKEND_HOSTNAME = import.meta.env.VITE_APP_BACKEND_URL;

// Create axios instance with base URL from environment variables
const api = axios.create({
  baseURL: BACKEND_HOSTNAME,
  headers: {
    'Content-Type': 'application/json',
  }
});

// API service functions
export const authService = {
  login: (username, password) => api.post('/api/v1/auth/login', { username, password }),
  logout: () => api.post('/api/v1/auth/logout'),
};

export const dashboardService = {
  getDashboardData: () => api.get('/api/v1/dashboard'),
};

export const communityService = {
  getPosts: (page = 1) => api.get(`/api/v1/posts?page=${page}`),
  createPost: (content) => api.post('/api/v1/posts', { user_id: 1, content }),
};

export const chatService = {
  getChats: () => api.get('/api/v1/chats'),
  sendChat: (message) => api.post('/api/v1/chats', { user_id: 1, message }),
};

export const orderService = {
  getOrders: () => api.get('/api/v1/orders'),
  createOrder: (orderData) => api.post('/api/v1/orders', orderData),
};


// TODO : Support better search
// export const searchService = {
//   search: (query) => api.get(`/api/v1/search?query=${encodeURIComponent(query)}`),
// };

export const searchService = {
  search: () => api.get(`/api/v1/search?query`),
};
export default api;
