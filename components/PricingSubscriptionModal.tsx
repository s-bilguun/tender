'use client';

import React, { useEffect, useState } from 'react';
import { Locale } from '@/lib/types';
import {
  X, CheckCircle2, Sparkles, ShieldCheck, Crown, Building2,
  FileText, Globe2, Zap, MessageSquare, Download, Bell, ArrowRight
} from 'lucide-react';

interface PricingSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  locale: Locale;
}

export const PricingSubscriptionModal: React.FC<PricingSubscriptionModalProps> = ({
  isOpen,
  onClose,
  locale,
}) => {
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [contactInput, setContactInput] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isZh = locale === 'zh';
  const isMn = locale === 'mn';

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInput.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle,
          contact: contactInput,
          company: companyInput,
          locale,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || `HTTP ${res.status}`);
      setSubmitted(true);
    } catch {
      setSubmitError(
        isZh ? '提交失败，请稍后重试或直接联系我们。' : isMn ? 'Илгээж чадсангүй. Дахин оролдоно уу.' : 'Could not submit. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-5 sm:px-8 py-5 bg-white dark:bg-zinc-900 flex items-start justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
              {isZh ? '会员方案' : isMn ? 'Багцууд' : 'Plans'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
              {isZh
                ? '不限次 AI 中文解读标书、导出采购清单，以及跨境投标支持。'
                : isMn
                ? 'Хязгааргүй AI шинжилгээ, барааны жагсаалт экспорт, гадаад оролцогчийн дэмжлэг.'
                : 'Unlimited AI document analysis, bill-of-quantities exports and cross-border bidding support.'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-8 overflow-y-auto space-y-6 bg-slate-50/70 dark:bg-zinc-950 flex-1">
          
          {/* Billing Toggle */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-md border border-slate-200 dark:border-zinc-800">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 font-medium">
              
              <span>
                {isZh
                  ? '支持微信支付 (WeChat Pay)、支付宝 (Alipay)、对公人民币及蒙图账户结算（可开具商业发票）'
                  : isMn
                  ? 'Байгууллагын нэхэмжлэх, QPay болон олон улсын төлбөрийн хэрэгслээр идэвхжүүлэх боломжтой'
                  : 'Instant activation via WeChat Pay, Alipay, Corporate Wire, or QPay Invoice'}
              </span>
            </div>

            <div className="inline-flex items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-md border border-slate-200 dark:border-zinc-700 shrink-0">
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
 billingCycle === 'annual'
 ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900'
 : 'text-slate-600 dark:text-zinc-400'
 }`}
              >
                <span>{isZh ? '按年订阅 (省 40%)' : isMn ? 'Жилээр (40% хэмнэлт)' : 'Annual (Save 40%)'}</span>
              </button>
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
 billingCycle === 'monthly'
 ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-900'
 : 'text-slate-600 dark:text-zinc-400'
 }`}
              >
                <span>{isZh ? '按月订阅' : isMn ? 'Сараар' : 'Monthly'}</span>
              </button>
            </div>
          </div>

          {/* 3 Pricing Tiers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Tier 1: Free Explorer */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-bold text-slate-500">
                    {isZh ? '基础体验版' : isMn ? 'Энгийн багц' : 'Starter Tier'}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                    {isZh ? '免费访客体验' : isMn ? 'Үнэгүй турших' : 'Free Explorer'}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-semibold text-slate-900 dark:text-white font-mono">
                      {isZh ? '¥0' : isMn ? '0₮' : '$0'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {isZh ? '/ 永久基础浏览' : isMn ? '/ сар' : '/ forever'}
                    </span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-zinc-300 pt-3 border-t border-slate-100 dark:border-zinc-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{isZh ? '浏览全量蒙古国招标公告与人民币预算折算' : isMn ? 'Нээлттэй тендерийн жагсаалт, төсөв шүүх' : 'Browse open tenders & multi-currency budgets'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{isZh ? '中蒙英三语关键词跨语言搜索（如搜“电缆”、“医疗”）' : isMn ? 'Салбар болон захиалагчаар хайх' : 'Cross-language Chinese/English/Mongolian search'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{isZh ? '每日 3 次 AI 标书问答体验' : isMn ? 'Өдөрт 3 удаа AI шинжээчээс асуух' : 'Up to 3 AI PDF questions per day'}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={onClose}
                className="mt-6 w-full py-2.5 rounded-md border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {isZh ? '当前正在使用' : isMn ? 'Одоогийн багц' : 'Current Plan'}
              </button>
            </div>

            {/* Tier 2: VIP Pro SaaS (Most Popular) */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 border-2 border-slate-900 dark:border-white flex flex-col justify-between relative">
              <div className="absolute -top-3 right-5 px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-white dark:text-zinc-900 text-[11px] font-medium">
                {isZh ? '推荐' : isMn ? 'Санал болгох' : 'Recommended'}
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                    {isZh ? 'VIP 专业情报版' : isMn ? 'VIP Про багц' : 'VIP Pro Intelligence'}
                  </span>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                    {isZh ? '中企出海投标 VIP 会员' : isMn ? 'Бизнес AI Шинжээч VIP' : 'Pro Bidder SaaS'}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                      {billingCycle === 'annual'
                        ? (isZh ? '¥4,999' : isMn ? '3,500,000₮' : '$699')
                        : (isZh ? '¥699' : isMn ? '490,000₮' : '$99')}
                    </span>
                    <span className="text-xs text-slate-500">
                      {billingCycle === 'annual'
                        ? (isZh ? '/ 年 (折合 ¥416/月)' : isMn ? '/ жил' : '/ year')
                        : (isZh ? '/ 月' : isMn ? '/ сар' : '/ month')}
                    </span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-700 dark:text-zinc-200 pt-3 border-t border-slate-100 dark:border-zinc-800 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{isZh ? '无限次 AI 蒙文标书 (ТШББ) 全文中文精译与深度问答' : isMn ? 'Хязгааргүй AI ТШББ PDF шинжилгээ болон асуулт хариулт' : 'Unlimited AI ТШББ PDF translation & clause Q&A'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{isZh ? '官方标书 PDF 极速直连下载（免翻墙、不惧蒙古官网拦截）' : isMn ? 'Албан ёсны ТШББ PDF шууд татах болон BoQ хүснэгт задлах' : 'Direct CDN PDF downloads & full BoQ table extraction'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{isZh ? '第二章 (ТШЗ) 保证金、营业额、资质门槛自动提取对比' : isMn ? 'ТШЗ 18.1, 24.1 шалгуур үзүүлэлтүүдийн автомат задаргаа' : 'Automated Chapter II BDS & Chapter III Spec extraction'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{isZh ? '微信/邮箱每日新标精准推送（按品类如电缆、矿机、医疗订阅）' : isMn ? 'Салбар, түлхүүр үгээр шинэ тендерийн мэдэгдэл хүлээн авах' : 'Real-time WeChat & Email tender alerts by keyword'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{isZh ? '历史中标结果、竞争对手报价及业主采购偏好透视' : isMn ? 'Өмнөх оны ялагч болон өрсөлдөгчийн үнийн саналын түүх' : 'Historical winner & competitor bid price intelligence'}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setSelectedPlan('VIP Pro');
                  setSubmitted(false);
                }}
                className="mt-6 w-full py-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{isZh ? '立即开通 VIP 会员' : isMn ? 'VIP эрх идэвхжүүлэх' : 'Upgrade to VIP Pro'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Tier 3: Enterprise Cross-Border Concierge */}
            <div className="bg-slate-900 dark:bg-zinc-800 text-white rounded-lg p-6 border border-slate-800 dark:border-zinc-700 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-medium text-slate-400">
                    {isZh ? '企业级全托管落地服务' : isMn ? 'Корпораци & Түншлэл' : 'Enterprise & JV Concierge'}
                  </span>
                  <h3 className="text-lg font-semibold text-white mt-1">
                    {isZh ? '联合体对接 + 保函代办尊享版' : isMn ? 'Түншлэл (JV) & Банкны баталгаа' : 'Cross-Border JV & Bid Bond Suite'}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold text-white tabular-nums">
                      {isZh ? '¥19,800' : isMn ? 'Тухай бүр' : '$2,800'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {isZh ? '/ 年 或 按单定制' : isMn ? '/ гэрээгээр' : '/ year or per bid'}
                    </span>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 pt-3 border-t border-slate-800">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>{isZh ? '包含 VIP 专业情报版全部 AI 与数据导出权益（支持 5 个子账号）' : isMn ? 'VIP Про багцын бүх эрх + 5 хэрэглэгчийн эрх' : 'Includes all VIP Pro features (up to 5 team seats)'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>{isZh ? '蒙古国持证建筑/工程公司联合体 (JV) 一对一合规撮合签约' : isMn ? 'Тусгай зөвшөөрөлтэй компанитай Түншлэл (JV) зуучлах' : '1-on-1 certified Mongolian JV partner matching'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>{isZh ? '中资银行 / 蒙古本土银行投标保函代办' : isMn ? 'Тендерийн баталгаа болон гүйцэтгэлийн баталгаа шуурхай гаргах' : 'Bank of China Ulaanbaatar / Golomt Bank bid bond issuance'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                    <span>{isZh ? '蒙古语投标文件专业翻译、法院公证及 tender.gov.mn 代投服务' : isMn ? 'Тендерийн материал бэлтгэл, орчуулга, хуулийн зөвлөх' : 'Full Mongolian bid document translation, notarization & filing'}</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setSelectedPlan('Enterprise Concierge');
                  setSubmitted(false);
                }}
                className="mt-6 w-full py-3 rounded-md bg-white hover:bg-slate-200 text-slate-900 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{isZh ? '预约跨境投标顾问对接' : isMn ? 'Зөвлөхтэй холбогдох' : 'Contact Bidding Concierge'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

          </div>

          {/* Instant Lead / Activation Drawer when a plan is clicked */}
          {selectedPlan && (
            <div className="bg-white dark:bg-zinc-900 border-2 border-blue-500/40 rounded-lg p-5 animate-in fade-in duration-150">
              {submitted ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {isZh
                          ? `已收到您的【${selectedPlan}】开通申请！`
                          : isMn
                          ? `Таны [${selectedPlan}] хүсэлтийг хүлээн авлаа!`
                          : `Request received for ${selectedPlan}!`}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">
                        {isZh
                          ? '我们的中蒙双语客户经理将在 15 分钟内通过微信/电话为您开通 VIP 账号并发送付款码。'
                          : isMn
                          ? 'Манай менежер тантай 15 минутын дотор холбогдож эрхийг идэвхжүүлнэ.'
                          : 'Our bilingual account manager will reach out via WeChat/Email within 15 minutes to activate your account.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPlan(null)}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 cursor-pointer"
                  >
                    {isZh ? '完成' : 'OK'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleActivateSubmit} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {isZh
                        ? `快速开通【${selectedPlan}】— 请留下您的微信号 / 手机号或邮箱`
                        : isMn
                        ? `[${selectedPlan}] багц идэвхжүүлэх — Утас эсвэл И-мэйл үлдээнэ үү`
                        : `Activate ${selectedPlan} — Enter your WeChat ID, Phone, or Work Email`}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      {isZh ? '取消' : 'Cancel'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={contactInput}
                      onChange={(e) => setContactInput(e.target.value)}
                      placeholder={isZh ? '微信号 / 手机号 / 邮箱 (必填)' : isMn ? 'Утасны дугаар / И-мэйл' : 'WeChat ID / Phone / Email'}
                      className="px-3.5 py-2.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                    <input
                      type="text"
                      value={companyInput}
                      onChange={(e) => setCompanyInput(e.target.value)}
                      placeholder={isZh ? '企业名称 / 主营产品（如：电力电缆、医疗器械）' : isMn ? 'Байгууллагын нэр / Чиглэл' : 'Company Name & Main Products'}
                      className="px-3.5 py-2.5 rounded-md bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
                    >
                      {isSubmitting
                        ? (isZh ? '提交中…' : isMn ? 'Илгээж байна…' : 'Submitting…')
                        : (isZh ? '获取微信支付码并立即开通' : isMn ? 'Нэхэмжлэх авах & Идэвхжүүлэх' : 'Get Instant Access')}
                    </button>
                  </div>
                  {submitError && (
                    <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{submitError}</p>
                  )}
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
