import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardIQ — Your AI-Powered Credit Card Brain",
  description: "Swipe smart, invest smarter, track everything.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-[#e8e8f0]">
        {children}
      </body>
    </html>
  );
}
