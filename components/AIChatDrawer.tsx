'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TenderItem, Locale } from '@/lib/types';
import { getTranslation } from '@/lib/translations';
import { X, Send, Sparkles, Bot, User, Trash2, Tag, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTender: TenderItem | null;
  onClearSelectedTender: () => void;
  locale: Locale;
}

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  selectedTender,
  onClearSelectedTender,
  locale,
}) => {
  const t = getTranslation(locale);
  const [selectedModel, setSelectedModel] = useState<string>('openrouter/free');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: locale === 'mn'
        ? `Сайн байна уу! Би tender.gov.mn-ийн бодит өгөгдөлд тулгуурласан **Тендерийн AI Шинжээч** байна.\n\nТа сонгон шалгаруулалт, тооцоолол, шаардлага болон салбарын чиг хандлагын талаар асуугаарай. (Дээрээс NVIDIA Nemotron 3 Ultra эсвэл Автомат загвараа сонгож болно).`
        : `Hello! I am your AI Tender Intelligence Assistant, powered by live data from Mongolia's procurement portal (tender.gov.mn).\n\nAsk me about upcoming bids, budget allocations, compliance checklists, or market trends.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (selectedTender && isOpen) {
      const autoPrompt = locale === 'mn'
        ? `"${selectedTender.tenderName}" (${selectedTender.tenderCode}) тендерийн төсөв, шаардлага, онцлогийг шинжилж, оролцогчдод зориулсан зөвлөмж өгнө үү.`
        : `Analyze the tender "${selectedTender.tenderName}" (${selectedTender.tenderCode}), highlighting key requirements and actionable recommendations.`;
      
      handleSend(autoPrompt);
    }
  }, [selectedTender]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          tenderContext: selectedTender || undefined,
          locale,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      const reply = data.reply || (locale === 'mn' ? 'Хариу үүсгэхэд алдаа гарлаа.' : 'Error generating reply.');

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: locale === 'mn' ? 'Сервертэй холбогдоход алдаа гарлаа.' : 'Network error connecting to AI engine.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: locale === 'mn' ? 'Харилцан яриа цэвэрлэгдлээ. Та асуултаа бичнэ үү.' : 'Chat cleared. How can I help you?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white border-l border-slate-200 shadow-xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {locale === 'mn' ? 'Тендерийн AI Шинжээч' : 'AI Tender Analyst'}
            </h3>
            <p className="text-[11px] text-slate-500">
              {locale === 'mn' ? 'Худалдан авалтын зөвлөх туслах' : 'Procurement intelligence assistant'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Цэвэрлэх"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Model Selector Bar */}
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-500 text-[11px] shrink-0">
          {locale === 'mn' ? 'AI Загвар:' : 'Model:'}
        </span>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-600 w-full max-w-[340px] truncate cursor-pointer shadow-2xs font-medium"
        >
          <option value="openrouter/free">⚡ Автомат сонголт (openrouter/free)</option>
          <option value="nvidia/nemotron-3-ultra-550b-a55b:free">🧠 NVIDIA Nemotron 3 Ultra 550B (free)</option>
          <option value="nvidia/nemotron-3.5-lightning:free">⚡ NVIDIA Nemotron 3.5 Lightning (free)</option>
          <option value="qwen/qwen3.8-27b:free">🌐 Qwen 3.8 27B (free)</option>
        </select>
      </div>

      {/* Selected tender banner */}
      {selectedTender && (
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 truncate text-slate-600">
            <Tag className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span className="text-slate-400">Сонгосон:</span>
            <span className="font-medium text-slate-900 truncate max-w-[260px]">
              {selectedTender.tenderName}
            </span>
          </div>
          <button
            onClick={onClearSelectedTender}
            className="text-[11px] text-slate-500 hover:text-slate-800 underline shrink-0"
          >
            Арилгах
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 text-xs ${
                msg.sender === 'user'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {msg.sender === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>

            <div
              className={`max-w-[85%] rounded-lg p-3 leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-800 border border-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div
                className={`mt-1 text-[10px] text-right font-mono ${
                  msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 p-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
            <span>{locale === 'mn' ? 'Шинжилгээ хийж байна...' : 'Analyzing tender data...'}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="p-2.5 border-t border-slate-200 bg-slate-50 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5 text-[11px]">
        <button
          onClick={() => handleSend(t.aiPromptQuick1)}
          className="h-7 px-2.5 rounded bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          {t.aiPromptQuick1}
        </button>
        <button
          onClick={() => handleSend(t.aiPromptQuick2)}
          className="h-7 px-2.5 rounded bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          {t.aiPromptQuick2}
        </button>
        <button
          onClick={() => handleSend(t.aiPromptQuick3)}
          className="h-7 px-2.5 rounded bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          {t.aiPromptQuick3}
        </button>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.aiInputPlaceholder}
          disabled={isLoading}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none rounded-md text-xs text-slate-900 placeholder-slate-400"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="h-8 w-8 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
};
