'use client';

import React from 'react';
import { SidebarNav } from './SidebarNav';
import { RightSidebar } from './RightSidebar';
import { MobileNav } from './MobileNav';
import { ComposeModal } from '@/components/feed/ComposeModal';
import { ChatbotBubble } from '@/components/chat/ChatbotBubble';

interface AppShellProps {
  children: React.ReactNode;
  hideRightSidebar?: boolean;
  fullWidth?: boolean;
  hideMobileNav?: boolean;
}

export function AppShell({ 
  children, 
  hideRightSidebar = false,
  fullWidth = false,
  hideMobileNav = false
}: AppShellProps) {
  return (
    <div className="min-h-screen flex justify-center bg-black selection:bg-white/20">
      {/* Desktop Left Sidebar */}
      <SidebarNav />

      {/* Main Center Canvas */}
      <main className={`w-full ${
        fullWidth 
          ? 'md:ml-[280px] flex-1 min-h-screen bg-black relative flex flex-col' 
          : 'max-w-[600px] md:ml-[280px] min-h-screen border-r border-white/10 pb-24 md:pb-12 bg-black relative'
      }`}>
        {children}
      </main>

      {/* Desktop Right Discovery Sidebar */}
      {!hideRightSidebar && !fullWidth && <RightSidebar />}

      {/* Mobile Bottom Navigation */}
      {!hideMobileNav && <MobileNav />}

      {/* Modals and Global Overlays */}
      <ComposeModal />
      <ChatbotBubble />
    </div>
  );
}
