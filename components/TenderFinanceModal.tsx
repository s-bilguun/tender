'use client';

import React, { useState } from 'react';
import { TenderItem } from '@/lib/types';
import { 
  X, ShieldCheck, DollarSign, Calculator, 
  Building2, CheckCircle2, ArrowRight, Loader2, Landmark
} from 'lucide-react';

interface TenderFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender?: TenderItem | null;
}

export const TenderFinanceModal: React.FC<TenderFinanceModalProps> = ({
  isOpen,
  onClose,
  tender,
}) => {
  const baseBudget = tender ? Number(tender.totalBudget) || 150_000_000 : 150_000_000;
  const [tenderBudget, setTenderBudget] = useState<number>(baseBudget);
  const [guaranteeType, setGuaranteeType] = useState<'bid' | 'performance' | 'advance' | 'loan'>('bid');
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  // Calculation Logic
  // Bid guarantee: 1% to 2% of budget
  // Performance guarantee: 5% of budget
  // Advance payment guarantee: 20% to 30% of budget
  // Bank fee: ~0.5% - 1.2% per quarter
  let guaranteeAmount = 0;
  let estimatedFee = 0;

  if (guaranteeType === 'bid') {
    guaranteeAmount = tenderBudget * 0.015; // 1.5%
    estimatedFee = Math.max(50_000, guaranteeAmount * 0.01);
  } else if (guaranteeType === 'performance') {
    guaranteeAmount = tenderBudget * 0.05; // 5%
    estimatedFee = Math.max(100_000, guaranteeAmount * 0.015);
  } else if (guaranteeType === 'advance') {
    guaranteeAmount = tenderBudget * 0.20; // 20%
    estimatedFee = Math.max(150_000, guaranteeAmount * 0.02);
  } else {
    guaranteeAmount = tenderBudget * 0.70; // 70% project loan
    estimatedFee = guaranteeAmount * (0.014 * durationMonths);
  }

  const formatMNT = (amount: number) => `₮ ${Math.round(amount).toLocaleString()}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Тендерийн Баталгаа & Санхүүжилт</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-400/40">
                  Trade Finance
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                {tender ? tender.tenderName : 'Барьцаагүй түргэн баталгаа & төслийн зээл'}
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
        <div className="p-6 overflow-y-auto space-y-6">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type Selection Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Үйлчилгээний Төрөл
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'bid', label: 'Тендерийн баталгаа (1-2%)' },
                    { id: 'performance', label: 'Гүйцэтгэлийн баталгаа (5%)' },
                    { id: 'advance', label: 'Урьдчилгаа баталгаа (20%)' },
                    { id: 'loan', label: 'Төслийн санхүүжилт' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setGuaranteeType(t.id as any)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        guaranteeType === t.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget amount input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Тендерийн Төсөвт Өртөг (₮)
                </label>
                <input
                  type="number"
                  value={tenderBudget}
                  onChange={(e) => setTenderBudget(Number(e.target.value) || 0)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Live Calculator Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span className="text-xs text-slate-300 font-medium">Шаардагдах баталгааны хэмжээ:</span>
                  <span className="text-lg font-black text-emerald-400 font-mono">
                    {formatMNT(guaranteeAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <span className="text-xs text-slate-300 font-medium">Тооцоолсон шимтгэл / хүү:</span>
                  <span className="text-base font-bold text-white font-mono">
                    {formatMNT(estimatedFee)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Landmark className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Хамтрагч банк & ББСБ-аар 2 цагийн дотор цахимаар баталгаажуулна.</span>
                </div>
              </div>

              {/* Company contact input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Утасны дугаар
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9911-XXXX"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Байгууллагын регистр
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="1234567"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Хүсэлт илгээж байна...</span>
                  </>
                ) : (
                  <>
                    <span>Баталгаа гаргуулах хүсэлт илгээх</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Success confirmation */
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Хүсэлт амжилттай бүртгэгдлээ!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Таны баталгаа гаргуулах хүсэлтийг манай санхүүгийн хамтрагч байгууллага хүлээн авлаа. Мэргэжилтэн 15 минутын дотор холбогдож баримт бичгийг цахимаар баталгаажуулна.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                Ойлголоо
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
