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

const renderInline = (text: string, isUser: boolean): React.ReactNode => {
  if (!text) return null;

  const regex = /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[^*\n]+?\*|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${match.index}-${token.length}`;

    if (token.startsWith('***') && token.endsWith('***') && token.length >= 6) {
      parts.push(
        <strong key={key} className={`font-bold italic ${isUser ? 'text-white' : 'text-slate-900'}`}>
          {token.slice(3, -3)}
        </strong>
      );
    } else if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      parts.push(
        <strong key={key} className={`font-semibold ${isUser ? 'text-white' : 'text-slate-900'}`}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      parts.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      parts.push(
        <code
          key={key}
          className={`px-1 py-0.5 rounded text-[11px] font-mono ${
            isUser ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-800'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline hover:opacity-80 font-medium ${isUser ? 'text-white' : 'text-blue-600'}`}
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        parts.push(token);
      }
    } else {
      parts.push(token);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
};

export const FormattedChatMessage: React.FC<{ text: string; isUser: boolean }> = ({ text, isUser }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = () => {
    if (!currentList) return;
    const ListTag = currentList.type;
    const items = currentList.items;
    elements.push(
      <ListTag
        key={`list-${elements.length}`}
        className={`my-1.5 space-y-1 ${
          currentList.type === 'ul' ? 'list-disc list-inside pl-1' : 'list-decimal list-inside pl-1'
        }`}
      >
        {items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderInline(item, isUser)}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block toggle
    if (trimmed.startsWith('```')) {
      flushList();
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="p-2.5 my-2 bg-slate-900 text-slate-100 rounded-md font-mono text-[11px] overflow-x-auto"
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Horizontal divider (e.g. ***, ---, ___)
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      flushList();
      elements.push(
        <hr
          key={`hr-${i}`}
          className={`my-2 border-t ${isUser ? 'border-blue-400' : 'border-slate-200'}`}
        />
      );
      continue;
    }

    // Markdown Headers: #, ##, ###, ####
    const hMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      flushList();
      const level = hMatch[1].length;
      const hText = hMatch[2];
      const hClasses =
        level === 1
          ? 'text-sm font-bold mt-2.5 mb-1'
          : level === 2
          ? 'text-xs font-bold mt-2 mb-1'
          : 'text-xs font-semibold mt-1.5 mb-0.5';

      elements.push(
        <div key={`h-${i}`} className={`${hClasses} ${isUser ? 'text-white' : 'text-slate-900'}`}>
          {renderInline(hText, isUser)}
        </div>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className={`border-l-2 pl-2.5 my-1 italic ${
            isUser ? 'border-blue-300 text-blue-100' : 'border-blue-500 text-slate-600'
          }`}
        >
          {renderInline(trimmed.slice(2), isUser)}
        </blockquote>
      );
      continue;
    }

    // Bullet lists: - or * or • followed by space
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered lists: 1. 2.
    const numMatch = trimmed.match(/^\d+[\.\)]\s+(.+)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[1]);
      continue;
    }

    // Empty line
    if (trimmed === '') {
      flushList();
      elements.push(<div key={`empty-${i}`} className="h-1.5" />);
      continue;
    }

    // Normal paragraph line
    flushList();
    elements.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {renderInline(trimmed, isUser)}
      </p>
    );
  }

  flushList();

  if (inCodeBlock && codeBlockLines.length > 0) {
    elements.push(
      <pre
        key="code-unclosed"
        className="p-2.5 my-2 bg-slate-900 text-slate-100 rounded-md font-mono text-[11px] overflow-x-auto"
      >
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5 text-xs">{elements}</div>;
};

export const AIChatDrawer: React.FC<AIChatDrawerProps> = ({
  isOpen,
  onClose,
  selectedTender,
  onClearSelectedTender,
  locale,
}) => {
  const t = getTranslation(locale);
  const [selectedModel, setSelectedModel] = useState<string>('google/gemma-4-26b-a4b-it:free');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: locale === 'mn'
        ? `Сайн байна уу! Би тендерийн цахим системийн бүх зарлал, төсөв, шаардлагыг шинжилж туслах таны AI зөвлөх байна.\n\nТа сонирхсон тендерийнхээ нэр, салбар, төсвийн талаар чөлөөтэй асуугаарай. Жишээ нь:\n• *"Хамгийн их төсөвтэй тендерүүд юу байна?"*\n• *"Эрдэнэт үйлдвэрийн тендерүүд"*\n• *"Одоо зарлагдсан эмнэлгийн тоног төхөөрөмжийн тендер"*`
        : `Hello! I'm your AI tender consultant, ready to help you analyze procurement bids, budgets, and requirements.\n\nFeel free to ask about any tender, agency, or sector!`,
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
          <option value="google/gemma-4-26b-a4b-it:free">🚀 Google Gemma 4 26B (free - Хурдан, Монгол хэл)</option>
          <option value="nvidia/nemotron-3.5-lightning:free">⚡ NVIDIA Nemotron 3.5 Lightning (free)</option>
          <option value="openrouter/free">🌐 Автомат сонголт (openrouter/free)</option>
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
              <FormattedChatMessage text={msg.text} isUser={msg.sender === 'user'} />
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
