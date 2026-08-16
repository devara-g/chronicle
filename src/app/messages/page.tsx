'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Image from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useApp } from '@/context/AppContext';
import { Message, Profile } from '@/types';
import { formatTimeAgo } from '@/lib/utils';
import { MessagesService } from '@/lib/services/messages.service';
import { StorageService } from '@/lib/services/storage.service';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { EmojiPicker } from '@/components/ui/EmojiPicker';
import { AudioMessagePlayer } from '@/components/chat/AudioMessagePlayer';
import { ImageLightboxModal } from '@/components/ui/ImageLightboxModal';
import { 
  Send, 
  ArrowLeft, 
  MoreVertical, 
  Edit3, 
  Smile, 
  Search, 
  X, 
  MessageSquarePlus, 
  User as UserIcon,
  Image as ImageIcon,
  Mic,
  Trash2,
  Reply,
  Edit2,
  Copy,
  Check,
  Loader2
} from 'lucide-react';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('user');

  const { conversations, user, refreshConversations, markConversationAsRead } = useApp();
  const [selectedConvId, setSelectedConvId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');

  // Image Upload state
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Edit state
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Voice Note state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lightbox state
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Context Menu State
  const [activeMenuMsgId, setActiveMenuMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const activeConversation = conversations.find((c) => c.id === selectedConvId);

  // Fetch messages and mark as read when conversation is selected
  useEffect(() => {
    if (!selectedConvId || !user) return;

    setIsOtherTyping(false);
    setReplyingTo(null);
    setEditingMessage(null);
    setSelectedMediaFile(null);
    setMediaPreviewUrl(null);
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

  // Realtime subscription for incoming messages, edits, deletes, and typing broadcast
  useEffect(() => {
    if (!selectedConvId || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`chat:${selectedConvId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConvId}`,
        },
        async (payload) => {
          if (payload.new) {
            const rawNewMsg = payload.new as Message;
            if (rawNewMsg.reply_to_id) {
              const msgs = await MessagesService.getMessages(selectedConvId);
              setMessages(msgs);
            } else {
              setMessages((prev) => {
                if (prev.some((m) => m.id === rawNewMsg.id)) return prev;
                return [...prev, rawNewMsg];
              });
            }
            setIsOtherTyping(false);
            if (user && rawNewMsg.sender_id !== user.id) {
              MessagesService.markAsRead(selectedConvId, user.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConvId}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as Message;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === updated.id
                  ? { ...m, content: updated.content, is_edited: updated.is_edited }
                  : m
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConvId}`,
        },
        (payload) => {
          if (payload.old && payload.old.id) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.userId !== user?.id) {
          setIsOtherTyping(!!payload.payload?.isTyping);
          if (payload.payload?.isTyping) {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
              setIsOtherTyping(false);
            }, 3500);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [selectedConvId, user]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherTyping]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuMsgId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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

  // Voice note recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputMessage(text);

    if (channelRef.current && user && selectedConvId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, isTyping: text.trim().length > 0 },
      });
    }
  };

  // Image Selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image file size must be under 10MB.');
      return;
    }

    setSelectedMediaFile(file);
    const previewUrl = URL.createObjectURL(file);
    setMediaPreviewUrl(previewUrl);
    messageInputRef.current?.focus();
  };

  const removeSelectedImage = () => {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setSelectedMediaFile(null);
    setMediaPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Voice Recorder Controls
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      alert('Microphone access was denied or is unavailable on this device.');
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  const sendVoiceNote = async () => {
    if (!mediaRecorderRef.current || !selectedConvId || !user) return;

    const duration = recordingDuration;
    setIsRecording(false);
    setSending(true);

    mediaRecorderRef.current.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];

        // Upload to Supabase Storage
        const audioUrl = await StorageService.uploadAudioBlob(audioBlob, user.id);

        const sentMsg = await MessagesService.sendMessage(
          selectedConvId,
          user.id,
          '🎙️ Voice Note',
          audioUrl,
          'audio',
          replyingTo?.id || null,
          duration
        );

        if (sentMsg) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === sentMsg.id)) return prev;
            return [...prev, sentMsg];
          });
          setReplyingTo(null);
        }
      } catch (err) {
        console.error('Failed to send voice note:', err);
        alert('Failed to upload voice note. Please try again.');
      } finally {
        setSending(false);
        setRecordingDuration(0);
      }
    };

    mediaRecorderRef.current.stop();
  };

  // Send Message (Text / Image / Edit / Reply)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !user || sending) return;

    // Handle Edit Message Mode
    if (editingMessage) {
      if (!inputMessage.trim()) return;
      setSending(true);
      try {
        const success = await MessagesService.editMessage(editingMessage.id, inputMessage.trim());
        if (success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === editingMessage.id
                ? { ...m, content: inputMessage.trim(), is_edited: true }
                : m
            )
          );
          setEditingMessage(null);
          setInputMessage('');
        }
      } catch (err) {
        console.error('Failed to edit message:', err);
      } finally {
        setSending(false);
      }
      return;
    }

    // Handle Standard Send or Image Send
    if (!inputMessage.trim() && !selectedMediaFile) return;

    const text = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, isTyping: false },
      });
    }

    try {
      let uploadedImageUrl: string | null = null;
      if (selectedMediaFile) {
        setUploadingMedia(true);
        uploadedImageUrl = await StorageService.uploadMedia(selectedMediaFile, user.id);
        removeSelectedImage();
      }

      const sentMsg = await MessagesService.sendMessage(
        selectedConvId,
        user.id,
        text,
        uploadedImageUrl,
        uploadedImageUrl ? 'image' : null,
        replyingTo?.id || null
      );

      if (sentMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [
            ...prev,
            {
              ...sentMsg,
              reply_to:
                replyingTo && replyingTo.id
                  ? {
                      id: replyingTo.id,
                      sender_id: replyingTo.sender_id,
                      sender_name:
                        replyingTo.sender_id === user.id
                          ? 'You'
                          : activeConversation?.participant.full_name || 'User',
                      content: replyingTo.content,
                      media_type: replyingTo.media_type,
                    }
                  : null,
            },
          ];
        });
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
      setUploadingMedia(false);
    }
  };

  // Delete Message Action
  const handleDeleteMessage = async (msg: Message) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const success = await MessagesService.deleteMessage(msg.id, msg.media_url);
      if (success) {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Copy Message Text
  const handleCopyMessage = async (msg: Message) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Start Edit Message
  const handleStartEdit = (msg: Message) => {
    setEditingMessage(msg);
    setInputMessage(msg.content);
    setReplyingTo(null);
    removeSelectedImage();
    messageInputRef.current?.focus();
  };

  // Start Reply Message
  const handleStartReply = (msg: Message) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    messageInputRef.current?.focus();
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

  const filteredConversations = conversations.filter(
    (c) =>
      c.participant.full_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
      c.participant.username.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AppShell fullWidth={true} hideRightSidebar={true} hideMobileNav={!!selectedConvId}>
      {/* Hidden File Input for Image attachments */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept="image/*"
        className="hidden"
      />

      {/* Lightbox for full-res image viewing */}
      <ImageLightboxModal
        isOpen={!!lightboxImageUrl}
        imageUrl={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />

      <div className="flex w-full h-[100dvh] md:h-screen overflow-hidden">
        {/* ======================================================== */}
        {/* Left Pane: Conversation List */}
        {/* ======================================================== */}
        <div
          className={`w-full md:w-[360px] lg:w-[400px] flex-shrink-0 flex flex-col h-[100dvh] md:h-screen border-r border-white/10 bg-[#070707] ${
            selectedConvId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="h-14 md:h-16 px-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#070707]/90 backdrop-blur-xl z-20 shrink-0">
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
          <div className="p-3 border-b border-white/5 shrink-0">
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
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center space-y-4 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
                  <MessageSquarePlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Welcome to your inbox!</h3>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Drop a line, share photos, and start real-time conversations with other creators in the noir.
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
                        className="w-12 h-12 rounded-full object-cover border border-white/10 aspect-square shrink-0"
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
                      <div
                        className={`text-xs truncate flex items-center gap-1.5 ${
                          conv.unread_count > 0 ? 'text-white font-medium' : 'text-on-surface-variant'
                        }`}
                      >
                        {conv.last_message?.media_type === 'image' ? (
                          <>
                            <ImageIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>Photo</span>
                          </>
                        ) : conv.last_message?.media_type === 'audio' ? (
                          <>
                            <Mic className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span>Voice note</span>
                          </>
                        ) : (
                          <span className="truncate">{conv.last_message?.content || 'Started conversation'}</span>
                        )}
                      </div>
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
        <div
          className={`h-[100dvh] md:h-screen flex flex-col bg-black ${
            !selectedConvId ? 'hidden md:flex md:flex-1' : 'fixed inset-0 z-50 w-full md:static md:flex-1'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Top Header */}
              <div className="h-14 md:h-16 px-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-black/90 backdrop-blur-xl z-20 shrink-0">
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
                      className="w-10 h-10 rounded-full object-cover border border-white/10 aspect-square shrink-0 group-hover:scale-105 transition-transform"
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
              <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4">
                {/* Participant Bio Card in Thread */}
                <div className="text-center py-6 md:py-8 space-y-2 border-b border-white/5 mb-4">
                  <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden border-2 border-white/20 shadow-xl aspect-square shrink-0 bg-white/5">
                    <Image
                      src={activeConversation.participant.avatar_url || '/default-avatar.jpg'}
                      alt="Participant"
                      fill
                      className="object-cover"
                    />
                  </div>
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
                  const isMenuOpen = activeMenuMsgId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group/msg relative animate-fade-in`}
                    >
                      {/* Replying Context Quote Header */}
                      {msg.reply_to && msg.reply_to.id && (
                        <div
                          onClick={() => {
                            const el = document.getElementById(`msg-${msg.reply_to_id}`);
                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className={`flex items-center gap-1.5 mb-1 px-3 py-1 rounded-xl text-xs font-mono cursor-pointer transition-opacity hover:opacity-100 ${
                            isMe ? 'bg-white/10 text-white/80' : 'bg-white/5 text-on-surface-variant'
                          } opacity-75 max-w-[85%] md:max-w-[70%] truncate`}
                        >
                          <Reply className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="font-semibold text-white/90 truncate">{msg.reply_to.sender_name}:</span>
                          <span className="truncate flex items-center gap-1">
                            {msg.reply_to.media_type === 'image' || msg.reply_to.content?.includes('📷') ? (
                              <>
                                <ImageIcon className="w-3 h-3 text-sky-400 shrink-0 inline" />
                                <span>Photo</span>
                              </>
                            ) : msg.reply_to.media_type === 'audio' || msg.reply_to.content?.includes('🎙️') ? (
                              <>
                                <Mic className="w-3 h-3 text-red-400 shrink-0 inline" />
                                <span>Voice note</span>
                              </>
                            ) : (
                              <span>{msg.reply_to.content || 'Attached media'}</span>
                            )}
                          </span>
                        </div>
                      )}

                      {/* Bubble with Action Options Menu */}
                      <div className="flex items-center gap-1.5 relative max-w-[85%] md:max-w-[70%]">
                        {/* Hover Action Menu Trigger (Left side if me) */}
                        {isMe && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuMsgId(isMenuOpen ? null : msg.id);
                              }}
                              className="opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-opacity"
                              title="Message options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 bottom-full mb-1 z-30 w-36 bg-[#141414] border border-white/15 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-1 text-xs font-headline animate-scale-in"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleStartReply(msg);
                                    setActiveMenuMsgId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-white/10 text-white flex items-center gap-2"
                                >
                                  <Reply className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Reply</span>
                                </button>
                                {msg.content && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCopyMessage(msg);
                                      setActiveMenuMsgId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-white/10 text-white flex items-center gap-2"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Copy Text</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleStartEdit(msg);
                                    setActiveMenuMsgId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-white/10 text-white flex items-center gap-2"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteMessage(msg);
                                    setActiveMenuMsgId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Main Message Bubble */}
                        <div
                          className={`rounded-2xl text-[15px] leading-relaxed shadow-md overflow-hidden transition-all ${
                            isMe
                              ? 'bg-white text-black font-medium rounded-tr-xs'
                              : 'bg-white/[0.08] text-white border border-white/10 rounded-tl-xs backdrop-blur-md'
                          } ${msg.media_type === 'image' ? 'p-1.5' : 'px-4 py-2.5'}`}
                        >
                          {/* Attached Image */}
                          {msg.media_type === 'image' && msg.media_url && (
                            <div
                              onClick={() => setLightboxImageUrl(msg.media_url!)}
                              className="cursor-pointer rounded-xl overflow-hidden mb-1 relative group/img bg-black/40"
                              title="Click to zoom image"
                            >
                              <img
                                src={msg.media_url}
                                alt="Message attachment"
                                className="max-h-[300px] w-auto max-w-full object-contain rounded-xl hover:scale-[1.01] transition-transform duration-300"
                              />
                            </div>
                          )}

                          {/* Voice Note Player */}
                          {msg.media_type === 'audio' && msg.media_url && (
                            <AudioMessagePlayer
                              audioUrl={msg.media_url}
                              duration={msg.audio_duration}
                              isMe={isMe}
                            />
                          )}

                          {/* Text Message Content */}
                          {msg.content && msg.media_type !== 'audio' && (
                            <p className="break-words whitespace-pre-wrap px-1">
                              {msg.content}
                            </p>
                          )}
                        </div>

                        {/* Hover Action Menu Trigger (Right side if other) */}
                        {!isMe && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuMsgId(isMenuOpen ? null : msg.id);
                              }}
                              className="opacity-0 group-hover/msg:opacity-100 p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-opacity"
                              title="Message options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu for other's message */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 bottom-full mb-1 z-30 w-36 bg-[#141414] border border-white/15 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-1 text-xs font-headline animate-scale-in"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleStartReply(msg);
                                    setActiveMenuMsgId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-white/10 text-white flex items-center gap-2"
                                >
                                  <Reply className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Reply</span>
                                </button>
                                {msg.content && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleCopyMessage(msg);
                                      setActiveMenuMsgId(null);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-white/10 text-white flex items-center gap-2"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Copy Text</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Timestamp & Edited status */}
                      <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant font-mono mt-1 px-1 opacity-70">
                        <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.is_edited && <span className="text-white/60 italic font-mono">(edited)</span>}
                        {copiedMsgId === msg.id && <span className="text-emerald-400 font-mono">Copied!</span>}
                      </div>
                    </div>
                  );
                })}

                {/* Live Typing Indicator Animation */}
                {isOtherTyping && (
                  <div className="flex items-center gap-2.5 animate-fade-in pt-1">
                    <div className="bg-white/10 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-xs backdrop-blur-md flex items-center gap-1.5 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-white/80 rounded-full animate-bounce"></span>
                    </div>
                    <span className="text-[11px] font-mono text-on-surface-variant/80">
                      {activeConversation.participant.full_name.split(' ')[0]} is typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input & Action Bar */}
              <div className="shrink-0 p-2.5 sm:p-3 md:p-4 border-t border-white/10 bg-black/95 backdrop-blur-2xl z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {/* Replying Banner */}
                {replyingTo && (
                  <div className="max-w-4xl mx-auto mb-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Reply className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="text-xs truncate">
                        <p className="text-white/90 font-semibold truncate">
                          Replying to{' '}
                          {replyingTo.sender_id === user?.id
                            ? 'yourself'
                            : activeConversation.participant.full_name}
                        </p>
                        <div className="text-on-surface-variant truncate font-mono text-[11px] flex items-center gap-1">
                          {replyingTo.media_type === 'image' ? (
                            <>
                              <ImageIcon className="w-3 h-3 text-sky-400 shrink-0" />
                              <span>Photo</span>
                            </>
                          ) : replyingTo.media_type === 'audio' ? (
                            <>
                              <Mic className="w-3 h-3 text-red-400 shrink-0" />
                              <span>Voice note</span>
                            </>
                          ) : (
                            <span className="truncate">{replyingTo.content}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Editing Message Banner */}
                {editingMessage && (
                  <div className="max-w-4xl mx-auto mb-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Edit2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="text-xs truncate">
                        <p className="text-amber-300 font-semibold">Editing message</p>
                        <p className="text-white/70 truncate font-mono text-[11px]">{editingMessage.content}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMessage(null);
                        setInputMessage('');
                      }}
                      className="p-1 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Image Upload Preview Bar */}
                {mediaPreviewUrl && (
                  <div className="max-w-4xl mx-auto mb-2.5 p-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 animate-fade-in">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20 bg-black shrink-0">
                      <img src={mediaPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={removeSelectedImage}
                        className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-500 text-white rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-xs font-mono text-on-surface-variant">
                      <p className="text-white font-semibold">{selectedMediaFile?.name}</p>
                      <p>{((selectedMediaFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB · Ready to send</p>
                    </div>
                  </div>
                )}

                {/* Recording Active View */}
                {isRecording ? (
                  <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-2.5 animate-fade-in shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                      <span className="text-xs font-mono font-bold text-red-400">
                        Recording: {formatTimer(recordingDuration)}
                      </span>
                    </div>

                    {/* Audio wave bars animation */}
                    <div className="flex items-center gap-1">
                      {[40, 90, 60, 100, 70, 45, 80].map((h, i) => (
                        <span
                          key={i}
                          style={{ height: `${h}%` }}
                          className="w-1 bg-red-400/80 rounded-full animate-pulse"
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelRecording}
                        className="p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
                        title="Cancel recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={sendVoiceNote}
                        disabled={sending}
                        className="p-2.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white rounded-full font-bold transition-all shadow-md flex items-center justify-center"
                        title="Send voice note"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Input Form */
                  <form
                    onSubmit={handleSendMessage}
                    className="max-w-4xl mx-auto flex items-center gap-1.5 sm:gap-2 bg-white/5 border border-white/15 rounded-full px-2.5 sm:px-3 py-1.5 focus-within:border-white/35 focus-within:bg-white/[0.08] transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] relative"
                  >
                    {/* Emoji Picker Popup */}
                    {isEmojiOpen && (
                      <EmojiPicker
                        onSelectEmoji={(emoji) => {
                          setInputMessage((prev) => prev + emoji);
                          setIsEmojiOpen(false);
                          messageInputRef.current?.focus();
                        }}
                        onClose={() => setIsEmojiOpen(false)}
                        positionClass="bottom-full mb-3 left-0"
                      />
                    )}

                    {/* Emoji Picker Trigger */}
                    <button
                      type="button"
                      onClick={() => setIsEmojiOpen((prev) => !prev)}
                      className={`p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors shrink-0 ${
                        isEmojiOpen ? 'text-white bg-white/10' : ''
                      }`}
                      title="Choose emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    {/* Photo / Image Attachment Trigger */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 sm:p-2 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors shrink-0"
                      title="Attach photo"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>

                    {/* Text Input */}
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={inputMessage}
                      onChange={handleInputChange}
                      placeholder={editingMessage ? 'Update your message...' : 'Type a message...'}
                      className="flex-1 bg-transparent border-none text-white text-sm placeholder:text-outline focus:outline-none font-body px-2 min-w-0"
                    />

                    {/* Mic Voice Note Button (when input is empty and no image selected) */}
                    {!inputMessage.trim() && !selectedMediaFile && !editingMessage ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="p-2 sm:p-2.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-all active:scale-90 shrink-0"
                        title="Record Voice Note"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    ) : (
                      /* Send / Save Button */
                      <button
                        type="submit"
                        disabled={(!inputMessage.trim() && !selectedMediaFile) || sending || uploadingMedia}
                        className="p-2 sm:p-2.5 bg-primary text-black rounded-full hover:bg-white/90 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)] shrink-0"
                        title={editingMessage ? 'Save edit' : 'Send message'}
                      >
                        {sending || uploadingMedia ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : editingMessage ? (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </form>
                )}
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
                  Choose from your existing conversations, start a new chat, send voice notes, or share aesthetic photos.
                </p>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="px-6 py-2.5 bg-primary text-black rounded-full text-xs font-headline font-bold hover:bg-white/90 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                New message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* New Message Search Modal */}
      {/* ======================================================== */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#121212] border border-white/15 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[85vh] animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="font-headline font-bold text-lg text-white">New Message</h2>
              <button
                onClick={() => {
                  setIsNewChatModalOpen(false);
                  setSearchUserQuery('');
                }}
                className="p-1.5 rounded-full hover:bg-white/10 text-on-surface-variant hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Search Input */}
            <div className="py-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-full px-4 py-2.5 text-sm text-white focus-within:border-white/40 focus-within:bg-white/10 transition-all">
                <Search className="w-4 h-4 text-on-surface-variant" />
                <input
                  type="text"
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  placeholder="Search name or @username..."
                  autoFocus
                  className="w-full bg-transparent border-none text-white text-xs placeholder:text-outline focus:outline-none font-body"
                />
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5 pr-1 space-y-1 [&::-webkit-scrollbar]:hidden">
              {loadingUsers ? (
                <div className="p-8 text-center text-xs font-mono text-on-surface-variant flex items-center justify-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/40 animate-ping" />
                  <span>Searching creators...</span>
                </div>
              ) : searchedUsers.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-on-surface-variant">
                  {searchUserQuery ? 'No creators found matching that name.' : 'Type a name or username to search.'}
                </div>
              ) : (
                searchedUsers.map((target) => (
                  <div
                    key={target.id}
                    onClick={() => handleStartChatWithUser(target)}
                    className="p-3 flex items-center justify-between rounded-2xl hover:bg-white/10 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={target.avatar_url || '/default-avatar.jpg'}
                        alt={target.full_name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border border-white/10 aspect-square shrink-0"
                      />
                      <div>
                        <p className="font-bold text-white text-sm">{target.full_name}</p>
                        <p className="text-xs text-on-surface-variant font-mono">@{target.username}</p>
                      </div>
                    </div>
                    <span className="text-xs font-headline font-semibold text-white/70 hover:text-white px-3 py-1 bg-white/5 rounded-full border border-white/10">
                      Chat
                    </span>
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
