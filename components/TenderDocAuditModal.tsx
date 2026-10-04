'use client';

import React, { useState } from 'react';
import { TenderItem } from '@/lib/types';
import { 
  X, Sparkles, FileCheck, AlertTriangle, 
  CheckCircle2, Upload, Loader2, ArrowRight, ShieldAlert,
  Building, Award, DollarSign
} from 'lucide-react';

interface TenderDocAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender?: TenderItem | null;
}

interface AuditResult {
  overallScore: number;
  status: 'passed' | 'warning' | 'high_risk';
  summary: string;
  checks: {
    category: string;
    status: 'pass' | 'fail' | 'warn';
    title: string;
    detail: string;
  }[];
  recommendations: string[];
}

export const TenderDocAuditModal: React.FC<TenderDocAuditModalProps> = ({
  isOpen,
  onClose,
  tender,
}) => {
  const [companyName, setCompanyName] = useState('');
  const [turnoverAmount, setTurnoverAmount] = useState('');
  const [hasSpecialLicense, setHasSpecialLicense] = useState(true);
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);

  if (!isOpen) return null;

  const handleRunAudit = () => {
    setIsAuditing(true);
    // Simulate / Trigger AI deep check
    setTimeout(() => {
      const budget = tender ? Number(tender.totalBudget) || 100_000_000 : 100_000_000;
      const userTurnover = Number(turnoverAmount.replace(/\D/g, '')) || 0;
      const requiredTurnover = budget * 0.5;

      const checks: AuditResult['checks'] = [
        {
          category: 'Тусгай зөвшөөрөл (Licenses)',
          status: hasSpecialLicense ? 'pass' : 'fail',
          title: 'Хүчинтэй тусгай зөвшөөрөл',
          detail: hasSpecialLicense 
            ? 'Тусгай зөвшөөрлийн хүчинтэй хугацаа шалгагдлаа. ТШББ 17.4 шаардлага хангасан.' 
            : 'Тусгай зөвшөөрөл дутуу эсвэл хавсаргаагүй байна! ТШББ-ийн дагуу шууд хасагдах эрсдэлтэй.',
        },
        {
          category: 'Санхүүгийн чадавх (Turnover & Audit)',
          status: userTurnover >= requiredTurnover ? 'pass' : 'warn',
          title: 'Борлуулалтын орлогын хэмжээ',
          detail: userTurnover >= requiredTurnover
            ? `Сүүлийн 2 жилийн борлуулалтын орлого (₮${userTurnover.toLocaleString()}) нь шаардлагатай доод хэмжээ (₮${requiredTurnover.toLocaleString()})-г хангаж байна.`
            : `Борлуулалтын орлого дутуу байна. Шаардлагатай: ₮${requiredTurnover.toLocaleString()}, оруулсан: ₮${userTurnover.toLocaleString()}. Түншлэл (JV) байгуулахыг зөвлөж байна.`,
        },
        {
          category: 'Тендерийн баталгаа (Bid Security)',
          status: 'pass',
          title: 'Цахим баталгааны тохиргоо',
          detail: 'ТШЗ 22.1 дагуу тоон гарын үсгээр баталгаажсан цахим мэдэгдэл бүрэн бэлтгэгдсэн байна.',
        },
        {
          category: 'Ажиллах хүч, инженер техникийн ажилтан',
          status: 'pass',
          title: 'Инженерийн диплом, нийгмийн даатгалын лавлагаа',
          detail: 'Түлхүүр мэргэжилтний 3+ жилийн туршлага ба НДШ-ийн цахим лавлагаа баталгаажсан.',
        },
      ];

      const hasFail = checks.some((c) => c.status === 'fail');
      const hasWarn = checks.some((c) => c.status === 'warn');
      const score = hasFail ? 45 : hasWarn ? 78 : 96;

      setAuditResult({
        overallScore: score,
        status: hasFail ? 'high_risk' : hasWarn ? 'warning' : 'passed',
        summary: hasFail
          ? 'Тендерийн бичиг баримтад нэн чухал шаардлага дутуу байгаа тул хуулийн дагуу хасагдах өндөр эрсдэлтэй байна.'
          : hasWarn
          ? 'Бичиг баримт ерөнхийдөө бэлэн боловч санхүүгийн үзүүлэлт болон түншлэлийн гэрээг сайжруулах шаардлагатай.'
          : 'Тендерийн бичиг баримт ТШББ-ийн бүх шалгуур үзүүлэлтийг 96% бүрэн хангаж байна. Амжилттай оролцох боломжтой!',
        checks,
        recommendations: [
          'Татварын хугацаа хэтэрсэн өргүй тодорхойлолтыг тендер нээх өдрөөс өмнөх 3 хоногт шинэчлэн татах',
          'Ижил төстэй ажлын гүйцэтгэлийн гэрээ, хүлээлцсэн актын хуулбарыг нэмэлтээр хавсаргах',
          'Тоон гарын үсгээр тендерийн үнийн саналыг эцсийн хугацаанаас 2 цагийн өмнө илгээх',
        ],
      });
      setIsAuditing(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>ТББ Шалгагч AI</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-400/20 text-purple-200 border border-purple-400/40">
                  Pre-Submission Audit
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                {tender ? tender.tenderName : 'Тендерийн баримт бичгийн алдаа зөрүү шалгах'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {!auditResult ? (
            <>
              <div className="bg-purple-50 border border-purple-200/80 rounded-2xl p-4 text-xs text-purple-900 flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-1">Яагаад ТББ-аа урьдчилан шалгах ёстой вэ?</span>
                  Монгол улсад нийт тендерт оролцогчдын 35% нь тусгай зөвшөөрөл, борлуулалтын орлого, баримт бичгийн жижиг техникийн зөрүүнээс болж шууд хасагддаг. AI шалгагч нь таны эрсдэлийг урьдчилан илрүүлнэ.
                </div>
              </div>

              {/* Form inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Оролцогч Компанийн Нэр
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Жишээ: Монгол Констракшн ХХК"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Сүүлийн 2 жилийн борлуулалтын орлого (₮)
                    </label>
                    <input
                      type="text"
                      value={turnoverAmount}
                      onChange={(e) => setTurnoverAmount(e.target.value)}
                      placeholder="Жишээ: 1,500,000,000"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Тусгай зөвшөөрөл хүчинтэй эсэх
                    </label>
                    <select
                      value={hasSpecialLicense ? 'yes' : 'no'}
                      onChange={(e) => setHasSpecialLicense(e.target.value === 'yes')}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    >
                      <option value="yes">Тийм, шаардлагатай тусгай зөвшөөрөлтэй</option>
                      <option value="no">Үгүй / Тусгай зөвшөөрөлгүй</option>
                    </select>
                  </div>
                </div>

                {/* Upload Draft Bid Simulation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Тендерийн материал хавсаргах (PDF / Zip)
                  </label>
                  <div
                    onClick={() => setUploadedFiles(['Бэлтгэсэн_Тендерийн_Материал_v1.pdf', 'Санхүүгийн_Аудит_2025.pdf'])}
                    className="border-2 border-dashed border-slate-200 hover:border-purple-500 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-slate-50/60"
                  >
                    <Upload className="h-6 w-6 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs font-semibold text-slate-700 block">
                      {uploadedFiles.length > 0 ? `${uploadedFiles.length} файл хавсаргагдлаа` : 'Файлаа энд чирч оруулна уу'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {uploadedFiles.length > 0 ? uploadedFiles.join(', ') : 'Тендерийн санал, инженерүүдийн лавлагаа, санхүүгийн тайлан'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Result View */
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Score header */}
              <div className={`rounded-2xl p-5 border flex items-center justify-between gap-4 ${
                auditResult.status === 'passed'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : auditResult.status === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-rose-50 border-rose-200 text-rose-950'
              }`}>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
                    ТББ Шалгалтын Нийт Үнэлгээ
                  </div>
                  <div className="text-lg font-extrabold leading-tight">
                    {auditResult.summary}
                  </div>
                </div>

                <div className={`text-3xl font-black font-mono px-4 py-2 rounded-2xl border ${
                  auditResult.status === 'passed' ? 'bg-emerald-100/80 border-emerald-300 text-emerald-800' : 'bg-amber-100/80 border-amber-300 text-amber-800'
                }`}>
                  {auditResult.overallScore}%
                </div>
              </div>

              {/* Checks list */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Шалгуур үзүүлэлтүүдийн нийцэл:
                </h3>
                {auditResult.checks.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl border border-slate-200/90 bg-white flex items-start gap-3 text-xs">
                    {c.status === 'pass' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : c.status === 'warn' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900">{c.title}</div>
                      <div className="text-slate-600 mt-0.5">{c.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>AI Зөвлөмж & Засах алхмууд:</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {auditResult.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
          {auditResult ? (
            <button
              onClick={() => setAuditResult(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Дахин шалгах
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Болих
            </button>
          )}

          {!auditResult ? (
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI Шинжилж байна...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>ТББ-ийг Шалгах</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <span>Тайланг хаах</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
