import React from 'react';

interface TenderSkeletonProps {
  viewMode: 'table' | 'grid';
  count?: number;
}

export function TenderSkeleton({ viewMode, count = 6 }: TenderSkeletonProps) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-3.5 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="h-5 w-24 bg-slate-100 rounded border border-slate-200" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-100 rounded" />
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="h-3 w-32 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs animate-pulse">
      <div className="h-10 bg-slate-50/80 border-b border-slate-200/80 px-4 flex items-center gap-4">
        <div className="h-3 w-20 bg-slate-200 rounded" />
        <div className="h-3 w-40 bg-slate-200 rounded hidden sm:block" />
        <div className="h-3 w-24 bg-slate-200 rounded ml-auto" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-5 w-5 bg-slate-100 rounded shrink-0" />
            <div className="h-5 w-24 bg-slate-100 rounded border border-slate-200 shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
              <div className="h-3 w-1/3 bg-slate-50 rounded" />
            </div>
            <div className="h-5 w-24 bg-slate-100 rounded shrink-0 ml-auto" />
            <div className="h-4 w-16 bg-slate-100 rounded shrink-0 hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
