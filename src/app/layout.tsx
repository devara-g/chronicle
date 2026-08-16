import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { ComposeModal } from "@/components/feed";

export const metadata: Metadata = {
  title: "Chronicle — Digital Noir Microblog",
  description: "A minimalist, dark glassmorphic micro-blogging platform. Focus on high-contrast typography, structural transparency, and digital stillness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark bg-black">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="antialiased bg-black text-on-surface min-h-screen selection:bg-white/20"
      >
        <AppProvider>
          {children}
          <ComposeModal />
        </AppProvider>
      </body>
    </html>
  );
}
