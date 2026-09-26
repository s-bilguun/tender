'use client';

import React from 'react';
import { BidRequirementSummary, Locale } from '@/lib/types';
import { AlertCircle, ShieldCheck } from 'lucide-react';

interface BidReadinessChecklistProps {
  requirements: BidRequirementSummary;
  totalBudget: number;
  locale: Locale;
}

export const BidReadinessChecklist: React.FC<BidReadinessChecklistProps> = ({ requirements, locale }) => {
  const hasEvidence = requirements.requiredClearances.length > 0;

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-blue-600" />
        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
          {locale === 'mn' ? 'PDF-д тулгуурласан шаардлагууд' : 'Requirements found in the dossier'}
        </h4>
      </div>
      {hasEvidence ? (
        <ul className="space-y-2">
          {requirements.requiredClearances.map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
              <strong>{locale === 'mn' ? item.nameMn : item.nameEn}</strong>
              <p className="mt-1 text-slate-600">{locale === 'mn' ? item.descriptionMn : item.descriptionEn}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <p>
            {locale === 'mn'
              ? 'Одоогоор энэ тендерийн PDF-ээс баталгаатай шаардлагын жагсаалт гаргаагүй байна. Энэ нь шаардлага байхгүй гэсэн үг биш. Албан ёсны ТШББ болон хавсралтыг шалгана уу.'
              : 'No verified requirements have been extracted from this tender’s PDFs yet. This does not mean there are no requirements. Please check the official dossier and attachments.'}
          </p>
        </div>
      )}
    </div>
  );
};
