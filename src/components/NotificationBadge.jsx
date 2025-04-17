import React, { useState, useEffect, useRef } from "react";
import { offerService } from "../api/services";
import { useNavigate } from "react-router-dom";

const NotificationBadge = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch notifications
  const fetchNotifications = async () => {
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

  // Initial fetch
  useEffect(() => {
    fetchNotifications();

    // Set up polling for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

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

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await offerService.markNotificationRead(notificationId);
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await offerService.markAllNotificationsRead();
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Navigate to offer and mark as read
  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    navigate(`/offers/${notification.offer_id}`);
    setShowDropdown(false);
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
            {unreadCount}
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
                  onClick={markAllAsRead}
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
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b ${
                      !notification.is_read ? "bg-blue-50" : ""
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">
                      New offer: {notification.offer_title}
                    </p>
                    <p className="text-xs text-gray-500">
                      From {notification.offer_username} •{" "}
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 truncate">
                      Post: {notification.post_content.substring(0, 50)}...
                    </p>
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
