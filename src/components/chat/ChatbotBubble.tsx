'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import ReactMarkdown from 'react-markdown';

export function ChatbotBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const isLoading = status === 'streaming' || status === 'submitted';
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useApp();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-primary text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Open AI Assistant"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      <div
        className={`fixed bottom-0 right-0 md:bottom-10 md:right-10 w-full md:w-[400px] h-[100dvh] md:h-[600px] bg-black/80 backdrop-blur-2xl border-l md:border border-white/10 md:rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 flex flex-col transition-all duration-300 ease-out origin-bottom-right ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 pointer-events-none translate-y-10 md:translate-y-0'}`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-black">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-white text-sm">Chronicle AI</h3>
              <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">Powered by Groq</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/10 text-on-surface-variant hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-body [&::-webkit-scrollbar]:hidden">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <Sparkles className="w-10 h-10 text-white/20 mb-3" />
              <p className="text-white text-sm font-headline mb-1">Hello, {user?.full_name?.split(' ')[0] || 'Traveler'}.</p>
              <p className="text-xs text-on-surface-variant text-balance">I&apos;m your noir assistant. Need help drafting a post or brainstorming ideas?</p>
            </div>
          ) : (
            messages.map((m: UIMessage) => {
              const textContent = m.parts
                ?.filter((p) => p.type === 'text')
                .map((p) => (p as { type: 'text'; text: string }).text)
                .join('');

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-white text-black font-medium rounded-br-sm whitespace-pre-wrap'
                        : 'bg-[#1a1a1a] text-white border border-white/10 rounded-bl-sm prose prose-invert prose-sm max-w-none'
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
                        {textContent ?? ''}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-start">
              <div className="px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-2xl rounded-bl-sm text-on-surface-variant">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-black/40 border-t border-white/10">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-outline focus:outline-none focus:border-white/30 resize-none min-h-[44px]"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 bottom-2 p-2 bg-primary text-black rounded-full hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
            >
              <Send className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </form>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-on-surface-variant font-mono">AI can make mistakes. Verify important info.</span>
          </div>
        </div>
      </div>
    </>
  );
}
