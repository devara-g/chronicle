'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { Message, Profile } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { MessagesService } from '@/lib/services/messages.service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { 
  Send, 
  ArrowLeft, 
  MoreHorizontal, 
  Edit3, 
  Smile, 
  Search, 
  X,
  MessageSquarePlus,
  User as UserIcon
} from 'lucide-react';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('user');

  const { conversations, user, sendMessage, refreshConversations, markConversationAsRead } = useApp();
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set initial selected conversation on desktop
  useEffect(() => {
    if (conversations.length > 0 && !selectedConvId && !targetUserId && typeof window !== 'undefined' && window.innerWidth >= 768) {
      setSelectedConvId(conversations[0].id);
      markConversationAsRead(conversations[0].id);
    }
  }, [conversations, selectedConvId, targetUserId, markConversationAsRead]);

  // Handle opening conversation from ?user= query param
  useEffect(() => {
    if (targetUserId && user) {
      async function openDirectChat() {
        const convId = await MessagesService.getOrCreateConversation(user!.id, targetUserId!);
        if (convId) {
          await refreshConversations();
          setSelectedConvId(convId);
          markConversationAsRead(convId);
        }
      }
      openDirectChat();
    }
  }, [targetUserId, user, refreshConversations, markConversationAsRead]);

  const activeConversation = conversations.find(c => c.id === selectedConvId);

  // Fetch messages and mark as read when conversation is selected
  useEffect(() => {
    if (!selectedConvId || !user) return;

    let isMounted = true;
    async function loadChatMessages() {
      const msgs = await MessagesService.getMessages(selectedConvId);
      if (isMounted) {
        setMessages(msgs);
        markConversationAsRead(selectedConvId);
      }
    }
    loadChatMessages();

    return () => {
      isMounted = false;
    };
  }, [selectedConvId, user, markConversationAsRead]);

  // Realtime subscription for incoming messages
  useEffect(() => {
    if (!selectedConvId || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`chat:${selectedConvId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConvId}`,
        },
        (payload) => {
          if (payload.new) {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            if (user && newMsg.sender_id !== user.id) {
              MessagesService.markAsRead(selectedConvId, user.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConvId, user]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search users for new chat
  useEffect(() => {
    if (!isNewChatModalOpen || !user) return;
    async function findUsers() {
      setLoadingUsers(true);
      const results = await MessagesService.searchUsers(searchUserQuery, user!.id);
      setSearchedUsers(results);
      setLoadingUsers(false);
    }
    const timer = setTimeout(findUsers, 200);
    return () => clearTimeout(timer);
  }, [searchUserQuery, isNewChatModalOpen, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedConvId || !user || sending) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const sentMsg = await sendMessage(selectedConvId, text);
      if (sentMsg) {
        setMessages(prev => {
          if (prev.some(m => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleStartChatWithUser = async (targetUser: Profile) => {
    if (!user) return;
    const convId = await MessagesService.getOrCreateConversation(user.id, targetUser.id);
    if (convId) {
      await refreshConversations();
      setSelectedConvId(convId);
      setIsNewChatModalOpen(false);
      setSearchUserQuery('');
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.participant.full_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    c.participant.username.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <AppShell fullWidth={true} hideRightSidebar={true} hideMobileNav={!!selectedConvId}>
      <div className="flex w-full h-screen overflow-hidden">
        {/* ======================================================== */}
        {/* Left Pane: Conversation List */}
        {/* ======================================================== */}
        <div className={`w-full md:w-[360px] lg:w-[400px] flex-shrink-0 flex flex-col h-screen border-r border-white/10 bg-[#070707] ${
          selectedConvId ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Header */}
          <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#070707]/90 backdrop-blur-xl z-20">
            <h1 className="font-headline font-bold text-xl text-white tracking-tight">Messages</h1>
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all active:scale-90"
              title="New direct message"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          </div>

          {/* Search conversation bar */}
          <div className="p-3 border-b border-white/5">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3.5 py-2 text-sm text-white focus-within:border-white/30 focus-within:bg-white/10 transition-all">
              <Search className="w-4 h-4 text-on-surface-variant flex-shrink-0" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search Direct Messages"
                className="w-full bg-transparent border-none text-white text-xs placeholder:text-outline focus:outline-none font-body"
              />
              {filterQuery && (
                <button onClick={() => setFilterQuery('')} className="text-on-surface-variant hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center space-y-4 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
                  <MessageSquarePlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Welcome to your inbox!</h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Drop a line, share posts, and start real-time conversations with other creators in the noir.
                  </p>
                </div>
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-5 py-2.5 bg-primary text-black rounded-full text-xs font-headline font-bold hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                >
                  Write a message
                </button>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-on-surface-variant">
                No conversations found matching "{filterQuery}".
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === selectedConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      markConversationAsRead(conv.id);
                    }}
                    className={`p-3.5 flex items-center gap-3.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-white/[0.1] border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]' 
                        : 'hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <Image
                        src={conv.participant.avatar_url || '/default-avatar.jpg'}
                        alt={conv.participant.full_name}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover border border-white/10"
                      />
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-sky-400 rounded-full border-2 border-black animate-pulse"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-white text-[15px] truncate">{conv.participant.full_name}</p>
                        <span className="text-on-surface-variant text-[11px] font-mono">
                          {conv.last_message ? formatTimeAgo(conv.last_message.created_at) : ''}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-white font-medium' : 'text-on-surface-variant'}`}>
                        {conv.last_message?.content || 'Started conversation'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* Right Pane: Chat Window */}
        {/* ======================================================== */}
        <div className={`flex-1 flex flex-col h-screen bg-black ${
          !selectedConvId ? 'hidden md:flex' : 'flex fixed inset-0 z-50 md:static'
        }`}>
          {activeConversation ? (
            <>
              {/* Chat Top Header */}
              <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/80 backdrop-blur-xl z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConvId('')}
                    className="md:hidden p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-all active:scale-90"
                    title="Back to conversation list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div 
                    onClick={() => router.push(`/profile/${activeConversation.participant.username}`)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <Image
                      src={activeConversation.participant.avatar_url || '/default-avatar.jpg'}
                      alt={activeConversation.participant.full_name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:scale-105 transition-transform"
                    />
                    <div>
                      <h2 className="font-bold text-[15px] text-white leading-tight group-hover:underline">
                        {activeConversation.participant.full_name}
                      </h2>
                      <span className="text-xs text-on-surface-variant font-mono">
                        @{activeConversation.participant.username}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => router.push(`/profile/${activeConversation.participant.username}`)}
                    className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                    title="View Profile"
                  >
                    <UserIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {/* Participant Bio Card in Thread */}
                <div className="text-center py-8 space-y-2 border-b border-white/5 mb-4">
                  <Image
                    src={activeConversation.participant.avatar_url || '/default-avatar.jpg'}
                    alt="Participant"
                    width={72}
                    height={72}
                    className="w-18 h-18 rounded-full mx-auto object-cover border-2 border-white/20 shadow-xl"
                  />
                  <h3 className="font-headline font-bold text-white text-lg">{activeConversation.participant.full_name}</h3>
                  <p className="text-xs text-on-surface-variant font-mono">@{activeConversation.participant.username}</p>
                  {activeConversation.participant.bio && (
                    <p className="text-xs text-white/70 max-w-sm mx-auto font-body leading-relaxed pt-1">
                      {activeConversation.participant.bio}
                    </p>
                  )}
                  <p className="text-[11px] font-mono text-on-surface-variant pt-2 opacity-60">
                    Encrypted direct message channel in Chronicle.
                  </p>
                </div>

                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words shadow-md ${
                          isMe
                            ? 'bg-white text-black font-medium rounded-tr-xs'
                            : 'bg-white/[0.08] text-white border border-white/10 rounded-tl-xs backdrop-blur-md'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-on-surface-variant font-mono mt-1 px-1 opacity-70">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <div className="p-3 md:p-4 border-t border-white/10 bg-black/80 backdrop-blur-xl">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2 bg-white/5 border border-white/15 rounded-full px-3 py-1.5 focus-within:border-white/35 focus-within:bg-white/[0.08] transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)]">
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
                    placeholder="Start a new message..."
                    autoFocus
                    className="flex-1 bg-transparent border-none text-white text-sm placeholder:text-outline focus:outline-none font-body px-2"
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || sending}
                    className="p-2.5 bg-primary text-black rounded-full hover:bg-white/90 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant text-sm font-mono p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-2">
                <MessageSquarePlus className="w-8 h-8" />
              </div>
              <div>
                <p className="text-white font-headline font-bold text-lg mb-1">Select a message</p>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  Choose from your existing conversations, or start a new message with any creator in the network.
                </p>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="px-6 py-3 bg-primary text-black rounded-full font-headline font-bold text-xs hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                New Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div 
            className="w-full max-w-md bg-[#0e0e0e] border border-white/15 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsNewChatModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-headline font-bold text-base text-white">New Message</h3>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-white/[0.02]">
              <Search className="w-4 h-4 text-on-surface-variant" />
              <input
                type="text"
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
                placeholder="Search people by name or @username..."
                autoFocus
                className="w-full bg-transparent border-none text-white text-sm placeholder:text-outline focus:outline-none font-body"
              />
            </div>

            {/* User List */}
            <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5 p-2">
              {loadingUsers ? (
                <div className="p-6 text-center text-xs font-mono text-on-surface-variant">Searching users...</div>
              ) : searchedUsers.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-on-surface-variant">
                  {searchUserQuery ? 'No users found matching that name.' : 'Type a name or username to search.'}
                </div>
              ) : (
                searchedUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleStartChatWithUser(u)}
                    className="p-3 flex items-center justify-between rounded-xl hover:bg-white/[0.06] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={u.avatar_url || '/default-avatar.jpg'}
                        alt={u.full_name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                      />
                      <div>
                        <p className="font-bold text-white text-sm leading-tight group-hover:text-primary transition-colors">
                          {u.full_name}
                        </p>
                        <p className="text-xs text-on-surface-variant font-mono">@{u.username}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-primary group-hover:underline">Chat →</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <AppShell fullWidth={true} hideRightSidebar={true}>
        <div className="flex h-screen items-center justify-center text-xs font-mono text-on-surface-variant">
          Loading messages...
        </div>
      </AppShell>
    }>
      <MessagesContent />
    </Suspense>
  );
}
