import React, { cache } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { getTenderDetailData } from '@/lib/tender-detail';
import { TenderDetailView } from '@/components/TenderDetailView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

const getCachedTenderDetail = cache(async (id: string) => {
  return getTenderDetailData(id, { useStoredLiveBundle: true });
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getCachedTenderDetail(params.id);
  if (!data?.tender) {
    return {
      title: 'Тендер олдсонгүй | TenderHub'
    };
  }
  return {
    title: `${data.tender.tenderName} | TenderHub`,
    description: `${data.tender.budgetEntityName} - Төсөвт өртөг: ${Number(data.tender.totalBudget).toLocaleString()} ₮`
  };
}

export default async function TenderPage({ params }: PageProps) {
  const data = await getCachedTenderDetail(params.id);

  if (!data || !data.tender) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-md border border-slate-200 dark:border-zinc-800 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Тендер олдсонгүй</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Хүссэн тендерийн мэдээлэл олдсонгүй эсвэл хандах боломжгүй байна.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Нүүр хуудас руу буцах</span>
          </Link>
        </div>
      </div>
    );
  }

  return <TenderDetailView initialData={data} />;
}
