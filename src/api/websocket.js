class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.isConnected = false;
    this.reconnectTimeout = null;
  }

  connect() {
    // Prevent multiple connections
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      // console.log('WebSocket already connected or connecting');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    // Cleans up any existing connection first
    this.disconnect();

    const WS_HOSTNAME = import.meta.env.VITE_APP_WS_URL || '';
    const wsUrl = WS_HOSTNAME + `/ws/notifications?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        // Clear any pending reconnection attempts
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
        this.notifyListeners('connected', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // verify schema and notify listeners
          if (data?.id && data?.message && data?.type && data?.modified_at) {
            this.notifyListeners('notification', data);
          }
          // eslint-disable-next-line no-unused-vars
        } catch (_error) {
          // do nothing
        }
      };
      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.notifyListeners('connected', { connected: false });

        // Attempt to reconnect if not a normal closure and not manually disconnected
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyListeners('error', { error });
      };

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }

  scheduleReconnect() {
    // Clear any existing reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  disconnect() {
    // Clear any pending reconnection
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      // Remove event listeners to prevent any final events
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'User initiated disconnect');
      }
      this.ws = null;
    }
    this.isConnected = false;
  }

  markAsRead(type, id) {
    if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        action: 'mark_read',
        type: type,
        id: id
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  removeListener(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }
}

export const webSocketService = new WebSocketService();
