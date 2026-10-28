/**
 * Reader for the public Telegram channel @tendergovmn, which announces every
 * tender invitation published on the e-procurement system (tender.gov.mn).
 *
 * tender.gov.mn itself now sits behind a Cloudflare human check for all
 * automated requests, so this public web preview (t.me/s/<channel>) is the
 * source for new listings. It carries title, buyer, publish date and the
 * invitation ID; budget, deadline and documents stay on tender.gov.mn.
 */

export const TELEGRAM_CHANNEL = 'tendergovmn';

export interface TelegramTenderPost {
  postId: number;
  postedAt: string | null; // ISO timestamp of the Telegram post
  invitationId: string;
  title: string;
  buyer: string | null;
  announcedDate: string | null; // YYYY-MM-DD as written in the post
  sourceUrl: string;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#039;': "'", '&nbsp;': ' ',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|nbsp|#39|#039);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function htmlToLines(html: string): string[] {
  const text = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<i class="emoji"[^>]*>[\s\S]*?<\/i>/gi, '')
      .replace(/<[^>]+>/g, ''),
  );
  return text.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Parse one t.me/s/<channel> page into tender posts (others are skipped). */
export function parseTelegramChannelPage(html: string): TelegramTenderPost[] {
  const posts: TelegramTenderPost[] = [];
  const blocks = html.split(/<div class="tgme_widget_message_wrap/).slice(1);
  for (const block of blocks) {
    const postMatch = block.match(/data-post="[^"/]+\/(\d+)"/);
    const textMatch = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const linkMatch = block.match(/https?:\/\/(?:www\.)?tender\.gov\.mn\/(?:mn|en)\/invitation\/detail\/(\d{6,24})/);
    if (!postMatch || !textMatch || !linkMatch) continue;

    const lines = htmlToLines(textMatch[1]);
    const buyerLine = lines.find((l) => /^Захиалагч\s*:/i.test(l));
    const dateLine = lines.find((l) => /огноо\s*:/i.test(l));
    const title = lines.find((l) => !/^(Захиалагч|Зарласан огноо|Урилга харах)/i.test(l) && !/огноо\s*:/i.test(l));
    if (!title) continue;

    const timeMatch = block.match(/<time datetime="([^"]+)"/);
    const dateMatch = dateLine?.match(/(\d{4}-\d{2}-\d{2})/);
    posts.push({
      postId: Number(postMatch[1]),
      postedAt: timeMatch ? new Date(timeMatch[1]).toISOString() : null,
      invitationId: linkMatch[1],
      title,
      buyer: buyerLine ? buyerLine.replace(/^Захиалагч\s*:\s*/i, '').trim() || null : null,
      announcedDate: dateMatch ? dateMatch[1] : null,
      sourceUrl: `https://www.tender.gov.mn/mn/invitation/detail/${linkMatch[1]}`,
    });
  }
  return posts;
}

/** Fetch one page of the channel (newest first when `before` is omitted). */
export async function fetchTelegramChannelPage(before?: number): Promise<{ posts: TelegramTenderPost[]; oldestPostId: number | null }> {
  const url = `https://t.me/s/${TELEGRAM_CHANNEL}${before ? `?before=${before}` : ''}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'TenderHub/1.0 (+https://tender-mu-five.vercel.app)', Accept: 'text/html' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Telegram channel page returned HTTP ${response.status}`);
  const html = await response.text();
  const ids = Array.from(html.matchAll(/data-post="[^"/]+\/(\d+)"/g)).map((m) => Number(m[1]));
  return { posts: parseTelegramChannelPage(html), oldestPostId: ids.length ? Math.min(...ids) : null };
}
