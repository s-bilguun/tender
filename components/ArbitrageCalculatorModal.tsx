'use client';

import React, { useState } from 'react';
import { 
  X, Calculator, Sparkles, TrendingUp, DollarSign, 
  ArrowRight, ShieldCheck, CheckCircle2, Building2, Globe2, Loader2, Handshake
} from 'lucide-react';
import { Locale, TenderItem } from '@/lib/types';
import { MNT_TO_RMB_RATE, MNT_TO_USD_RATE } from '@/lib/product-categories';

interface ArbitrageCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tender?: TenderItem | null;
  locale?: Locale;
}

export const ArbitrageCalculatorModal: React.FC<ArbitrageCalculatorModalProps> = ({
  isOpen,
  onClose,
  tender,
  locale = 'en',
}) => {
  const defaultProductName = 
    locale === 'zh' 
      ? '高压电力电缆 / 挖掘机 / 办公桌椅' 
      : locale === 'mn' 
      ? 'Хүчний кабель / Экскаватор / Оффис сандал' 
      : 'Heavy Machinery / Power Cables / Office Furniture';

  const [productName, setProductName] = useState(tender?.tenderName || defaultProductName);
  const [factoryPriceUsd, setFactoryPriceUsd] = useState(500);
  const [quantity, setQuantity] = useState(200);
  const [govBudgetUsd, setGovBudgetUsd] = useState(
    tender ? Math.round(Number(tender.totalBudget) / MNT_TO_USD_RATE) : 200000
  );
  const [step, setStep] = useState<'input' | 'result' | 'applied'>('input');
  const [selectedRoute, setSelectedRoute] = useState<'direct' | 'jv'>('jv');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Financial calculations
  const unitGovPrice = Math.round(govBudgetUsd / Math.max(1, quantity));
  const totalFactoryCost = factoryPriceUsd * quantity;
  const estimatedShippingUsd = Math.round(totalFactoryCost * 0.12); // ~12% freight & customs
  const recommendedBidPriceUsd = Math.round(govBudgetUsd * 0.85); // 15% lower than gov max budget to win
  const estimatedNetProfitUsd = recommendedBidPriceUsd - totalFactoryCost - estimatedShippingUsd;
  const profitMarginPercent = Math.round((estimatedNetProfitUsd / totalFactoryCost) * 100);

  const formatUSD = (amount: number) => `$ ${Math.round(amount).toLocaleString()}`;
  const formatRMB = (amount: number) => `¥ ${Math.round(amount * 7.15).toLocaleString()}`;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('applied');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-300">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
                <span>
                  {locale === 'zh' 
                    ? '出厂价与政府采购差价测算器' 
                    : locale === 'mn' 
                    ? 'Үйлдвэрийн үнэ & Тендерийн зөрүү тооцоолуур' 
                    : 'Factory Cost vs. Gov Tender Arbitrage Calculator'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-400/30">
                  {locale === 'zh' ? '高利润' : 'High Margin'}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300">
                {locale === 'zh'
                  ? '“我出厂价 $500，蒙古采购价 $1000 — 测算我能赚多少并一键参标”'
                  : locale === 'mn'
                  ? 'Үйлдвэрийн үнэ $500 байхад тендерт $1000-аар зарлагддаг — Зөрүү ашгаа тооцоолж оролцох'
                  : '"I sell for $500, government buys for $1,000 — calculate my net margin & participate"'}
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

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-950 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold block mb-0.5">
                    {locale === 'zh' 
                      ? '为什么外国/中国工厂应该参与蒙古政府采购？' 
                      : locale === 'mn' 
                      ? 'Яагаад шууд үйлдвэрлэгчид өрсөлдөх нь ашигтай вэ?' 
                      : 'Why Direct Manufacturers Have a Huge Price Advantage?'}
                  </span>
                  {locale === 'zh'
                    ? '蒙古国绝大多数工业品、设备、建材和耗材完全依赖进口，当地贸易商层层加价使政府采购单价远高于出厂价。制造商直接投标可实现大宗出货 + 丰厚净利。'
                    : locale === 'mn'
                    ? 'Ихэнх тоног төхөөрөмж, хүнд машин механизм, эмнэлгийн хэрэгслийг гаднаас импортолдог тул үйлдвэрлэгчид шууд оролцсоноор дундын зуучлалын зардлыг хэмнэж өндөр маржин авна.'
                    : 'Most equipment, cables, furniture, and medical supplies in Mongolia are imported through middlemen. Direct suppliers and foreign manufacturers can capture massive margins by bidding direct or via JV.'}
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {locale === 'zh' ? '产品名称 / 商品类别' : locale === 'mn' ? 'Бүтээгдэхүүний нэр / Ангилал' : 'Product / Commodity Name'}
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-medium"
                    placeholder={
                      locale === 'zh'
                        ? '例如: 10kV高压电力电缆, 20吨挖掘机, 办公椅, CT机...'
                        : locale === 'mn'
                        ? 'Жишээ: 10кВ цахилгааны кабель, 20т экскаватор, оффис сандал...'
                        : 'e.g. 10kV Power Cables, 20t Excavators, Hospital Beds, Computers...'
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {locale === 'zh' ? '我的工厂出厂单价 ($ USD)' : locale === 'mn' ? 'Үйлдвэрийн нэгж үнэ ($ USD)' : 'Factory Unit Cost ($ USD)'}
                    </label>
                    <input
                      type="number"
                      value={factoryPriceUsd}
                      onChange={(e) => setFactoryPriceUsd(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                      {locale === 'zh' ? `约合 ${formatRMB(factoryPriceUsd)} / 件` : `~ $${factoryPriceUsd} / unit`}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {locale === 'zh' ? '预估采购数量' : locale === 'mn' ? 'Тоо ширхэг' : 'Estimated Quantity'}
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {locale === 'zh' ? '件 / 台 / 米 / 吨' : locale === 'mn' ? 'ш / метр / ком / тн' : 'units / meters / sets'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {locale === 'zh' ? '标段政府总预算 ($ USD)' : locale === 'mn' ? 'Төсөвт нийт өртөг ($ USD)' : 'Gov Total Budget ($ USD)'}
                    </label>
                    <input
                      type="number"
                      value={govBudgetUsd}
                      onChange={(e) => setGovBudgetUsd(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm font-bold font-mono focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                      {locale === 'zh' ? `折合采购单价: ~$${unitGovPrice}` : locale === 'mn' ? `Нэгжийн төсөв: ~$${unitGovPrice}` : `Gov Unit Price: ~$${unitGovPrice}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Simulation Result Card */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs text-slate-400 block mb-0.5">
                      {locale === 'zh' ? '预估本次参标净利润 (Net Profit)' : locale === 'mn' ? 'Тооцоолсон цэвэр ашиг (Net Profit)' : 'Estimated Net Profit'}
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                      {formatUSD(estimatedNetProfitUsd)}
                    </div>
                    <span className="text-xs text-slate-300 font-mono">
                      {locale === 'zh' 
                        ? <>约合 <strong className="text-emerald-300">{formatRMB(estimatedNetProfitUsd)}</strong> 人民币</>
                        : `~ ${formatUSD(estimatedNetProfitUsd)} (after estimated 12% freight & customs)`}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block mb-0.5">
                      {locale === 'zh' ? '预期出厂利润率' : locale === 'mn' ? 'Ашгийн маржин' : 'Est. Profit Margin'}
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                      +{profitMarginPercent}%
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">
                      {locale === 'zh' ? '政府预算单价' : locale === 'mn' ? 'Төсвийн нэгж үнэ' : 'Gov Budget / Unit'}
                    </span>
                    <span className="font-bold text-white font-mono">${unitGovPrice}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 block">
                      {locale === 'zh' ? '您的出厂单价' : locale === 'mn' ? 'Үйлдвэрийн үнэ' : 'Your Factory Cost'}
                    </span>
                    <span className="font-bold text-rose-300 font-mono">${factoryPriceUsd}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block">
                      {locale === 'zh' ? '建议竞标总报价' : locale === 'mn' ? 'Санал болгох үнэ' : 'Target Bid Price'}
                    </span>
                    <span className="font-bold text-emerald-400 font-mono">{formatUSD(recommendedBidPriceUsd)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => setStep('result')}
                className="w-full h-11 sm:h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-98"
              >
                <span>
                  {locale === 'zh' 
                    ? '下一步：选择我的投标参与通道' 
                    : locale === 'mn' 
                    ? 'Дараах: Оролцох сувгаа сонгох' 
                    : 'Next: Select Bidding & Participation Route'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 'result' && (
            <form onSubmit={handleApply} className="space-y-4 animate-in fade-in duration-150">
              <h3 className="text-sm font-bold text-slate-900">
                {locale === 'zh' 
                  ? '请选择您参与该标段的方式：' 
                  : locale === 'mn' 
                  ? 'Тендерт оролцох хэлбэрээ сонгоно уу:' 
                  : 'Select your participation method:'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Route 1: Direct Bidding */}
                <div
                  onClick={() => setSelectedRoute('direct')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    selectedRoute === 'direct'
                      ? 'border-rose-600 bg-rose-50/40 ring-2 ring-rose-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Globe2 className="h-4 w-4 text-rose-600" />
                        <span>
                          {locale === 'zh' 
                            ? '通道 A：境外企业独立跨境投标' 
                            : locale === 'mn' 
                            ? 'Суваг A: Гадаад нийлүүлэгч бие даан оролцох' 
                            : 'Route A: Direct Cross-Border Bidding'}
                        </span>
                      </span>
                      {selectedRoute === 'direct' && <CheckCircle2 className="h-4 w-4 text-rose-600" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {locale === 'zh'
                        ? '适用于单项货物采购公开招标。使用境外企业营业执照、公证翻译件及银行反担保函直接提报，货交扎门乌德或乌兰巴托。'
                        : locale === 'mn'
                        ? '300 сая төгрөгөөс дээш бараа нийлүүлэлтийн олон улсын тендерт шууд үйлдвэрлэгчийн хувиар бие даан оролцох.'
                        : 'For direct commodity and goods procurement (>300M MNT). Submit foreign corporate docs with notary translation and bank guarantee.'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded w-fit">
                    {locale === 'zh' ? '自主把控 100% 利润' : locale === 'mn' ? '100% Шууд ашиг' : 'Retain 100% Direct Margin'}
                  </span>
                </div>

                {/* Route 2: JV Matching */}
                <div
                  onClick={() => setSelectedRoute('jv')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    selectedRoute === 'jv'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Handshake className="h-4 w-4 text-indigo-600" />
                        <span>
                          {locale === 'zh' 
                            ? '通道 B：匹配蒙古本土联合体伙伴' 
                            : locale === 'mn' 
                            ? 'Суваг B: Монголын тусгай зөвшөөрөлтэй түншээр хамтрах' 
                            : 'Route B: Local Joint Venture (JV) Partner'}
                        </span>
                      </span>
                      {selectedRoute === 'jv' && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {locale === 'zh'
                        ? '由平台对接持有特许资质的蒙古国当地认证企业，由蒙方负责当地清关、纳税、现场验收，您专注提供出厂货物与技术支持。'
                        : locale === 'mn'
                        ? 'Монголын тусгай зөвшөөрөлтэй туршлагатай компанитай хамтран консорциум байгуулж, эрсдэлгүй нийлүүлэх.'
                        : 'Partner with a certified Mongolian licensee company who handles local permits, customs clearance, and site deployment.'}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded w-fit">
                    {locale === 'zh' ? '最省心 / 规避属地风险' : locale === 'mn' ? 'Эрсдэлгүй хамтрал' : 'Low Friction / Local Compliant'}
                  </span>
                </div>
              </div>

              {/* Contact Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {locale === 'zh' ? '联系人姓名 / 微信 / 邮箱' : locale === 'mn' ? 'Холбоо барих хүн / И-мэйл' : 'Contact Person / WhatsApp / Email'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Name / WeChat / Email"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {locale === 'zh' ? '手机号 (+86 / +976 / intl)' : locale === 'mn' ? 'Утасны дугаар' : 'Phone / Mobile (+ country code)'}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+86 / +976 / +1 ..."
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {locale === 'zh' ? '返回修改' : locale === 'mn' ? 'Буцах' : 'Back'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{locale === 'zh' ? '正在提报意向...' : locale === 'mn' ? 'Илгээж байна...' : 'Submitting intent...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{locale === 'zh' ? '确认提交意向 — 开启投标' : locale === 'mn' ? 'Тендерт оролцох хүсэлт илгээх' : 'Submit Intent — Start Bidding'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 'applied' && (
            <div className="text-center py-6 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {locale === 'zh' 
                  ? '跨境参标对接意向已受理！' 
                  : locale === 'mn' 
                  ? 'Таны хүсэлтийг амжилттай хүлээн авлаа!' 
                  : 'Bidding Intent Successfully Registered!'}
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                {locale === 'zh'
                  ? 'TenderHub 跨境采购服务专员已收到您的商品测算方案，将在 2 小时内与您沟通招标文件翻译、报关路径及联合体协议签署流程。'
                  : locale === 'mn'
                  ? 'Манай шинжээч таны барааны мэдээллийн дагуу тендерийн бичиг баримт, тээвэр логистик, хамтралын гэрээг баталгаажуулахаар холбогдох болно.'
                  : 'Our cross-border procurement team has received your calculation. We will contact you to assist with official document translation, bank guarantees, and JV agreements.'}
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {locale === 'zh' ? '完成' : locale === 'mn' ? 'Хаах' : 'Done'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
