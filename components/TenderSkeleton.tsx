'use client';

import React from 'react';

interface TenderSkeletonProps {
  viewMode: 'table' | 'grid';
  count?: number;
}

export function TenderSkeleton({ viewMode, count = 6 }: TenderSkeletonProps) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-2xs"
          >
            {/* Header badges */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
              </div>
              <div className="h-5 w-5 bg-slate-100 dark:bg-slate-800 rounded-full" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded-md" />
              <div className="h-4 w-4/5 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
            </div>

            {/* Buyer */}
            <div className="h-3.5 w-3/5 bg-slate-100 dark:bg-slate-800/60 rounded-md" />

            {/* Extracted items snippet */}
            <div className="h-7 w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-lg" />

            {/* Footer Grid */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="h-2.5 w-14 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
                <div className="space-y-1">
                  <div className="h-2.5 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
                  <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <div className="h-8 w-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                <div className="h-8 flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-2xs animate-pulse">
      <div className="h-10 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-700 px-4 flex items-center gap-4">
        <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-3.5 w-40 bg-slate-200 dark:bg-slate-700 rounded hidden sm:block" />
        <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-5 w-5 bg-slate-100 dark:bg-slate-800 rounded shrink-0" />
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-700 shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3 w-1/3 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded shrink-0 ml-auto" />
            <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded shrink-0 hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
