import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { TenderDetailView } from '@/components/TenderDetailView';

// Revalidate page data or dynamic
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

async function getTenderData(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
    const res = await fetch(`${baseUrl}/api/tenders/${id}`, {
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Error fetching tender data:', e);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getTenderData(params.id);
  if (!data?.tender) {
    return {
      title: 'Тендер олдсонгүй | Tender.mn'
    };
  }
  return {
    title: `${data.tender.tenderName} | Tender.mn`,
    description: `${data.tender.budgetEntityName} - Төсөвт өртөг: ${Number(data.tender.totalBudget).toLocaleString()} ₮`
  };
}

export default async function TenderPage({ params }: PageProps) {
  const data = await getTenderData(params.id);

  if (!data || !data.tender) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-xl border border-slate-200 max-w-md w-full text-center space-y-4 shadow-sm">
          <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Тендер олдсонгүй</h2>
          <p className="text-sm text-slate-500">
            Хүссэн тендерийн мэдээлэл олдсонгүй эсвэл хандах боломжгүй байна.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
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
