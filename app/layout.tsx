import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TenderHub | Тендерийн нэгдсэн дата & зах зээлийн аналитик төв',
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
    <html lang="mn">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Suspense fallback={null}>
          <NavigationProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
