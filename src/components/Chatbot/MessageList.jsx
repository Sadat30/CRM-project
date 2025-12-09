import React from 'react';

export default function MessageList({ messages, isTyping }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-3">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <p className="text-sm">Start a conversation!</p>
          <p className="text-xs mt-2">Ask about your tickets, account, or get help.</p>
        </div>
      )}

      {messages.map((message) => {
        const isCustomer = message.sender_type === 'customer';
        const isBot = message.sender_type === 'bot';
        const isSystem = message.sender_type === 'system';

        if (isSystem) {
          return (
            <div key={message.id} className="text-center text-xs text-gray-500 py-2">
              {message.message_text}
            </div>
          );
        }

        return (
          <div
            key={message.id}
            className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                isCustomer
                  ? 'bg-blue-600 text-white'
                  : isBot
                  ? 'bg-white border border-gray-200 text-gray-800'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {message.message_type === 'voice' && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🎤</span>
                  <span className="text-xs opacity-75">Voice message</span>
                </div>
              )}
              
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.message_text || message.text}
              </p>
              
              <p className={`text-xs mt-1 ${
                isCustomer ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {formatTime(message.created_at)}
              </p>
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

