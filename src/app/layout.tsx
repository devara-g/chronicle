import type { Metadata } from "next";
import { Hanken_Grotesk, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { ComposeModal } from "@/components/feed";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Chronicle — Noir Glass Microblog",
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
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body
        className={`${hankenGrotesk.variable} ${inter.variable} ${geistMono.variable} antialiased bg-black text-on-surface min-h-screen selection:bg-white/20`}
      >
        <AppProvider>
          {children}
          <ComposeModal />
        </AppProvider>
      </body>
    </html>
  );
}
