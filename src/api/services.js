import axios from 'axios';

const BACKEND_HOSTNAME = import.meta.env.VITE_APP_BACKEND_URL || '';

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
        const refreshToken = localStorage.getItem('refresh_token');
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
          localStorage.setItem('refresh_token', response.data.refresh_token);

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
  getPostById: (id) => api.get(`/api/v1/posts/${id}`),
  getSubscriptions: () => api.get('/api/v1/posts/subscriptions'),
  getPopularTags: () => api.get('/api/v1/posts/tags'),
  filterPosts: (filters) => {
    let queryString = '';

    if (typeof filters === 'string') {
      // If it's already a string, use it directly
      queryString = filters;
    } else if (filters instanceof URLSearchParams) {
      // If it's a URLSearchParams object, convert to string
      queryString = filters.toString();
    } else if (typeof filters === 'object') {
      // If it's a regular object, build the query params
      const queryParams = new URLSearchParams();

      // Only add parameters that are actually provided and have values
      if (filters.tags && filters.tags.length > 0) {
        queryParams.append('tags', filters.tags.join(','));
      }

      if (filters.location && filters.location.trim() !== '') {
        queryParams.append('location', filters.location);
      }

      if (filters.status && filters.status.trim() !== '') {
        queryParams.append('status', filters.status);
      }

      // Only add is_product_request if it's explicitly true
      if (filters.isProductRequest === true) {
        queryParams.append('is_product_request', 'true');
      }

      if (filters.page && filters.page > 0) {
        queryParams.append('page', filters.page.toString());
      }

      queryString = queryParams.toString();
    }
    return api.get(`/api/v1/posts/filter?${queryString}`)
  },
  createPost: (postData) => api.post('/api/v1/posts', postData),
  subscribeToPost: (id) => api.post(`/api/v1/posts/${id}/subscribe`),
  unsubscribeFromPost: (id) => api.post(`/api/v1/posts/${id}/unsubscribe`),
  updatePost: (id, postData) => api.put(`/api/v1/posts/${id}`, postData),
};


export const chatService = {
  getConversations: () => api.get('/api/v1/conversations'),
  createConversation: (userId, name) => api.post('/api/v1/conversations', { user_id: userId, name }),
  getMessages: (conversationId) => api.get(`/api/v1/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, content) => api.post(`/api/v1/conversations/${conversationId}/messages`, { content }),
  getConversationByOffer: (offerId) => api.get(`/api/v1/conversations/offer/${offerId}`),
};

export const orderService = {
  getOrders: () => api.get('/api/v1/orders'),
  createOrder: (orderData) => api.post('/api/v1/orders', orderData),
};

export const searchService = {
  search: (query) => api.get(`/api/v1/search?query=${encodeURIComponent(query)}`),
};

export const userService = {
  getUsers: () => api.get('/api/v1/users'),
};

export const offerService = {
  // Get all offers for a post
  getOffersForPost: (postId) => api.get(`/api/v1/posts/${postId}/offers`),

  // Create a new offer for a post
  createOffer: (postId, offerData) => api.post(`/api/v1/posts/${postId}/offers`, offerData),

  // Get a specific offer
  getOffer: (id) => api.get(`/api/v1/offers/${id}`),

  // Update an offer
  updateOffer: (id, offerData) => api.put(`/api/v1/offers/${id}`, offerData),

  // Accept an offer
  acceptOffer: (id) => api.post(`/api/v1/offers/${id}/accept`),

  // Accept a counter-offer (for offer creators)
  acceptCounterOffer: (id) => api.post(`/api/v1/offers/${id}/accept-counter`),

  // Reject an offer
  rejectOffer: (id) => api.post(`/api/v1/offers/${id}/reject`),

  // Get all offers made by the current user
  getMyOffers: () => api.get('/api/v1/offers/my-offers'),

  // Get all offers received for the current user's posts
  getReceivedOffers: () => api.get('/api/v1/offers/received'),

  // Get notifications for the current user
  getNotifications: () => api.get('/api/v1/offers/notifications'),

  // Mark a notification as read
  markNotificationRead: (id) => api.post(`/api/v1/offers/notifications/${id}/read`),

  // Mark all notifications as read
  markAllNotificationsRead: () => api.post('/api/v1/offers/notifications/read-all'),

  negotiateOffer: (id, price, message) => api.post(`/api/v1/offers/${id}/negotiate`, { price, message }),

  getNegotiations: (id) => api.get(`/api/v1/offers/${id}/negotiations`),

  // upcoming features
  requestProof: (id, message) => api.post(`/api/v1/offers/${id}/proof/request`, { message }),
  submitProof: (id, imageUrl, description) => api.post(`/api/v1/offers/${id}/proof/submit`, { image_url: imageUrl, description }),
  getProofs: (id) => api.get(`/api/v1/offers/${id}/proofs`),
  approveProof: (id, proofId) => api.post(`/api/v1/offers/${id}/proof/${proofId}/approve`),
  rejectProof: (id, proofId, reason) => api.post(`/api/v1/offers/${id}/proof/${proofId}/reject`, { reason }),
  createEscrow: (id, amount) => api.post(`/api/v1/offers/${id}/escrow`, { amount }),
  getEscrow: (id) => api.get(`/api/v1/offers/${id}/escrow`),
};

export default api;
