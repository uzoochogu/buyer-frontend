import React, { useState, useEffect, useRef } from "react";
import { chatService } from "../api/services";

const Chats = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [conversationName, setConversationName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentUserId = localStorage.getItem("user_id");
  const messagesEndRef = useRef(null);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      // For testing - if API fails, use mock data
      try {
        const response = await chatService.getConversations();
        setConversations(response.data || []);

        // Set first conversation as active if none selected and there are conversations
        if (response.data && response.data.length > 0 && !activeConversation) {
          setActiveConversation(response.data[0].id);
        }
      } catch (apiError) {
        console.error("API error:", apiError);
        // Fallback to empty array if API fails
        setConversations([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      setError("Failed to load conversations. Please try again.");
      setLoading(false);
    }
  };

  // Fetch users for new conversation
  const fetchUsers = async () => {
    try {
      // Mock data for now - replace with actual API call when available
      const mockUsers = [
        { id: 1, username: "user1" },
        { id: 2, username: "user2" },
      ];

      // Filter out current user
      const filteredUsers = mockUsers.filter(
        (user) => user.id.toString() !== currentUserId
      );
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchUsers();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      const fetchMessages = async () => {
        try {
          const response = await chatService.getMessages(activeConversation);
          setMessages(response.data || []);
          scrollToBottom();
        } catch (error) {
          console.error("Failed to fetch messages:", error);
          // Set to empty array if API fails
          setMessages([]);
        }
      };

      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    } else {
      // Reset messages when no active conversation
      setMessages([]);
    }
  }, [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    try {
      // Send the message
      await chatService.sendMessage(activeConversation, newMessage);

      // Optimistically add the message to the UI
      const newMsg = {
        id: Date.now(), // Temporary ID
        sender_id: parseInt(currentUserId),
        content: newMessage,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMsg]);

      // Update the last message in the conversation list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation
            ? { ...conv, lastMessage: newMessage }
            : conv
        )
      );

      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleCreateConversation = async () => {
    if (!selectedUser) return;

    try {
      const userId = parseInt(selectedUser);
      const name =
        conversationName ||
        `Chat with ${users.find((u) => u.id === userId)?.username || "User"}`;

      const response = await chatService.createConversation(userId, name);

      // Add the new conversation to the list
      const selectedUserObj = users.find((u) => u.id === userId);
      const newConversation = {
        id: response.data.conversation_id,
        name: name,
        other_username: selectedUserObj?.username || "User",
        lastMessage: "",
        created_at: new Date().toISOString(),
      };

      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversation(response.data.conversation_id);
      setShowNewConversation(false);
      setSelectedUser("");
      setConversationName("");

      // Refresh conversations to ensure we have the latest data
      fetchConversations();
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  // Fallback to simple chat if we can't load conversations
  const renderSimpleChat = () => {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md mb-8 w-full">
        <h2 className="text-xl font-bold mb-4">Chat</h2>
        <div className="h-64 overflow-y-auto mb-4 border p-4 rounded">
          {messages.map((message, index) => (
            <div key={index} className="mb-2">
              <p className="font-semibold">{message.user || "User"}</p>
              <p className="text-gray-700">
                {message.message || message.content}
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 p-2 border rounded-l"
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white p-2 rounded-r"
          >
            Send
          </button>
        </div>
      </div>
    );
  };

  // If there's an error or we're still loading, show a simple message
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
        {renderSimpleChat()}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-4">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Chat</h1>

      {/* Always show the new conversation button */}
      <div className="mb-4">
        <button
          onClick={() => setShowNewConversation(!showNewConversation)}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
        >
          {showNewConversation ? "Cancel" : "New Conversation"}
        </button>

        {showNewConversation && (
          <div className="mt-4 p-4 bg-white rounded shadow-md">
            <h3 className="font-semibold mb-2">Start a new conversation</h3>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full p-2 mb-2 border rounded"
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Conversation name (optional)"
              value={conversationName}
              onChange={(e) => setConversationName(e.target.value)}
              className="w-full p-2 mb-2 border rounded"
            />
            <button
              onClick={handleCreateConversation}
              disabled={!selectedUser}
              className={`px-4 py-2 rounded ${
                selectedUser
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Create Conversation
            </button>
          </div>
        )}
      </div>

      {/* If no conversations, show a message */}
      {conversations.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-500 mb-4">
            You don't have any conversations yet.
          </p>
          <p className="text-gray-500">
            Click "New Conversation" to start chatting!
          </p>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-250px)] bg-white rounded-lg shadow-md">
          {/* Conversations sidebar */}
          <div className="w-1/4 bg-gray-100 rounded-l-lg overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 cursor-pointer border-b border-gray-200 ${
                  activeConversation === conv.id
                    ? "bg-blue-100"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => setActiveConversation(conv.id)}
              >
                <p className="font-semibold">
                  {conv.other_username || conv.name}
                </p>
                <p className="text-sm text-gray-500 truncate">
                  {conv.lastMessage || "No messages yet"}
                </p>
              </div>
            ))}
          </div>

          {/* Chat area */}
          <div className="w-3/4 flex flex-col">
            {activeConversation ? (
              <>
                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto">
                  {messages.length > 0 ? (
                    messages.map((message, index) => (
                      <div
                        key={message.id || index}
                        className={`flex mb-4 ${
                          message.sender_id?.toString() === currentUserId
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                            message.sender_id?.toString() === currentUserId
                              ? "bg-blue-500 text-white rounded-br-none"
                              : "bg-gray-200 text-gray-800 rounded-bl-none"
                          }`}
                        >
                          <p>{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.sender_id?.toString() === currentUserId
                                ? "text-blue-100"
                                : "text-gray-500"
                            }`}
                          >
                            {new Date(message.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <div className="border-t p-4 flex">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 p-2 border rounded-l resize-none"
                    placeholder="Type a message..."
                    rows="2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button
                    onClick={handleSend}
                    className="bg-blue-500 text-white p-2 rounded-r"
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">
                  Select a conversation to start chatting
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chats;
