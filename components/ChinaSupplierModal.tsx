'use client';

import React, { useState } from 'react';
import { TenderItem } from '@/lib/types';
import { 
  X, Globe2, Sparkles, Building2, 
  CheckCircle2, ArrowRight, Loader2, Package, Truck, ShieldCheck
} from 'lucide-react';

interface ChinaSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender?: TenderItem | null;
}

export const ChinaSupplierModal: React.FC<ChinaSupplierModalProps> = ({
  isOpen,
  onClose,
  tender,
}) => {
  const [requestedItems, setRequestedItems] = useState(
    tender?.liveBundleSummary?.topItems?.map(i => i.name).join(', ') || 
    tender?.tenderName || 
    'Барилгын материал, цахилгааны кабель'
  );
  const [targetQuantity, setTargetQuantity] = useState('100');
  const [deliveryLocation, setDeliveryLocation] = useState('Улаанбаатар / Замын-Үүд');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-rose-950 via-red-900 to-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-300">
              <Globe2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Tender2China — Хятадаас шууд үнийн санал авах</span>
              </h2>
              <p className="text-xs text-rose-200">
                19,000+ баталгаажсан үйлдвэрлэгч, тээвэр логистик, гаалийн бүрдүүлэлт
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
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-3.5 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">Үйлдвэрийн шууд үнээр өрсөлдөх давуу тал</span>
                  Тендерийн техникийн тодорхойлолтод заасан бараа бүтээгдэхүүнийг Хятадын баталгаат үйлдвэрүүдээс шууд татаж, Монголд нийлүүлэх зардлыг (CIF/DDP) тооцоолно.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Нийлүүлэх бараа, техникийн үзүүлэлт
                </label>
                <textarea
                  rows={3}
                  value={requestedItems}
                  onChange={(e) => setRequestedItems(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  placeholder="Бүтээгдэхүүний марк, тоо хэмжээ, загвар..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Тоо хэмжээ (Ширхэг / Тн / Метр)
                  </label>
                  <input
                    type="text"
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Хүргэх байршил
                  </label>
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Утасны дугаар
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9911-XXXX"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    И-мэйл хаяг
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="info@company.mn"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Үйлдвэрлэгчид илгээж байна...</span>
                  </>
                ) : (
                  <>
                    <span>🇨🇳 Хятад үйлдвэрүүд рүү үнийн санал илгээх</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Үнийн саналын хүсэлт илгээгдлээ!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                Таны бүтээгдэхүүний техникийн шаардлага Хятадын нийлүүлэгчдийн сүлжээнд байршлаа. Үйлдвэрийн үнийн санал, тээврийн зардлын тооцоог 24 цагийн дотор таны хаягт хүргүүлнэ.
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
