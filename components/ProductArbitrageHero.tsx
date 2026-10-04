'use client';

import React, { useState } from 'react';
import { Search, Sparkles, TrendingUp, Globe2, ArrowRight, CornerDownLeft, ShieldCheck, DollarSign } from 'lucide-react';
import { Locale } from '@/lib/types';
import { PRODUCT_CATEGORIES, ProductCategory } from '@/lib/product-categories';

interface ProductArbitrageHeroProps {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  currency: 'CNY' | 'USD' | 'MNT';
  setCurrency: (c: 'CNY' | 'USD' | 'MNT') => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSelectCategory: (cat: ProductCategory) => void;
  onOpenArbitrageModal: () => void;
}

export const ProductArbitrageHero: React.FC<ProductArbitrageHeroProps> = ({
  locale,
  setLocale,
  currency,
  setCurrency,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onSelectCategory,
  onOpenArbitrageModal,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearchSubmit();
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden mb-6">
      {/* Glow blobs */}
      <div className="absolute top-0 right-10 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Top Language & Currency Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-400/30">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
              {locale === 'zh' ? '🇨🇳 蒙古国跨境投标与商品出海门户' : locale === 'mn' ? '🇲🇳 Хил дамнасан худалдан авалтын систем' : '🌐 Cross-Border Mongolia Procurement'}
            </span>

            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-slate-400 bg-slate-800/60 border border-slate-700/60">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              {locale === 'zh' ? '支持境外独立投标 / 本土联合体对接' : 'Direct Bidding & JV Matching'}
            </span>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700/80 text-xs">
              <button
                type="button"
                onClick={() => setCurrency('CNY')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currency === 'CNY' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                ¥ 人民币 (CNY)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currency === 'USD' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                $ USD
              </button>
              <button
                type="button"
                onClick={() => setCurrency('MNT')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currency === 'MNT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                ₮ MNT
              </button>
            </div>
          </div>
        </div>

        {/* Hero Title & Value Proposition */}
        <div className="max-w-3xl space-y-2.5">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {locale === 'zh' ? (
              <>
                生产什么，就卖什么 <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400">— 捕捉蒙古国高溢价采购商机</span>
              </>
            ) : locale === 'mn' ? (
              <>
                Үйлдвэрлэдэг бараагаараа <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">— Засгийн газрын худалдан авалтад шууд өрсөлдөх</span>
              </>
            ) : (
              <>
                Sell What You Make <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-emerald-400">— Capture 50%~130% Margins in Mongolia Tenders</span>
              </>
            )}
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm sm:leading-relaxed">
            {locale === 'zh' ? (
              <>
                国内出厂价 <strong className="text-amber-300 font-mono">$500</strong> 的产品，蒙古国近期同类政府采购单价达 <strong className="text-emerald-400 font-mono">$1,000+</strong>。输入您销售的商品，系统立即匹配正在招标的采购包与利润差价。
              </>
            ) : locale === 'mn' ? (
              <>
                Үйлдвэрийн үнээр шууд нийлүүлж, Монгол Улсын Засгийн газар болон томоохон уул уурхай, эмнэлэг, дэд бүтцийн тендерүүдээс өндөр ашиг бүтээх боломж.
              </>
            ) : (
              <>
                Factory price $500 items frequently get procured by Mongolian entities at $1,000+. Search your commodity to see active tenders, estimated budgets, and foreign bidder eligibility.
              </>
            )}
          </p>
        </div>

        {/* Big Search Input with "Product / Item" focus */}
        <div className="w-full">
          <div
            className={`relative flex items-center bg-slate-900/90 backdrop-blur-md rounded-2xl border transition-all shadow-lg ${
              isFocused
                ? 'border-rose-500 ring-4 ring-rose-500/20 shadow-rose-500/10'
                : 'border-slate-700/80 hover:border-slate-600'
            }`}
          >
            <div className="pl-4 sm:pl-5 pr-2 flex items-center pointer-events-none text-slate-400">
              <Search className={`h-5 w-5 transition-colors ${isFocused ? 'text-rose-400' : 'text-slate-400'}`} />
            </div>

            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder={
                locale === 'zh'
                  ? '输入您生产或销售的商品（如: 挖掘机, 电缆, 病床, 电脑, 办公椅, 冻肉, 钢管）...'
                  : locale === 'mn'
                  ? 'Нийлүүлэх бараа, бүтээгдэхүүний нэр (жишээ: Кабель, Экскаватор, Эмнэлгийн ор, Сургуулийн ширээ)...'
                  : 'Enter the product you sell (e.g., Excavator, Cables, Hospital Beds, Chairs, Computers)...'
              }
              className="w-full py-3.5 sm:py-4.5 text-xs sm:text-base text-white placeholder-slate-400 bg-transparent focus:outline-hidden font-medium"
            />

            <div className="pr-2 sm:pr-3 flex items-center gap-2">
              <button
                onClick={onSearchSubmit}
                className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              >
                <span>{locale === 'zh' ? '匹配商机' : locale === 'mn' ? 'Хайх' : 'Match Tenders'}</span>
                <CornerDownLeft className="h-4 w-4 opacity-80 hidden sm:inline" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Category Chips with Arbitrage Margins */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-rose-400" />
              <span>{locale === 'zh' ? '热销品类与采购差价空间：' : 'Hot Commodities & Procurement Arbitrage Margins:'}</span>
            </span>

            <button
              onClick={onOpenArbitrageModal}
              className="text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer text-[11px] font-bold"
            >
              <span>
                {locale === 'zh' 
                  ? '🧮 测算我的出厂利润率' 
                  : locale === 'mn' 
                  ? '🧮 Үнийн зөрүү, ашиг тооцоолох' 
                  : '🧮 Calculate My Factory Profit Margin'}
              </span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat)}
                className="bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/60 rounded-2xl p-3 text-left transition-all group flex flex-col justify-between gap-2 cursor-pointer shadow-xs active:scale-98"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                    {cat.arbitrageMargin} {locale === 'zh' ? '差价' : 'Margin'}
                  </span>
                </div>

                <div>
                  <div className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors line-clamp-1">
                    {locale === 'zh' ? cat.nameZh : locale === 'mn' ? cat.nameMn : cat.nameEn}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-between font-mono">
                    <span>{locale === 'zh' ? '出厂' : locale === 'mn' ? 'Үйлдвэр' : 'Cost'}: ${cat.factoryPriceUsd}</span>
                    <span className="text-emerald-400 font-bold">{locale === 'zh' ? '采购' : locale === 'mn' ? 'Төсөв' : 'Gov'}: ${cat.govPriceUsd}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
