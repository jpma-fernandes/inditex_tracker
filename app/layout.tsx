import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inditex Tracker",
  description: "Track prices and stock for Zara, Bershka, Pull&Bear and Massimo Dutti",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-[#0a0a0a] text-[#ededed]`}
      >
        <header className="border-b border-[#2a2a2a] bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
                IT
              </div>
              <h1 className="text-xl font-semibold">Inditex Tracker</h1>
            </div>
            <nav className="flex items-center gap-4 text-sm text-gray-400">
              <span className="hidden sm:inline">Track prices & stock</span>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-[#2a2a2a] mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
            Inditex Tracker - Personal Use Only
          </div>
        </footer>
      </body>
    </html>
  );
}
