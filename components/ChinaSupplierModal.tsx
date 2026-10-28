'use client';

import React, { useState } from 'react';
import { TenderItem, Locale } from '@/lib/types';
import { 
  X, Globe2, Sparkles, Building2, 
  CheckCircle2, ArrowRight, Loader2, Package, Truck, ShieldCheck, Handshake
} from 'lucide-react';

interface ChinaSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender?: TenderItem | null;
  locale?: Locale;
}

export const ChinaSupplierModal: React.FC<ChinaSupplierModalProps> = ({
  isOpen,
  onClose,
  tender,
  locale = 'mn',
}) => {
  const isZh = locale === 'zh';

  const [requestedItems, setRequestedItems] = useState(
    tender?.liveBundleSummary?.topItems?.map(i => i.name).join(', ') || 
    tender?.tenderName || 
    (isZh ? '笔记本电脑、办公设备、电力电缆、重型机械' : 'Барилгын материал, цахилгааны кабель')
  );
  const [targetQuantity, setTargetQuantity] = useState(
    tender?.liveBundleSummary?.topItems?.[0]?.qty?.toString() || '100'
  );
  const [deliveryLocation, setDeliveryLocation] = useState(
    isZh ? '扎门乌德口岸 / 乌兰巴托市区' : 'Улаанбаатар / Замын-Үүд'
  );
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [serviceType, setServiceType] = useState<string>('consortium');
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
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-lg shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-rose-500/20 border border-rose-400/30 text-rose-300">
              {isZh ? <Handshake className="h-5 w-5" /> : <Globe2 className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>
                  {isZh 
                    ? '中蒙跨境投标对接 — 联合体与本地申报协助' 
                    : 'Tender2China — Хятадаас шууд үнийн санал авах'}
                </span>
              </h2>
              <p className="text-xs text-rose-200">
                {isZh
                  ? '协助对接蒙古国特许工程企业组建联合体、海关清关与投标保函'
                  : '19,000+ баталгаажсан үйлдвэрлэгч, тээвэр логистик, гаалийн бүрдүүлэлт'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg p-3.5 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-0.5">
                    {isZh ? '中企出海合规护航与本地化支持' : 'Үйлдвэрийн шууд үнээр өрсөлдөх давуу тал'}
                  </span>
                  {isZh ? (
                    '针对要求蒙古国特许施工资质或本地申报的标段，协助与蒙古国合规企业组建联合体(JV)协议公证、中国银行乌兰巴托分行保函开立及口岸清关物流。'
                  ) : (
                    'Тендерийн техникийн тодорхойлолтод заасан бараа бүтээгдэхүүнийг Хятадын баталгаат үйлдвэрүүдээс шууд татаж, Монголд нийлүүлэх зардлыг (CIF/DDP) тооцоолно.'
                  )}
                </div>
              </div>

              {/* Service Type Selection for Chinese mode */}
              {isZh && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    所需协助类型 (可多选核心意向)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setServiceType('consortium')}
                      className={`p-2.5 rounded-md border text-xs font-semibold text-left transition-all cursor-pointer ${
 serviceType === 'consortium'
 ? 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
 : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
 }`}
                    >
                      <span className="block font-bold">联合体组建</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">对接蒙古国特许资质成员</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceType('submission')}
                      className={`p-2.5 rounded-md border text-xs font-semibold text-left transition-all cursor-pointer ${
 serviceType === 'submission'
 ? 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
 : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
 }`}
                    >
                      <span className="block font-bold">标书申报代办</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">蒙文翻译/公证/电子签章</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceType('logistics')}
                      className={`p-2.5 rounded-md border text-xs font-semibold text-left transition-all cursor-pointer ${
 serviceType === 'logistics'
 ? 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200'
 : 'bg-white border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
 }`}
                    >
                      <span className="block font-bold">口岸清关物流</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">二连/扎门乌德DAP运输</span>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isZh ? '拟投标 / 拟供货物与技术规格' : 'Нийлүүлэх бараа, техникийн үзүүлэлт'}
                </label>
                <textarea
                  rows={3}
                  value={requestedItems}
                  onChange={(e) => setRequestedItems(e.target.value)}
                  className="w-full p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  placeholder={isZh ? '请输入拟供产品名称、品牌型号、技术参数及出厂能力...' : 'Бүтээгдэхүүний марк, тоо хэмжээ, загвар...'}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isZh ? '供应数量 (台 / 套 / 米 / 吨)' : 'Тоо хэмжээ (Ширхэг / Тн / Метр)'}
                  </label>
                  <input
                    type="text"
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isZh ? '意向交货口岸 / 地点' : 'Хүргэх байршил'}
                  </label>
                  <input
                    type="text"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isZh ? '联系人手机 / 微信 (WeChat)' : 'Утасны дугаар'}
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder={isZh ? '138-XXXX-XXXX 或 微信号' : '9911-XXXX'}
                    className="w-full h-10 px-3.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isZh ? '企业电子邮箱' : 'И-мэйл хаяг'}
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={isZh ? 'manager@factory.com' : 'info@company.mn'}
                    className="w-full h-10 px-3.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-md font-bold text-sm bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{isZh ? '正在提交对接需求...' : 'Үйлдвэрлэгчид илгээж байна...'}</span>
                  </>
                ) : (
                  <>
                    <span>{isZh ? '提交对接需求 (专人2小时内联络)' : 'Хятад үйлдвэрүүд рүү үнийн санал илгээх'}</span>
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
                {isZh ? '对接需求已成功提交！' : 'Үнийн саналын хүсэлт илгээгдлээ!'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                {isZh ? (
                  '我们已接收您的跨境投标对接意向。中蒙采购专员将根据标段要求，在2小时内通过微信或电话与您取得联系，提供联合体匹配与标书指导方案。'
                ) : (
                  'Таны бүтээгдэхүүний техникийн шаардлага Хятадын нийлүүлэгчдийн сүлжээнд байршлаа. Үйлдвэрийн үнийн санал, тээврийн зардлын тооцоог 24 цагийн дотор таны хаягт хүргүүлнэ.'
                )}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-md text-xs font-bold bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors cursor-pointer"
              >
                {isZh ? '我知道了' : 'Ойлголоо'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
