import React from 'react';
import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata: Metadata = {
  title: 'SupplySense - Intelligent Supply-Chain Risk & Route Management',
  description: 'Detect disruptions caused by traffic, weather, supplier delays or inventory shortages and plan optimal routes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F4EE] text-charcoal-900 antialiased flex flex-col md:flex-row">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
