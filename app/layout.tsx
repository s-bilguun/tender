import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TenderHub MN | B2B Procurement Intelligence & Tender Database',
  description: 'Монголын төрийн болон хувийн хэвшлийн тендер, худалдан авалтын нэгдсэн дата, AI шинжилгээ, зах зээлийн аналитик систем',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

import { Suspense } from 'react';
import { NavigationProgressBar } from '@/components/NavigationProgressBar';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
