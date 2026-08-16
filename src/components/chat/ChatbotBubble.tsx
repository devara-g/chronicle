'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { X, Send, Infinity, Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import ReactMarkdown from 'react-markdown';

export function ChatbotBubble() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const isLoading = status === 'streaming' || status === 'submitted';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useApp();

  // Hide floating button on /messages to avoid cluttering chat window
  const isMessagesPage = pathname.startsWith('/messages');

  // Allow opening AI assistant via custom event from anywhere
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-assistant', handleOpen);
    return () => window.removeEventListener('open-ai-assistant', handleOpen);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen, error]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const getMessageText = (m: any): string => {
    if (typeof m.content === 'string' && m.content) return m.content;
    if (Array.isArray(m.parts)) {
      const text = m.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
      if (text) return text;
    }
    if (typeof m.text === 'string' && m.text) return m.text;
    return '';
  };

  return (
    <>
      {/* Discreet floating trigger button with hover tooltip (desktop only, hidden on /messages) */}
      {!isMessagesPage && (
        <div className={`hidden md:block fixed bottom-8 right-8 z-40 group ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        } transition-all`}>
          {/* Hover Tooltip: Chronicle AI */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-black/95 text-white border border-white/20 rounded-xl text-xs font-headline font-semibold shadow-[0_4px_25px_rgba(0,0,0,0.9)] opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 pointer-events-none transition-all duration-200 whitespace-nowrap flex items-center gap-1.5">
            <Infinity className="w-3.5 h-3.5 text-white/80" />
            <span>Chronicle AI</span>
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="w-11 h-11 bg-black/80 hover:bg-white/15 text-white/90 hover:text-white border border-white/20 hover:border-white/40 backdrop-blur-xl rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            aria-label="Open Chronicle AI"
          >
            <Infinity className="w-5 h-5 transition-transform group-hover:rotate-12 text-white" />
          </button>
        </div>
      )}

      {/* AI Chat Window Modal (Full-screen on Mobile, Floating on Desktop) */}
      <div
        className={`fixed inset-0 md:inset-auto md:bottom-8 md:right-8 w-full md:w-[380px] h-[100dvh] md:h-[540px] bg-black/95 backdrop-blur-2xl border-l md:border border-white/15 md:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-[100] flex flex-col transition-all duration-300 ease-out origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none translate-y-10 md:translate-y-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 bg-white/[0.04] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white/10 border border-white/15 rounded-lg flex items-center justify-center text-white">
              <Infinity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-white text-sm leading-tight">Chronicle AI</h3>
              <p className="text-[10px] text-on-surface-variant font-mono">Noir Writing Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 text-on-surface-variant hover:text-white rounded-full transition-colors active:scale-90"
            title="Close"
          >
            <X className="w-5 h-5 md:w-4 md:h-4" />
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 font-body [&::-webkit-scrollbar]:hidden">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 my-auto py-8">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 mb-3">
                <Infinity className="w-6 h-6 text-white" />
              </div>
              <p className="text-white text-sm font-headline font-semibold mb-1">
                Halo, {user?.full_name?.split(' ')[0] || 'Teman'}.
              </p>
              <p className="text-xs text-on-surface-variant leading-relaxed max-w-[260px]">
                Ada yang bisa kubantu? Tanya ide postingan, bikin thread noir, atau obrolan santai.
              </p>
            </div>
          ) : (
            messages.map((m: UIMessage) => {
              const textContent = getMessageText(m);
              if (!textContent && m.role !== 'user') return null;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-white text-black font-medium rounded-tr-xs whitespace-pre-wrap shadow-sm'
                        : 'bg-white/[0.08] text-white border border-white/10 rounded-tl-xs backdrop-blur-sm prose prose-invert prose-sm max-w-none'
                    }`}
                  >
                    {m.role === 'user' ? textContent : (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                          h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold text-white/90 mb-1">{children}</h3>,
                          ul: ({ children }) => <ul className="list-none space-y-1 my-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                          li: ({ children }) => <li className="flex gap-2 text-white/80"><span className="text-white/40 mt-0.5">›</span><span>{children}</span></li>,
                          code: ({ children }) => <code className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-white/90">{children}</code>,
                          a: ({ children, href }) => <a href={href} className="text-white underline underline-offset-2 hover:text-white/80" target="_blank" rel="noopener noreferrer">{children}</a>,
                        }}
                      >
                        {textContent}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex items-start animate-fade-in">
              <div className="px-3.5 py-2.5 bg-white/10 border border-white/10 rounded-2xl rounded-tl-xs text-on-surface-variant flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs font-mono">Chronicle AI sedang mengetik...</span>
              </div>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Gagal memproses pesan.</p>
                <p className="opacity-80 mt-0.5">Pastikan <code>GROQ_API_KEY</code> sudah dimasukkan di Vercel Environment Variables.</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="shrink-0 p-3 bg-black/90 border-t border-white/10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya atau minta bantuan AI..."
              className="w-full bg-white/5 border border-white/10 rounded-full pl-3.5 pr-10 py-2.5 text-xs text-white placeholder:text-outline focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all font-body"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-1.5 p-1.5 bg-primary text-black rounded-full hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all flex items-center justify-center shadow-sm"
              title="Kirim"
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
