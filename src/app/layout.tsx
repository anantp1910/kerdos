import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Kerdos — AI Credit Card Brain",
  description: "Swipe smart, invest smarter, track everything.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
