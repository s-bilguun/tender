import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Building2, Sparkles, FileText, Loader2 } from 'lucide-react';

export default function TenderDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 animate-pulse">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Бүх тендер рүү буцах</span>
          </Link>
          <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
        </div>

        <div className="flex items-center gap-2">
        </div>
      </header>

      {/* Main Container Skeleton */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Floating status alert */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-md p-3 flex items-center justify-center gap-2 text-xs font-semibold text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Тендерийн мэдээлэл ачаалж байна…</span>
        </div>

        {/* Header Hero Banner Skeleton */}
        <div className="bg-white rounded-md border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center gap-2">
          </div>

          <div className="space-y-2 pt-1">
            <div className="h-7 bg-slate-200 rounded-md w-11/12"></div>
            <div className="h-7 bg-slate-200 rounded-md w-3/4"></div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          </div>
        </div>

        {/* Financial Metrics Cards Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 rounded-md border border-slate-200 shadow-2xs space-y-2">
              <div className="h-2.5 w-24 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="bg-slate-200/70 p-1 rounded-md grid grid-cols-4 gap-1">
          <div className="h-9 bg-white rounded-lg"></div>
          <div className="h-9 bg-transparent rounded-lg"></div>
          <div className="h-9 bg-transparent rounded-lg"></div>
          <div className="h-9 bg-transparent rounded-lg"></div>
        </div>

        {/* Content Box Skeleton */}
        <div className="bg-white rounded-md border border-slate-200 p-6 space-y-4">
          <div className="space-y-3 pt-2">
            <div className="h-12 bg-slate-100 rounded-lg"></div>
            <div className="h-12 bg-slate-100 rounded-lg"></div>
            <div className="h-12 bg-slate-100 rounded-lg"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
