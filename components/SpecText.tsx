import React from 'react';

/** PDF table extraction glues cells together; restore word boundaries where the join is obvious. */
function tidy(s: string): string {
  return s
    .replace(/([а-яөү])([А-ЯӨҮ])/g, '$1 $2')
    .replace(/([а-яөү])([A-Z])(?=[А-ЯӨҮ])/g, '$1 $2 ')
    .replace(/(\d)([А-Яа-яӨөҮү])/g, '$1 $2')
    .replace(/([А-Яа-яӨөҮү])(\d)/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEADER_JUNK = /Д\/д\s*Үзүүлэлтийн\s*нэр\s*Хэмжих\s*нэгж\s*Үзүүлэлт\s*Нөхцөл/gi;

/** Split a raw spec string (cells joined by " | ") into readable rows. */
export function specRows(text: string | undefined | null): string[] {
  if (!text) return [];
  return text
    .replace(HEADER_JUNK, '')
    .split('|')
    .map((part) => tidy(part.replace(/^\s*\d{1,2}(?=\D)/, '')))
    .filter((part) => part.length > 1 && !/^\d+$/.test(part));
}

export const SpecCell: React.FC<{ text?: string | null; max?: number }> = ({ text, max = 8 }) => {
  const rows = specRows(text);
  if (rows.length === 0) return <span className="text-slate-400 dark:text-zinc-500">—</span>;
  if (rows.length === 1) return <span className="break-words">{rows[0]}</span>;
  return (
    <ul className="space-y-1">
      {rows.slice(0, max).map((row, i) => (
        <li key={i} className="flex gap-2 break-words">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-zinc-500" />
          <span>{row}</span>
        </li>
      ))}
      {rows.length > max && <li className="text-slate-400 dark:text-zinc-500">+{rows.length - max}</li>}
    </ul>
  );
};

const EMOJI = /^[^A-Za-z\u0400-\u04FF0-9]+/;

/** Renders the stored scope-of-work summary (blocks with headings, numbered items, bullets). */
export const ScopeText: React.FC<{ text: string }> = ({ text }) => {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-4">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
        const first = lines[0] || '';
        const isHeading = !/^[•\-]/.test(first) && (EMOJI.test(first) || /:$/.test(first));
        const heading = isHeading ? first.replace(EMOJI, '').replace(/:$/, '') : null;
        const body = isHeading ? lines.slice(1) : lines;
        return (
          <section key={bi}>
            {heading && <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">{heading}</h4>}
            <div className="space-y-2">
              {body.map((line, li) => {
                const num = line.match(/^(\d+)\.\s+(.*)$/);
                if (num) {
                  const [name, ...rest] = num[2].split(' — ');
                  return (
                    <div key={li} className="flex gap-2.5">
                      <span className="w-5 shrink-0 text-right tabular-nums text-slate-400 dark:text-zinc-500">{num[1]}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-900 dark:text-zinc-100 break-words">{name}</div>
                        {rest.length > 0 && (
                          <div className="mt-0.5 text-slate-500 dark:text-zinc-400">
                            <SpecCell text={rest.join(' — ')} max={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
                if (/^[•\-]\s+/.test(line)) {
                  return (
                    <div key={li} className="flex gap-2">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-zinc-500" />
                      <span className="break-words">{line.replace(/^[•\-]\s+/, '')}</span>
                    </div>
                  );
                }
                return <p key={li} className="break-words">{line}</p>;
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
