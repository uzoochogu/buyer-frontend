import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../contexts/WebSocketContext";

const NotificationBadge = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    markAsRead: wsMarkAsRead,
  } = useWebSocket();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Navigate to offer and mark as read
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      // Mark as read via WebSocket first (for real-time updates)
      if (
        wsMarkAsRead &&
        notification.type &&
        !notification.id.toString().startsWith("ws_")
      ) {
        wsMarkAsRead(
          notification.type,
          notification.offer_id ||
            notification.message_id ||
            notification.post_id ||
            notification.id
        );
      }
      // Also mark as read locally
      await markNotificationAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case "offer_created":
      case "offer_updated":
      case "offer_negotiated":
      case "offer_accepted":
      case "offer_rejected":
        navigate(`/offers/${notification.offer_id}`);
        break;
      case "chat_created":
      case "message_sent":
        navigate(`/chats?conversation=${notification.message_id}`);
        break;
      case "post_created":
      case "post_updated":
        navigate(`/community/post/${notification.post_id}`);
        break;
      default:
        navigate(`/offers/${notification.offer_id}`);
    }

    setShowDropdown(false);
  };

  // Get notification display text based on type
  const getNotificationText = (notification) => {
    switch (notification.type) {
      case "offer_created":
        return `New offer: ${notification.offer_title || "Offer received"}`;
      case "offer_updated":
        return `Offer updated: ${notification.offer_title || "Offer modified"}`;
      case "offer_negotiated":
        return `Offer negotiated: ${
          notification.offer_title || "Counter offer received"
        }`;
      case "offer_accepted":
        return `Offer accepted: ${
          notification.offer_title || "Your offer was accepted"
        }`;
      case "offer_rejected":
        return `Offer rejected: ${
          notification.offer_title || "Your offer was rejected"
        }`;
      case "message_sent":
        return `New message`;
      case "chat_created":
        return `New conversation started`;
      case "post_created":
        return `New post in community`;
      case "post_updated":
        return `Post updated in community`;
      default:
        return notification.message || "New notification";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-1 rounded-full text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
          <div className="py-2">
            <div className="flex justify-between items-center px-4 py-2 border-b">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {loading && notifications.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500 text-center">
                No notifications
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications
                  .sort(
                    (a, b) =>
                      new Date(b.created_at || b.modified_at) -
                      new Date(a.created_at || a.modified_at)
                  )
                  .map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b ${
                        !notification.is_read ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div
                          className={`w-2 h-2 rounded-full mt-2 ${
                            !notification.is_read
                              ? "bg-blue-500"
                              : "bg-gray-300"
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getNotificationText(notification)}
                          </p>
                          {notification.offer_username && (
                            <p className="text-xs text-gray-500">
                              From {notification.offer_username} •{" "}
                              {new Date(
                                notification.created_at ||
                                  notification.modified_at
                              ).toLocaleString()}
                            </p>
                          )}
                          {notification.post_content && (
                            <p className="text-xs text-gray-700 mt-1 truncate">
                              Post: {notification.post_content.substring(0, 50)}
                              ...
                            </p>
                          )}
                          {notification.message &&
                            !notification.post_content &&
                            !notification.id.toString().startsWith("ws_") && (
                              <p className="text-xs text-gray-700 mt-1 truncate">
                                {notification.message.substring(0, 80)}...
                              </p>
                            )}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(
                              notification.created_at ||
                                notification.modified_at
                            ).toLocaleString()}
                          </p>
                          {notification.id.toString().startsWith("ws_") && (
                            <>
                              <p className="text-xs text-gray-700 mt-1 truncate">
                                {notification.message.length > 50
                                  ? notification.message.substring(0, 50) +
                                    "..."
                                  : notification.message}
                              </p>
                              <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full mt-1">
                                Live
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="px-4 py-2 border-t">
              <button
                onClick={() => {
                  navigate("/offers");
                  setShowDropdown(false);
                }}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                View all offers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;
