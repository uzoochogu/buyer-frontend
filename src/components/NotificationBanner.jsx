import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { webSocketService } from "../api/websocket";

const NotificationBanner = () => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleNotification = (data) => {
      const notification = {
        ...data,
        key: `${data.type}_${data.id}_${Date.now() + 0.5}`,
        timestamp: new Date().toISOString(),
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notification.id)
        );
      }, 5000);
    };

    webSocketService.addListener("notification", handleNotification);

    return () => {
      webSocketService.removeListener("notification", handleNotification);
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    // Mark as read
    webSocketService.markAsRead(notification.type, notification.id);

    // Navigate to appropriate page
    switch (notification.type) {
      case "post_created":
      case "post_updated":
        navigate(`/community/post/${notification.id}`);
        break;
      case "offer_created":
      case "offer_updated":
      case "offer_negotiated":
      case "offer_accepted":
      case "offer_rejected":
        navigate(`/offers/${notification.id}`);
        break;
      case "chat_created":
      case "message_sent":
        navigate(`chats?conversation=${notification.id}`);
        break;
      default:
      // ignore
      // console.log('Unknown notification type:', notification.type);
    }

    // Remove notification
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
  };

  const dismissNotification = (notificationId, event) => {
    event.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "post_created":
      case "post_updated":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
        );
      case "offer_created":
      case "offer_updated":
      case "offer_negotiated":
      case "offer_accepted":
      case "offer_rejected":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case "chat_created":
      case "message_sent":
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.13 8.13 0 01-2.939-.542l-3.677.865a.5.5 0 01-.644-.644l.865-3.677A8.13 8.13 0 014 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        );
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "offer_accepted":
        return "bg-green-500";
      case "offer_rejected":
        return "bg-red-500";
      case "offer_negotiated":
        return "bg-blue-500";
      case "chat_created":
      case "message_sent":
        return "bg-purple-500";
      case "post_created":
      case "post_updated":
        return "bg-indigo-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatNotificationTitle = (type) => {
    switch (type) {
      case "post_created":
        return "New Post";
      case "post_updated":
        return "Post Updated";
      case "offer_created":
        return "New Offer";
      case "offer_updated":
        return "Offer Updated";
      case "offer_negotiated":
        return "Offer Negotiated";
      case "offer_accepted":
        return "Offer Accepted";
      case "offer_rejected":
        return "Offer Rejected";
      case "chat_created":
        return "New conversation started";
      case "message_sent":
        return "New Message";
      default:
        return "Notification";
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.key}
          onClick={() => handleNotificationClick(notification)}
          className={`${getNotificationColor(
            notification.type
          )} text-white p-4 rounded-lg shadow-lg cursor-pointer transform transition-all duration-300 ease-in-out hover:scale-105 max-w-sm animate-slide-in`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {formatNotificationTitle(notification.type)}
                </p>
                <p className="text-sm opacity-90 mt-1 line-clamp-2">
                  {notification.message}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => dismissNotification(notification.id, e)}
              className="flex-shrink-0 ml-2 text-white hover:text-gray-200 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationBanner;
