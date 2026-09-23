'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { generateBidRequirements } from '@/lib/bid-requirements';
import { BidReadinessChecklist } from './BidReadinessChecklist';
import { SubmissionRoadmap } from './SubmissionRoadmap';
import { X, ExternalLink, Sparkles, Building2, Calendar, ShieldCheck, Tag, Copy, Check, Trophy, Users, FileSearch, FileSpreadsheet, FileText, Download, CheckCircle2, Layers, Loader2 } from 'lucide-react';

interface TenderDetailModalProps {
  tender: TenderItem | null;
  locale: Locale;
  onClose: () => void;
  onAskAI: (tender: TenderItem) => void;
}

export const TenderDetailModal: React.FC<TenderDetailModalProps> = ({
  tender,
  locale,
  onClose,
  onAskAI,
}) => {
  if (!tender) return null;
  const t = getTranslation(locale);
  const [copied, setCopied] = useState(false);

  const formatCurrency = (amount: number) => {
    if (!amount) return '0 ₮';
    return `${amount.toLocaleString()} ₮`;
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = tender.tenderCode || tender.invitationNumber || '';
    if (textToCopy && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!tender?.invitationId) return;
    let isMounted = true;
    setLoadingDetail(true);
    fetch(`/api/tenders/${tender.invitationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.tender) {
          setDetailData(data);
        }
      })
      .catch((err) => console.warn('Could not load tender live detail in modal:', err))
      .finally(() => {
        if (isMounted) setLoadingDetail(false);
      });
    return () => {
      isMounted = false;
    };
  }, [tender?.invitationId]);

  const bidRequirements = tender.bidRequirements || generateBidRequirements(tender);
  const publicLink = `https://www.tender.gov.mn/mn/invitation/detail/${tender.invitationId}`;
  const supplierLink = `https://user.tender.gov.mn/mn/supplier/available/${tender.invitationId}/detail`;

  const liveDocs = detailData?.technicalSpecs?.documents || [];
  const realSpecsText = detailData?.technicalSpecs?.realSpecsText || detailData?.technicalSpecs?.extractedSpecs?.rawSpecText;
  const realLicenses = detailData?.bds?.requiredLicenses || [];
  const realPersonnel = detailData?.bds?.keyPersonnel || [];
  const realMachinery = detailData?.bds?.machinery || [];
  const realItems = detailData?.technicalSpecs?.extractedSpecs?.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap text-xs">
              <div className="flex items-center gap-1 font-mono px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700">
                <span>{tender.tenderCode || tender.invitationNumber}</span>
                <button
                  onClick={handleCopyCode}
                  className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title="Хуулах"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              {tender.industryName && (
                <span className="font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {tender.industryName}
                </span>
              )}

              <span className="font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {tender.tenderTypeName || 'Тендер'}
              </span>

              <span className="font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {tender.docStatusName || 'Идэвхтэй'}
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {tender.tenderName}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Key Financial Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gradient-to-br from-slate-50 to-slate-100/60 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] uppercase font-semibold text-slate-500 block mb-1">
                {t.budgetLabel}
              </span>
              <span className="text-xl font-bold text-slate-900 font-mono tabular-nums">
                {formatCurrency(tender.totalBudget)}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase font-semibold text-slate-500 block mb-1">
                {locale === 'mn' ? 'Тухайн онд санхүүжих' : 'Current Year Budget'}
              </span>
              <span className="text-base font-semibold text-slate-700 font-mono tabular-nums">
                {formatCurrency(tender.yearBudget || tender.totalBudget)}
              </span>
            </div>
          </div>

          {/* B2B Bid Readiness Dossier */}
          <BidReadinessChecklist
            requirements={bidRequirements}
            totalBudget={tender.totalBudget}
            locale={locale}
          />

          {/* Step-by-Step Submission Roadmap */}
          <SubmissionRoadmap
            steps={bidRequirements.submissionSteps}
            invitationId={tender.invitationId}
            locale={locale}
          />

          {/* Official Documents & Live PDF Extraction Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-blue-600" />
                <span>{locale === 'mn' ? 'Албан ёсны баримт бичгүүд & ТШББ (PDF)' : 'Official Dossier & PDF Documents'}</span>
              </h4>
              {loadingDetail && (
                <span className="text-[11px] text-blue-600 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{locale === 'mn' ? 'PDF татаж байна...' : 'Loading PDFs...'}</span>
                </span>
              )}
            </div>

            {liveDocs.length > 0 ? (
              <div className="space-y-2">
                {liveDocs.map((doc: any, idx: number) => {
                  const isExpanded = !!expandedDoc[doc.id || idx];
                  const downloadHref = doc.fileId
                    ? `/api/download?fileId=${doc.fileId}&name=${encodeURIComponent(doc.name || 'tender.pdf')}`
                    : (doc.downloadUrl || doc.url || '#');

                  return (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-rose-500 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate" title={doc.name}>
                              {doc.name}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              {doc.category || 'Баримт бичиг'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          {doc.extractedSummary && (
                            <button
                              onClick={() => setExpandedDoc((prev) => ({ ...prev, [doc.id || idx]: !prev[doc.id || idx] }))}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                            >
                              {isExpanded ? 'Хураах' : 'Хуулийн шаардлага'}
                            </button>
                          )}

                          {doc.fileId ? (
                            <a
                              href={downloadHref}
                              download={doc.name || 'tender.pdf'}
                              className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-colors"
                              title="Албан ёсны эх PDF-ийг татах"
                            >
                              <Download className="h-3 w-3" />
                              <span>{locale === 'mn' ? 'Шууд татах (PDF)' : 'Download PDF'}</span>
                            </a>
                          ) : (
                            <a
                              href={downloadHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Эх хуудас</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {isExpanded && doc.extractedSummary && (
                        <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-text border border-slate-800">
                          {doc.extractedSummary}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : !loadingDetail ? (
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 flex items-center justify-between">
                <span>{locale === 'mn' ? 'Албан ёсны баримт бичгүүдийг портал дээрээс үзэх боломжтой.' : 'Official documents available on portal.'}</span>
                <a
                  href={publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <span>tender.gov.mn</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : null}
          </div>

          {/* Live Extracted Technical Specifications & Requirements from PDF */}
          {(realSpecsText || realLicenses.length > 0 || realMachinery.length > 0 || realPersonnel.length > 0 || realItems.length > 0) && (
            <div className="border border-blue-200 rounded-xl p-4 bg-gradient-to-br from-blue-50/50 via-white to-white shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>{locale === 'mn' ? 'Албан ёсны ТШББ PDF-ээс задлан шинжилсэн бодит үзүүлэлтүүд' : 'Verified PDF Specifications'}</span>
                </h4>
                <Link
                  href={`/tender/${tender.invitationId}`}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <span>Бүтэн хуудсаар үзэх ↗</span>
                </Link>
              </div>

              {/* Extracted Licenses */}
              {realLicenses.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {locale === 'mn' ? 'Шаардагдах тусгай зөвшөөрөл / Сертификат (ТШЗ 17.4 / 16.2):' : 'Mandatory Licenses:'}
                  </span>
                  <div className="space-y-1">
                    {realLicenses.map((lic: string, lIdx: number) => (
                      <div key={lIdx} className="flex items-start gap-1.5 text-xs text-slate-800 bg-white p-2 rounded-lg border border-slate-200/80">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{lic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Machinery */}
              {realMachinery.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {locale === 'mn' ? 'Шаардагдах техник, машин механизм:' : 'Required Machinery & Equipment:'}
                  </span>
                  <div className="space-y-1">
                    {realMachinery.map((m: string, mIdx: number) => (
                      <div key={mIdx} className="flex items-start gap-1.5 text-xs text-slate-800 bg-white p-2 rounded-lg border border-slate-200/80">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Personnel */}
              {realPersonnel.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {locale === 'mn' ? 'Шаардагдах түлхүүр боловсон хүчин:' : 'Key Personnel Requirements:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {realPersonnel.map((p: any, pIdx: number) => (
                      <div key={pIdx} className="p-2 rounded-lg bg-white border border-slate-200/80 text-xs">
                        <span className="font-bold text-slate-900 block">{p.role}</span>
                        <span className="text-slate-500 text-[11px] block">{p.count} хүн {p.qualification ? `• ${p.qualification}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Lots / Packages */}
              {realItems.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {locale === 'mn' ? `Нийлүүлэх бараа, багцын үзүүлэлт (${realItems.length} зүйл):` : `Itemized Lots (${realItems.length} items):`}
                  </span>
                  <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 bg-white rounded-lg border border-slate-200/80 p-2 space-y-1">
                    {realItems.slice(0, 15).map((it: any, iIdx: number) => (
                      <div key={iIdx} className="py-1 text-xs flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-800 truncate">{it.name}</span>
                        <span className="font-mono text-[11px] text-slate-500 shrink-0">{it.qty ? `${it.qty} ${it.unit || ''}` : ''}</span>
                      </div>
                    ))}
                    {realItems.length > 15 && (
                      <p className="text-[11px] text-blue-600 font-semibold pt-1">
                        ... болон цааш нийт {realItems.length} багц байна (Бүтэн хуудсаас харна уу)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Real Specs Text snippet */}
              {realSpecsText && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    {locale === 'mn' ? 'III Бүлэг: Техникийн нарийвчилсан үзүүлэлтийн хураангуй (PDF-ээс):' : 'Technical Specifications Summary:'}
                  </span>
                  <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-text border border-slate-800">
                    {realSpecsText.substring(0, 2000)}
                    {realSpecsText.length > 2000 ? '\n\n... (Үргэлжлэлийг бүтэн хуудсаас харна уу)' : ''}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Details Table */}
          <div className="space-y-2 text-xs">
            <h4 className="text-xs uppercase font-semibold text-slate-500">
              {locale === 'mn' ? 'Үндсэн мэдээлэл' : 'Procurement Details'}
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="grid grid-cols-3 p-3 gap-2">
                <span className="text-slate-500">{t.procuringEntity}</span>
                <span className="col-span-2 text-slate-900 font-medium">{tender.budgetEntityName}</span>
              </div>

              {tender.positionName && (
                <div className="grid grid-cols-3 p-3 gap-2">
                  <span className="text-slate-500">{t.ministryGovernor}</span>
                  <span className="col-span-2 text-slate-900 font-medium">{tender.positionName}</span>
                </div>
              )}

              {tender.ruleName && (
                <div className="grid grid-cols-3 p-3 gap-2">
                  <span className="text-slate-500">{t.procurementMethod}</span>
                  <span className="col-span-2 text-slate-800 font-medium">{tender.ruleName}</span>
                </div>
              )}

              {tender.fundName && (
                <div className="grid grid-cols-3 p-3 gap-2">
                  <span className="text-slate-500">{t.fundingSource}</span>
                  <span className="col-span-2 text-slate-800 font-medium">{tender.fundName}</span>
                </div>
              )}

              {tender.registrationNumber && (
                <div className="grid grid-cols-3 p-3 gap-2">
                  <span className="text-slate-500">Регистрийн дугаар</span>
                  <span className="col-span-2 text-slate-800 font-mono">{tender.registrationNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Timelines */}
          <div className="space-y-2 text-xs">
            <h4 className="text-xs uppercase font-semibold text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{locale === 'mn' ? 'Хугацааны хуваарь' : 'Timeline'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block mb-0.5">
                  {locale === 'mn' ? 'Зарласан огноо' : 'Published Date'}
                </span>
                <span className="font-mono text-xs text-slate-800 font-medium">
                  {tender.publishDate || tender.actionDate || 'Тодорхойгүй'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs text-slate-500 block mb-0.5">
                  {t.deadline}
                </span>
                <span className="font-mono text-xs text-blue-700 font-bold">
                  {tender.receiveDate || tender.openDate || 'Тодорхойгүй'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-white sticky bottom-0 z-10">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                onClose();
                onAskAI(detailData?.tender ? {
                  ...tender,
                  bds: detailData.bds,
                  technicalSpecs: detailData.technicalSpecs,
                  results: detailData.results,
                } : tender);
              }}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>{locale === 'mn' ? 'AI шинжээч' : 'AI'}</span>
            </button>

            <Link
              href={`/tender/${tender.invitationId}`}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center justify-center gap-1.5 transition-colors"
              title="Бүтэн хуудсаар дэлгэрэнгүй үзэх"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>{locale === 'mn' ? 'Дэлгэрэнгүй хуудас ↗' : 'Full View ↗'}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={publicLink}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 flex-1 sm:flex-initial px-4 rounded-xl text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              title="tender.gov.mn албан ёсны зарлал үзэх"
            >
              <span>{locale === 'mn' ? 'Албан зарлал' : 'Official Notice'}</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </a>

            <a
              href={supplierLink}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 flex-1 sm:flex-initial px-4 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              title="Ханган нийлүүлэгчийн системээр санал илгээх"
            >
              <span>{t.directApply}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
