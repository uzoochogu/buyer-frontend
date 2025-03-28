import React, { useState, useEffect, useRef } from "react";
import { chatService } from "../api/api";

const Chats = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await chatService.getChats();
        setMessages(response.data);
        scrollToBottom();
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };

    fetchMessages();
    const pollInterval = setInterval(fetchMessages, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      await chatService.sendChat(newMessage);
      setNewMessage("");
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="bg-white p-4 rounded-lg shadow-md mb-8">
        <div className="h-64 overflow-y-auto mb-4">
          {messages.map((message) => (
            <div key={message.id} className="mb-2">
              <p className="font-semibold">{message.user}</p>
              <p className="text-gray-700">{message.message}</p>
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
          />
          <button
            onClick={handleSend}
            className="bg-blue-500 text-white p-2 rounded-r"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};


export default Chats;
