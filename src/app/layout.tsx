import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniLib - AI-powered academic reading platform",
  description: "AI-powered academic reading and collaboration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
