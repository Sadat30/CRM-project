import React, { useState, useEffect } from 'react';
import ChatWidget from './ChatWidget';
import axios from 'axios';
import { API_BASE } from '../../config/api';

export default function CollapsibleChatWidget() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contactId, setContactId] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      setLoading(false);
      return;
    }

    const user = JSON.parse(userStr);
    setTenantId(user.tenant_id);

    // Load or create contact for the logged-in user
    loadOrCreateContact(user.tenant_id);
  }, []);

  const loadOrCreateContact = async (tenantId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Try to find a contact matching the logged-in user's email
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr);
      
      if (user.email) {
        // Try to find contact by email using search query
        const response = await axios.get(
          `${API_BASE}/contacts?q=${encodeURIComponent(user.email)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        // Filter to exact email match (since search is LIKE)
        const exactMatch = response.data.find(contact => contact.email === user.email);
        if (exactMatch) {
          setContactId(exactMatch.id);
          setLoading(false);
          return;
        }
      }

      // If no contact found, try to get first contact for this tenant
      const allContactsResponse = await axios.get(
        `${API_BASE}/contacts?limit=1`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (allContactsResponse.data.length > 0) {
        setContactId(allContactsResponse.data[0].id);
      } else {
        // Create a contact for the logged-in user
        const createResponse = await axios.post(
          `${API_BASE}/contacts`,
          {
            name: user.full_name || user.email,
            email: user.email,
            company: user.tenant_name || 'Customer'
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

  // Don't render if not logged in or still loading
  const token = localStorage.getItem('token');
  if (!token || loading || !contactId || !tenantId) {
    return null;
  }

  if (!isExpanded) {
    // Collapsed state - show floating button
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center z-50 group hover:scale-110"
        aria-label="Open customer support chat"
        title="Open customer support chat"
      >
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </button>
    );
  }

  // Expanded state - show full chat widget
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <ChatWidget
        contactId={contactId}
        tenantId={tenantId}
        onClose={() => setIsExpanded(false)}
      />
    </div>
  );
}

