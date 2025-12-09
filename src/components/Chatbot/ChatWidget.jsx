import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { API_BASE, SOCKET_URL } from '../../config/api';

export default function ChatWidget({ contactId, tenantId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize chat session
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_BASE}/chat/sessions`,
          { contact_id: contactId, tenant_id: tenantId },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setSessionId(response.data.session_id);
      } catch (err) {
        console.error('Error creating session:', err);
      }
    };

    if (contactId && tenantId) {
      initializeChat();
    }
  }, [contactId, tenantId]);

  // Connect to WebSocket
  useEffect(() => {
    if (!sessionId) return;

    const newSocket = io(SOCKET_URL, {
      query: { sessionId, contactId, tenantId },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    newSocket.on('message', (message) => {
      setMessages(prev => {
        // For customer messages: replace temp message with real one from server
        if (message.sender_type === 'customer') {
          return prev.map(m => {
            // Match temp message by text and sender type
            if (m.id?.toString().startsWith('temp-') && 
                m.text === (message.message_text || message.text) && 
                m.sender_type === 'customer') {
              return message; // Replace temp with real message
            }
            return m;
          }).filter(m => {
            // Remove if it's a temp message that was just replaced
            // (in case there are multiple matches, keep only the real one)
            if (m.id === message.id) return true;
            if (m.id?.toString().startsWith('temp-') && 
                m.text === (message.message_text || message.text) && 
                m.sender_type === 'customer') {
              return false; // Remove duplicate temp
            }
            return true;
          });
        }
        
        // For bot messages: just add (no duplicates expected)
        // Check if message already exists by ID
        const exists = prev.some(m => m.id === message.id);
        if (exists) {
          return prev; // Don't add duplicate
        }
        
        return [...prev, message];
      });
      scrollToBottom();
    });

    newSocket.on('typing', (data) => {
      setIsTyping(data.typing);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    setSocket(newSocket);

    // Load message history
    loadMessageHistory(sessionId);

    return () => {
      newSocket.close();
    };
  }, [sessionId]);

  const loadMessageHistory = async (sessionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE}/chat/sessions/${sessionId}/messages`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessages(response.data);
      scrollToBottom();
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (text) => {
    if (!text.trim() || !socket || !isConnected) return;

    const message = {
      session_id: sessionId,
      text: text.trim(),
      sender_type: 'customer',
      contact_id: contactId
    };

    // Optimistically add message (will be replaced by server response)
    const tempMessage = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      sender_type: 'customer',
      sender_id: contactId,
      message_text: text.trim(),
      text: text.trim(), // Support both field names
      message_type: 'text',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);

    // Send via WebSocket
    socket.emit('message', message);
  };

  const handleSendVoice = async (audioBlob) => {
    if (!socket || !isConnected || !sessionId) return;

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-message.webm');
      formData.append('session_id', sessionId);
      formData.append('contact_id', contactId);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/chat/voice`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Add system message indicating voice was sent
      setMessages(prev => [...prev, {
        id: `voice-${Date.now()}`,
        session_id: sessionId,
        sender_type: 'customer',
        message_type: 'voice',
        message_text: 'Voice message',
        created_at: new Date().toISOString()
      }]);
    } catch (err) {
      console.error('Error sending voice:', err);
      alert('Failed to send voice message');
    }
  };

  return (
    <div className="w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Customer Support</h3>
          <p className="text-xs text-blue-100">
            {isConnected ? '● Online' : '○ Offline'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <MessageList messages={messages} isTyping={isTyping} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <MessageInput
          onSend={handleSendMessage}
          onVoice={handleSendVoice}
          disabled={!isConnected}
        />
      </div>
    </div>
  );
}

