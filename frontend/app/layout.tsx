import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "./context/AppContext";
import { AuthGate } from "../components/AuthGate";
import { LoginPromptModal } from "../components/LoginPromptModal";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Smart Canteen Pre-Order & Queue Management System",
  description:
    "Real-time food ordering, 15-minute pickup slots, digital tokens, live kitchen queue, and AI canteen analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
        <AppProvider>
          <AuthGate>{children}</AuthGate>
          <LoginPromptModal />
        </AppProvider>
      </body>
    </html>
  );
}
