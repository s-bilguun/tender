import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TENDER.MN | Тендерийн нэгдсэн дата & зах зээлийн аналитик төв',
  description: 'Монголын төрийн болон хувийн хэвшлийн тендер, худалдан авалтын нэгдсэн дата, AI шинжилгээ, зах зээлийн аналитик систем',
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
