'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { Conversation, Message } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { MessagesService } from '@/lib/services/messages.service';
import { Send, ArrowLeft, MoreHorizontal, Edit3, Image as ImageIcon, Smile } from 'lucide-react';

export default function MessagesPage() {
  const { conversations, user, sendMessage } = useApp();
  const [selectedConvId, setSelectedConvId] = useState<string>(conversations[0]?.id || 'conv_1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === selectedConvId) || conversations[0];

  useEffect(() => {
    if (selectedConvId) {
      const msgs = MessagesService.getMessages(selectedConvId);
      setMessages(msgs);
    }
  }, [selectedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedConvId) return;

    const newMsg = sendMessage(selectedConvId, inputMessage.trim());
    if (newMsg) {
      setMessages(prev => [...prev, newMsg]);
      setInputMessage('');
    }
  };

  return (
    <AppShell hideRightSidebar={true}>
      <div className="flex h-screen max-w-[960px] divide-x divide-white/10">
        {/* Left Pane: Conversation List */}
        <div className={`w-full md:w-[320px] flex-shrink-0 flex flex-col h-full ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-20">
            <h1 className="font-headline font-bold text-lg text-primary tracking-tight">Messages</h1>
            <button className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors">
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {conversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-4 flex items-center gap-3.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Image
                      src={conv.participant.avatar_url}
                      alt={conv.participant.full_name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full object-cover border border-white/10"
                    />
                    {conv.unread_count > 0 && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-white rounded-full border-2 border-black"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-white text-sm truncate">{conv.participant.full_name}</p>
                      <span className="text-on-surface-variant text-[11px] font-mono">
                        {conv.last_message ? formatTimeAgo(conv.last_message.created_at) : ''}
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-xs truncate">
                      {conv.last_message?.content || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Chat Window */}
        <div className={`flex-1 flex flex-col h-full bg-black ${!selectedConvId ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="h-14 px-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConvId('')}
                    className="md:hidden p-1.5 -ml-1 rounded-full hover:bg-white/10 text-white"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Image
                    src={activeConversation.participant.avatar_url}
                    alt={activeConversation.participant.full_name}
                    width={36}
                    height={36}
                    className="w-9 h-9 rounded-full object-cover border border-white/10"
                  />
                  <div>
                    <h2 className="font-bold text-sm text-white leading-tight">
                      {activeConversation.participant.full_name}
                    </h2>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      @{activeConversation.participant.username}
                    </span>
                  </div>
                </div>

                <button className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                <div className="text-center my-6 space-y-2">
                  <Image
                    src={activeConversation.participant.avatar_url}
                    alt="Participant"
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full mx-auto object-cover border border-white/20"
                  />
                  <h3 className="font-bold text-white text-base">{activeConversation.participant.full_name}</h3>
                  <p className="text-xs text-on-surface-variant font-mono max-w-xs mx-auto">
                    {activeConversation.participant.bio || 'Direct message thread in Chronicle.'}
                  </p>
                </div>

                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-white text-black font-medium rounded-br-sm'
                            : 'bg-white/10 text-white border border-white/10 rounded-bl-sm backdrop-blur-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-on-surface-variant font-mono mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center gap-2">
                <button
                  type="button"
                  className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setInputMessage(prev => prev + ' 🖤')}
                  className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Start a new direct message..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-body"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className="p-2.5 bg-primary text-black rounded-full hover:bg-white/90 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm font-mono p-8 text-center">
              Select a conversation from the left to start chatting.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
