import React, { useState, useEffect } from 'react';
import ChatWidget from '../components/Chatbot/ChatWidget';
import axios from 'axios';
import { API_BASE } from '../config/api';

export default function ChatbotDemo() {
  const [contactId, setContactId] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user info from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setTenantId(user.tenant_id);

      // For demo, we'll use the first contact or create a test contact
      // In production, this would be the logged-in customer's contact ID
      loadOrCreateContact(user.tenant_id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadOrCreateContact = async (tenantId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Try to get first contact for this tenant
      const response = await axios.get(
        `${API_BASE}/contacts?limit=1`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.length > 0) {
        setContactId(response.data[0].id);
      } else {
        // Create a test contact for demo
        const createResponse = await axios.post(
          `${API_BASE}/contacts`,
          {
            name: 'Demo Customer',
            email: 'demo@example.com',
            company: 'Demo Company'
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setContactId(createResponse.data.id);
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading contact:', err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!contactId || !tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Chatbot Demo</h2>
          <p className="text-gray-600 mb-4">Please login to use the chatbot.</p>
          <a href="/login" className="text-blue-600 hover:text-blue-800">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Customer Support Chatbot</h1>
          <p className="text-gray-600 mb-4">
            This is a demo of the in-app customer support chatbot. 
            The chatbot uses Google Gemini AI to understand your queries and fetch data from the CRM.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">Try asking:</h3>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li>"What's the status of ticket #1?"</li>
              <li>"Create a ticket for login issues"</li>
              <li>"Tell me about my account"</li>
              <li>"I need help with my order"</li>
            </ul>
          </div>

          <button
            onClick={() => setShowChat(!showChat)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showChat ? 'Hide Chat' : 'Open Chat Widget'}
          </button>
        </div>

        {showChat && (
          <ChatWidget
            contactId={contactId}
            tenantId={tenantId}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
    </div>
  );
}

