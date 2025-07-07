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
          // No refresh token available
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

export const locationService = {
  getCurrentLocation: () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Latitude:', position);
            const { latitude, longitude, accuracy } = position.coords;
            resolve({ latitude, longitude, accuracy });
          },
          (error) => {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                alert('Please enable location services to use this feature.');
                console.log("User denied the request for geolocation.");
                reject(new Error('Geolocation permission denied.'));
                break;
              case error.POSITION_UNAVAILABLE:
                console.log("Location information is unavailable.");
                alert('Location information is unavailable.');
                reject(new Error('Location information is unavailable.'));
                break;
              case error.TIMEOUT:
                reject(new Error('User location request timed out.'));
                break;
              case error.UNKNOWN_ERROR:
                console.log("Unknown error while fetching user location.");
                reject(new Error('Unknown error'));
                break;
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 200,
            maximumAge: 100,
          }
        );
      } else {
        alert('Geolocation is not supported by this browser.');
        reject(new Error('Geolocation is not supported by this browser.'));
      }
    });
  },
  saveLocation: (latitude, longitude, gps_accuracy = 100.0) => {
    // json params must be floating point numbers
    latitude = parseFloat(latitude);
    longitude = parseFloat(longitude);
    gps_accuracy = parseFloat(gps_accuracy);

    return api.post('/api/v1/location', { latitude, longitude, gps_accuracy });
  },
};

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

  /*   PostData postData {
      content: content,
    tags: selectedTags,
    location: location,
    is_product_request: isProductRequest,
    price_range: priceRange,
    media: postMediaFiles.map(file => ({
      objectKey: file.objectKey,
      name: file.name,
      type: file.type
    }))
    } */
  createPost: (postData) => {
    const formattedData = { ...postData };

    // media is provided as an array of objects with objectKey property,
    // convert to array of strings (just the object keys)
    if (formattedData.media && Array.isArray(formattedData.media)) {
      formattedData.media = formattedData.media.map(item => {
        if (typeof item === 'object' && item.objectKey) {
          return item.objectKey;
        }
        return item;
      });
    }

    return api.post('/api/v1/posts', formattedData);
  },

  updatePost: (id, postData) => {
    const formattedData = { ...postData };

    if (formattedData.media && Array.isArray(formattedData.media)) {
      formattedData.media = formattedData.media.map(item => {
        if (typeof item === 'object' && item.objectKey) {
          return item.objectKey;
        }
        return item;
      });
    }

    return api.put(`/api/v1/posts/${id}`, formattedData);
  },
  subscribeToPost: (id) => api.post(`/api/v1/posts/${id}/subscribe`),
  unsubscribeFromPost: (id) => api.post(`/api/v1/posts/${id}/unsubscribe`),
};


export const chatService = {
  getConversations: () => api.get('/api/v1/conversations'),
  createConversation: (userId, name) => api.post('/api/v1/conversations', { user_id: userId, name }),
  getMessages: (conversationId) => api.get(`/api/v1/conversations/${conversationId}/messages`),

  sendMessage: (conversationId, content, objectKeys = []) => {
    const media = objectKeys;
    return api.post(`/api/v1/conversations/${conversationId}/messages`, {
      content,
      media: media.length > 0 ? media : undefined
    });
  },
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
  createOffer: (postId, offerData) => {
    const formattedData = { ...offerData };

    // If media is provided as an array of objects with objectKey property,
    // convert to array of strings (just the object keys)
    if (formattedData.media && Array.isArray(formattedData.media)) {
      formattedData.media = formattedData.media.map(item => {
        if (typeof item === 'object' && item.objectKey) {
          return item.objectKey;
        }
        return item;
      });
    }

    return api.post(`/api/v1/posts/${postId}/offers`, formattedData);
  },

  // Get a specific offer
  getOffer: (id) => api.get(`/api/v1/offers/${id}`),

  // Update an offer
  updateOffer: (id, offerData) => {
    const formattedData = { ...offerData };

    // extract object key if stored in array of objects
    if (formattedData.media && Array.isArray(formattedData.media)) {
      formattedData.media = formattedData.media.map(item => {
        if (typeof item === 'object' && item.objectKey) {
          return item.objectKey;
        }
        return item;
      });
    }

    return api.put(`/api/v1/offers/${id}`, formattedData);
  },

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

export const mediaService = {
  // presigned URL
  getUploadUrl: (filename, isProof = false, contentType = 'application/octet-stream') => {
    return api.post('/api/v1/media/upload-url', {
      filename: filename,
      is_proof: isProof,
      content_type: contentType
    });
  },

  // Uses presigned URL
  uploadFile: async (uploadUrl, file, contentType = 'application/octet-stream') => {
    // Note: We don't use our regular API instance here because the presigned URL
    // is for a different server (MinIO) and has its own authentication

    // Determine content type based on file extension if not provided
    if (!contentType || contentType === 'application/octet-stream') {
      const extension = file.name.split('.').pop().toLowerCase();
      const contentTypeMap = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'webm': 'video/webm'
      };
      contentType = contentTypeMap[extension] || 'application/octet-stream';
    }


    return axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': contentType
      }
    });
  },


  verifyProof: (objectKey) => {
    return api.get(`/api/v1/media/verify-proof?object_key=${encodeURIComponent(objectKey)}`);
  },

  verifyMediaObject: (objectKey) => {
    return api.get(`/api/v1/media/verify?object_key=${encodeURIComponent(objectKey)}`);
  },

  // Get media file (for streaming/downloading)
  getMedia: async (objectKey) => {
    // get presigned url
    const response = await api.get(`/api/v1/media?object_key=${encodeURIComponent(objectKey)}`);
    if (response.status === 200 && response.data?.download_url) {
      return axios.get(response.data.download_url, {
        responseType: 'blob'
      });
    } else {
      throw new Error('Failed to get media');
    }
  },

  // Gets presigned URL for viewing
  getViewUrl: (objectKey) => {
    return api.get(`/api/v1/media?object_key=${encodeURIComponent(objectKey)}`);
  }
};



export default api;
