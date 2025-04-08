import React, { useState, useEffect, useRef } from "react";
import { chatService } from "../api/services";

const Chats = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const currentUserId = localStorage.getItem("userId");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to fetch only new messages
  const fetchMessages = async (isInitial = false) => {
    try {
      setLoading(true);
      const response = await chatService.getChats();

      // Sort messages by created_at to ensure correct order (newest last)
      const sortedMessages = response.data.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      setMessages(sortedMessages);
      setLastFetchTime(new Date());

      // Only scroll on initial load or when we send a message
      if (isInitial) {
        // Use setTimeout to ensure DOM is updated before scrolling
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMessages(true);

    // Set up polling with increasing intervals based on activity
    let pollInterval = 3000; // Start with 3 seconds
    const maxInterval = 30000; // Max 30 seconds

    const poll = () => {
      // If user has been inactive for a while, increase polling interval
      const timeSinceLastFetch = lastFetchTime ? new Date() - lastFetchTime : 0;
      if (timeSinceLastFetch > 60000) {
        // 1 minute of inactivity
        pollInterval = Math.min(pollInterval * 1.5, maxInterval);
      }

      fetchMessages();
      timeoutId = setTimeout(poll, pollInterval);
    };

    let timeoutId = setTimeout(poll, pollInterval);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle sending a message
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await chatService.sendChat(newMessage);
      setNewMessage("");

      // Fetch messages immediately after sending
      await fetchMessages(true);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  // Handle pressing Enter to send
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Chat</h1>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Chat messages container */}
        <div
          ref={chatContainerRef}
          className="h-96 overflow-y-auto p-4 flex flex-col space-y-3"
          style={{ backgroundColor: "#f5f7fb" }}
        >
          {loading && messages.length === 0 ? (
            <div className="text-center py-4">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`flex ${
                  message.user === currentUserId
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                    message.user === currentUserId
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-800 rounded-bl-none"
                  }`}
                >
                  <p>{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.user === currentUserId
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="border-t p-4 flex">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 p-2 border rounded-l resize-none"
            placeholder="Type a message..."
            rows="2"
          />
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white p-2 rounded-r"
            disabled={!newMessage.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chats;
