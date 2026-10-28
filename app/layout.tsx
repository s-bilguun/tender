import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TenderHub — Монголын тендерийн мэдээлэл',
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
import { ThemeProvider } from '@/components/ThemeProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('tenderhub_theme');
                  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#f5f6f8] dark:bg-[#0f0f11] text-slate-900 dark:text-zinc-100 antialiased selection:bg-blue-600 selection:text-white transition-colors duration-150">
        <ThemeProvider>
          <Suspense fallback={null}>
            <NavigationProgressBar />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
