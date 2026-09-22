'use client';

import React from 'react';
import { Locale, BidRequirementSummary } from '@/lib/types';
import { FileText, FileSpreadsheet, KeyRound, ExternalLink } from 'lucide-react';

interface SubmissionRoadmapProps {
  steps: BidRequirementSummary['submissionSteps'];
  invitationId: string | number;
  locale: Locale;
}

export const SubmissionRoadmap: React.FC<SubmissionRoadmapProps> = ({
  steps,
  invitationId,
  locale,
}) => {
  const stepIcons = [
    <FileText key="1" className="h-4 w-4 text-blue-600" />,
    <FileSpreadsheet key="2" className="h-4 w-4 text-amber-600" />,
    <KeyRound key="3" className="h-4 w-4 text-emerald-600" />,
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <span>🚀</span>
          <span>{locale === 'mn' ? 'Тендерт оролцох алхамчилсан заавар' : 'Step-by-Step Submission Roadmap'}</span>
        </h4>
        <span className="text-[11px] font-mono text-slate-400">tender.gov.mn</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {steps.map((s, idx) => (
          <div
            key={s.step}
            className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col justify-between gap-2 relative"
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <span className="h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                    {s.step}
                  </span>
                  <span>{locale === 'mn' ? s.titleMn : s.titleEn}</span>
                </div>
                {stepIcons[idx % stepIcons.length]}
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                {locale === 'mn' ? s.descMn : s.descEn}
              </p>
            </div>

            {idx === steps.length - 1 && (
              <a
                href={`https://www.tender.gov.mn/mn/invitation/detail/${invitationId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors shadow-2xs"
              >
                <span>{locale === 'mn' ? 'Албан систем рүү очих' : 'Go to Official Portal'}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
