import { useState, useEffect, useRef } from "react";
import { userService, offerService, chatService } from "../api/services";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../contexts/WebSocketContext";
import MediaUpload from "../components/MediaUpload";
import MediaDisplay from "../components/MediaDisplay";

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
  const [processingOfferIds, setProcessingOfferIds] = useState([]);
  const navigate = useNavigate();
  const [offerCache, setOfferCache] = useState({});
  const [fetchingOfferIds, setFetchingOfferIds] = useState([]);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState(false);

  const currentUserId = localStorage.getItem("user_id");
  const messagesEndRef = useRef(null);

  const { refreshTriggers } = useWebSocket();

  // Refresh conversations when WebSocket triggers a chat update
  useEffect(() => {
    if (refreshTriggers.chats > 0) {
      if (activeConversation) {
        const fetchMessages = async () => {
          try {
            const response = await chatService.getMessages(activeConversation);
            setMessages(response.data || []);
          } catch (error) {
            console.error("Failed to fetch messages:", error);
            setMessages([]);
          }
        };
        fetchMessages();
      }
    }
  }, [refreshTriggers.chats, activeConversation]);

  // Refresh conversations when WebSocket triggers a conversation update
  useEffect(() => {
    if (refreshTriggers.conversations > 0) {
      fetchConversations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTriggers.conversations]);

  const fetchOffer = async (offerId) => {
    // If no offer ID, return early
    if (!offerId) return null;

    // If we already have this offer in cache, return it
    if (offerCache[offerId]) {
      return offerCache[offerId];
    }

    // If we're already fetching this offer, don't start another request
    if (fetchingOfferIds.includes(offerId)) {
      return null;
    }

    try {
      setFetchingOfferIds((prev) => [...prev, offerId]);
      const response = await offerService.getOffer(offerId);

      // Update the cache with the new offer data
      setOfferCache((prev) => ({
        ...prev,
        [offerId]: response.data,
      }));

      return response.data;
    } catch (error) {
      console.error("Failed to fetch offer:", error);
      return null;
    } finally {
      setFetchingOfferIds((prev) => prev.filter((id) => id !== offerId));
    }
  };

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);

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
      const response = await userService.getUsers();

      const users = response.data || [];

      // Filter out current user
      const filteredUsers = users.filter(
        (user) => user.id.toString() !== currentUserId
      );
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const formatCurrency = (str, currencySymbol) => {
    // Remove any existing currency symbol and convert to a number
    const num = parseFloat(str.replace(/[^0-9.-]+/g, ""));

    // Format the number to 2 decimal places and remove trailing zeros if desired
    const formatted = num.toFixed(2);
    const finalFormatted = formatted.endsWith(".00")
      ? formatted.replace(".00", "")
      : formatted;

    return currencySymbol + finalFormatted;
  };

  // formatNegotiationMessage  - uses cached offer data
  const formatNegotiationMessage = (content, messageId, senderId, metadata) => {
    if (content.startsWith("Proposed new price:")) {
      // Extract information from the message
      const lines = content.split("\n");
      const priceText = formatCurrency(
        lines[0].replace("Proposed new price:", "").trim(),
        "$"
      );

      // Extract message if present
      let messageText = "";
      if (lines.length > 1 && lines[1].startsWith("Message:")) {
        messageText = lines[1].replace("Message:", "").trim();
      }

      // Get offer ID from metadata
      let offerId = null;
      if (metadata && metadata.offer_id) {
        offerId = metadata.offer_id;
      }

      // Get offer from cache if available
      const offer = offerId ? offerCache[offerId] : null;

      // If we have an offer ID but no cached offer data, trigger a fetch
      // This will happen only once per offer ID
      if (offerId && !offer && !fetchingOfferIds.includes(offerId)) {
        // Use a setTimeout to avoid React state update during render
        setTimeout(() => {
          fetchOffer(offerId);
        }, 0);
      }

      // Determine if current user is the sender or receiver
      const isCurrentUserSender = senderId.toString() === currentUserId;

      // Handle offer acceptance
      const handleAcceptOffer = async (e) => {
        e.stopPropagation(); // Prevent navigation

        if (!offerId) return;

        try {
          setProcessingOfferIds((prev) => [...prev, offerId]);

          if (currentUserId === offer.user_id.toString()) {
            // offer creator can accept counter offer
            await offerService.acceptCounterOffer(offerId);
          } else {
            // post owner can accept offer
            await offerService.acceptOffer(offerId);
          }

          // Send a confirmation message
          await chatService.sendMessage(
            activeConversation,
            `I've accepted the offer of ${priceText}. Let's proceed with the transaction!`
          );

          // Refresh the offer in cache
          await fetchOffer(offerId);

          // Refresh messages
          const response = await chatService.getMessages(activeConversation);
          setMessages(response.data || []);

          // reload page ?
          window.location.reload();
        } catch (error) {
          console.error("Failed to accept offer:", error);
          alert("Failed to accept the offer. Please try again.");
        } finally {
          setProcessingOfferIds((prev) => prev.filter((id) => id !== offerId));
        }
      };

      // Handle navigation to offer details
      const navigateToOfferDetails = () => {
        if (offerId) {
          navigate(`/offers/${offerId}`);
        }
      };

      const isProcessing = offerId && processingOfferIds.includes(offerId);
      // const isPending = offer ? offer.status === "pending" : true; // Default to true if we don't know yet

      return (
        <div
          className="bg-blue-50 p-3 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100"
          onClick={navigateToOfferDetails}
        >
          <div className="flex items-center mb-2">
            <svg
              className="w-5 h-5 text-blue-500 mr-2"
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
            <span className="font-medium text-blue-800">Price Negotiation</span>
            {offerId && (
              <span className="ml-2 text-xs text-blue-600">
                (Click to view details)
              </span>
            )}
          </div>
          <p className="text-lg font-bold text-blue-700 mb-2">{priceText}</p>
          {messageText && <p className="text-gray-700 mb-3">{messageText}</p>}

          {/* Show status if not pending */}
          {offer && offer.status !== "pending" && (
            <div className="mt-2">
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  metadata.offer_status && metadata.offer_status === "accepted"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                  // offer.status === "accepted"
                  //   ? "bg-green-100 text-green-800"
                  //   : "bg-red-100 text-red-800"
                }`}
              >
                {/* {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)} */}
                {metadata.offer_status
                  ? metadata.offer_status.charAt(0).toUpperCase() +
                    metadata.offer_status.slice(1)
                  : "Missing status"}
              </span>
            </div>
          )}

          {/* Show accept button if this is not the sender's message, we have an offer ID, and the offer is pending */}
          {offerId &&
            !isCurrentUserSender &&
            offer &&
            offer.status === "pending" && (
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleAcceptOffer}
                  disabled={isProcessing}
                  className={`px-3 py-1 rounded text-sm ${
                    isProcessing
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {isProcessing ? "Processing..." : "Accept this price"}
                </button>
              </div>
            )}
        </div>
      );
    }
    return <p>{content}</p>;
  };

  const formatMessageContent = (message) => {
    if (message.content.startsWith("Proposed new price:")) {
      return formatNegotiationMessage(
        message.content,
        message.id,
        message.sender_id,
        message.metadata ? JSON.parse(message.metadata) : null
      );
    }

    // If it has media
    if (message.media && message.media.length > 0) {
      return (
        <div>
          {message.content && <p className="mb-2">{message.content}</p>}
          <MediaDisplay
            mediaItems={message.media.map((item) => ({
              url: item.presigned_url,
              type: item.mime_type,
              name: item.file_name,
              objectKey: item.object_key,
            }))}
            compact={true}
          />
        </div>
      );
    }

    // Regular text message
    return <p>{message.content}</p>;
  };

  const handleMediaUpload = (files) => {
    setMediaFiles([...mediaFiles, ...files]);
    setShowMediaUpload(false);
    setUploadedMedia(true);
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
          // scrollToBottom();
        } catch (error) {
          console.error("Failed to fetch messages:", error);
          // Set to empty array if API fails
          setMessages([]);
        }
      };

      fetchMessages();
      // No longer needed since we are using the websocket
      // const interval = setInterval(fetchMessages, 3000);
      // return () => clearInterval(interval);
    } else {
      // Reset messages when no active conversation
      setMessages([]);
    }
  }, [activeConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && mediaFiles.length === 0) || !activeConversation)
      return;

    if (showMediaUpload && !uploadedMedia) {
      alert("Please upload media before sending.");
      return;
    }

    try {
      setUploadingMedia(mediaFiles.length > 0);

      const mediaObjectKeys = mediaFiles.map((file) => file.objectKey);

      const response = await chatService.sendMessage(
        activeConversation,
        newMessage,
        mediaObjectKeys.length > 0 ? mediaObjectKeys : undefined
      );

      // Optimistically add the message to the UI
      const newMsg = {
        id: response.data.message_id,
        sender_id: parseInt(currentUserId),
        content: newMessage,
        message_type: response.data.message_type,
        created_at: response.data.created_at,
        media: mediaFiles.map((file) => ({
          object_key: file.objectKey,
          file_name: file.name,
          mime_type: file.type,
          size: file.size,
        })),
      };

      setMessages((prev) => [...prev, newMsg]);

      // Update the last message in the conversation list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversation
            ? {
                ...conv,
                lastMessage:
                  mediaFiles.length > 0 && !newMessage.trim()
                    ? "Sent media"
                    : newMessage,
              }
            : conv
        )
      );

      // Clear the input and media files
      setNewMessage("");
      setMediaFiles([]);
      setShowMediaUpload(false);
      setUploadingMedia(false);

      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      setUploadingMedia(false);
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
                          {formatMessageContent(message)}
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

                <div className="border-t p-4 flex flex-col">
                  {showMediaUpload && (
                    <div className="mb-4">
                      <MediaUpload
                        onUploadComplete={handleMediaUpload}
                        allowMultiple={true}
                      />
                      <button
                        onClick={() => setShowMediaUpload(false)}
                        className="mt-2 text-gray-500 hover:text-gray-700 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Preview of media to be sent */}
                  {!showMediaUpload && mediaFiles.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600">
                          Media to send ({mediaFiles.length}):
                        </p>
                        <button
                          onClick={() => setMediaFiles([])}
                          className="text-red-500 text-xs hover:text-red-700"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {mediaFiles.map((file, index) => (
                          <div key={index} className="relative">
                            {file.type.startsWith("image/") ? (
                              <img
                                src={file.preview}
                                alt={file.name}
                                className="w-16 h-16 object-cover rounded border border-gray-200"
                              />
                            ) : file.type.startsWith("video/") ? (
                              <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-6 w-6 text-gray-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200">
                                <span className="text-xs text-gray-500 p-1 text-center overflow-hidden">
                                  {file.name}
                                </span>
                              </div>
                            )}
                            <button
                              onClick={() =>
                                setMediaFiles(
                                  mediaFiles.filter((_, i) => i !== index)
                                )
                              }
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 p-2 border rounded-l resize-none"
                      placeholder={
                        mediaFiles.length > 0
                          ? "Add a message (optional)..."
                          : "Type a message..."
                      }
                      rows="2"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <div className="flex flex-col">
                      <button
                        onClick={() => setShowMediaUpload(!showMediaUpload)}
                        className={`p-2 ${
                          showMediaUpload
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                        title="Upload Media"
                        disabled={uploadingMedia}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={handleSend}
                        className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600 flex-grow"
                        disabled={
                          (!newMessage.trim() && mediaFiles.length === 0) ||
                          uploadingMedia
                        }
                      >
                        {uploadingMedia ? (
                          <span className="flex items-center justify-center">
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Sending...
                          </span>
                        ) : (
                          "Send"
                        )}
                      </button>
                    </div>
                  </div>
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

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default Chats;
