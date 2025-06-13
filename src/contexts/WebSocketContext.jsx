import { createContext, useContext, useEffect, useState, useRef } from "react";
import { webSocketService } from "../api/websocket";
import { offerService } from "../api/services";
import { useLocation } from "react-router-dom";

const WebSocketContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [refreshTriggers, setRefreshTriggers] = useState({
    notifications: 0,
    chats: 0,
    offers: 0,
    community: 0,
    conversations: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const location = useLocation();

  // Use refs to store the callback functions to prevent recreation on every render
  const handleConnectionRef = useRef();
  const handleNotificationRef = useRef();
  const handleTokenErrorRef = useRef();

  // Check if user is authenticated and not on login/register pages
  const shouldConnectWebSocket = () => {
    const token = localStorage.getItem("token");
    const isOnAuthPage =
      location.pathname === "/" ||
      location.pathname === "/login" ||
      location.pathname === "/register";

    return token && !isOnAuthPage;
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    // Only fetch if we should be connected
    if (!shouldConnectWebSocket()) {
      return;
    }

    try {
      setLoading(true);
      const response = await offerService.getNotifications();
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add WebSocket notification to the list
  const addWebSocketNotification = (wsNotification) => {
    const newNotification = {
      id: `ws_${wsNotification.id}_${Date.now()}`,
      type: wsNotification.type,
      message: wsNotification.message,
      is_read: false,
      created_at: wsNotification.modified_at || new Date().toISOString(),
      modified_at: wsNotification.modified_at || new Date().toISOString(),
      // Map WebSocket data to expected fields based on type
      ...(wsNotification.type.includes("offer") && {
        offer_id: wsNotification.id,
        offer_title: wsNotification.message,
      }),
      ...(wsNotification.type.includes("message") && {
        message_id: wsNotification.id,
      }),
      ...(wsNotification.type.includes("post") && {
        post_id: wsNotification.id,
      }),
    };

    setNotifications((prev) => {
      // Check if this notification already exists to avoid duplicates
      const exists = prev.some(
        (n) =>
          n.id === newNotification.id ||
          (n.type === wsNotification.type && n.offer_id === wsNotification.id)
      );

      if (exists) {
        return prev;
      }

      // Add new notification to the beginning of the list
      return [newNotification, ...prev];
    });

    // Update unread count
    setUnreadCount((prev) => prev + 1);
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      // Only call API for non-WebSocket notifications
      if (!notificationId.toString().startsWith("ws_")) {
        await offerService.markNotificationRead(notificationId);
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await offerService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Create stable callback functions
  handleConnectionRef.current = ({ connected }) => {
    setIsConnected(connected);
  };

  // Process notification
  handleNotificationRef.current = (data) => {
    // Add the notification to our list
    addWebSocketNotification(data);

    // Trigger refreshes based on notification type
    switch (data.type) {
      case "offer_created":
      case "offer_updated":
      case "offer_negotiated":
      case "offer_accepted":
      case "offer_rejected":
        setRefreshTriggers((prev) => ({
          ...prev,
          notifications: prev.notifications + 1,
          offers: prev.offers + 1,
        }));
        break;
      case "chat_created":
        setRefreshTriggers((prev) => ({
          ...prev,
          notifications: prev.notifications + 1,
          conversations: prev.conversations + 1,
        }));
        break;
      case "message_sent":
        setRefreshTriggers((prev) => ({
          ...prev,
          notifications: prev.notifications + 1,
          chats: prev.chats + 1,
        }));
        break;
      case "post_created":
      case "post_updated":
        setRefreshTriggers((prev) => ({
          ...prev,
          notifications: prev.notifications + 1,
          community: prev.community + 1,
        }));
        break;
      default:
        setRefreshTriggers((prev) => ({
          ...prev,
          notifications: prev.notifications + 1,
        }));
    }
  };

  handleTokenErrorRef.current = ({ needsRefresh }) => {
    if (needsRefresh) {
      console.log(
        "WebSocket token error detected, disconnecting and clearing state"
      );
      // Disconnect WebSocket and clear notifications
      webSocketService.disconnect();
      setNotifications([]);
      setUnreadCount(0);
      // The axios interceptor will handle the token refresh
      // WebSocket will reconnect when user navigates to an authenticated page
    }
  };

  // Effect to handle WebSocket connection based on route and auth state
  useEffect(() => {
    const connectionHandler = (data) => handleConnectionRef.current(data);
    const notificationHandler = (data) => handleNotificationRef.current(data);
    const tokenErrorHandler = (data) => handleTokenErrorRef.current(data);

    // Add listeners
    webSocketService.addListener("connected", connectionHandler);
    webSocketService.addListener("notification", notificationHandler);
    webSocketService.addListener("tokenError", tokenErrorHandler);

    if (shouldConnectWebSocket()) {
      // console.log(
      //   "User is authenticated and not on auth page, connecting WebSocket"
      // );
      fetchNotifications();
      const token = localStorage.getItem("token");
      webSocketService.connect(token);
    } else {
      // console.log(
      //   "User not authenticated or on auth page, disconnecting WebSocket"
      // );
      webSocketService.disconnect();
      // Clear notifications when not authenticated
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      webSocketService.removeListener("connected", connectionHandler);
      webSocketService.removeListener("notification", notificationHandler);
      webSocketService.removeListener("tokenError", tokenErrorHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Re-run when route changes

  // Listen for storage changes (login/logout from other tabs)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "token") {
        if (e.newValue && shouldConnectWebSocket()) {
          console.log("Token added in localStorage, connecting WebSocket");
          webSocketService.connect(e.newValue);
          fetchNotifications();
        } else {
          console.log(
            "Token removed from localStorage, disconnecting WebSocket"
          );
          webSocketService.disconnect();
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      webSocketService.disconnect();
    };
  }, []);

  const connect = () => {
    if (shouldConnectWebSocket()) {
      const token = localStorage.getItem("token");
      webSocketService.connect(token);
    }
  };

  const disconnect = () => {
    webSocketService.disconnect();
  };

  const markAsRead = (type, id) => {
    webSocketService.markAsRead(type, id);
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        refreshTriggers,
        notifications,
        unreadCount,
        loading,
        connect,
        disconnect,
        markAsRead,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        fetchNotifications,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};
