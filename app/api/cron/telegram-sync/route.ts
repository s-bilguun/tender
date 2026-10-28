import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { classifyIndustry } from '@/lib/taxonomy';
import { fetchTelegramChannelPage, TelegramTenderPost, TELEGRAM_CHANNEL } from '@/lib/telegram-feed';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const UB_OFFSET = '+08:00';

function inferTypeCode(title: string): 'PRODUCT' | 'JOB' | 'SERVICE' {
  const t = title.toLowerCase();
  if (/үйлчилгээ|түрээс|сургалт|зөвлөх|аудит|даатгал|хамгаалалт|цэвэрлэгээ|тээвэрлэлт|хоол\s*үйлдвэрлэл/.test(t)) return 'SERVICE';
  if (/\sажил(\s|$)|ажил$/.test(t)) return 'JOB';
  if (/худалдан\s*авах|нийлүүлэх|материал|тоног\s*төхөөрөмж|хэрэгсэл/.test(t)) return 'PRODUCT';
  if (/засвар|барилга|угсралт|суурилуулах|зураг төсөв|тохижилт|шинэчлэл|өргөтгөл|хашаа барих|зам\s/.test(t)) return 'JOB';
  return 'PRODUCT';
}

function toRow(post: TelegramTenderPost) {
  const typeCode = inferTypeCode(post.title);
  const industry = classifyIndustry(post.title, typeCode, post.buyer || undefined).id;
  // Post time is the real announcement moment; fall back to noon UB on the stated date
  // (midnight would render as the previous day in UTC).
  const publishDate = post.postedAt || (post.announcedDate ? `${post.announcedDate}T12:00:00${UB_OFFSET}` : null);
  return {
    invitation_id: post.invitationId,
    tender_name: post.title,
    budget_entity_name: post.buyer,
    tender_type_code: typeCode,
    tender_type_name: typeCode === 'PRODUCT' ? 'Бараа' : typeCode === 'JOB' ? 'Ажил' : 'Үйлчилгээ',
    publish_date: publishDate,
    receive_date: null,
    is_receiving: 1,
    doc_status_code: 'RECEIVE_TENDER',
    doc_status_name: 'Тендер хүлээн авч байгаа',
    raw_data: {
      source: 'telegram',
      telegramChannel: TELEGRAM_CHANNEL,
      telegramPostId: post.postId,
      telegramPostedAt: post.postedAt,
      sourceUrl: post.sourceUrl,
      industry,
      typeInferred: true,
    },
  };
}

/**
 * Pulls new tender announcements from the public Telegram channel into
 * `tenders`. Existing rows are never overwritten (they may hold richer data).
 *
 * Query params: maxPages (default 8, max 40), sinceDays (default 45): stop
 * paging once posts are older than this or a page brings nothing new.
 * Backfill: ?backfill=1&before=<postId> keeps paging past already-known posts.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const maxPages = Math.min(Math.max(Number(searchParams.get('maxPages')) || 8, 1), 40);
  const sinceDays = Math.min(Math.max(Number(searchParams.get('sinceDays')) || 45, 1), 365);
  const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
  const startedAt = Date.now();

  let before: number | undefined = Number(searchParams.get('before')) || undefined;
  let pages = 0;
  let seen = 0;
  let inserted = 0;
  let repaired = 0;
  const errors: string[] = [];

  while (pages < maxPages && Date.now() - startedAt < 50_000) {
    let page;
    try {
      page = await fetchTelegramChannelPage(before);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      break;
    }
    pages += 1;
    const posts = page.posts;
    seen += posts.length;

    if (posts.length) {
      const ids = Array.from(new Set(posts.map((p) => p.invitationId)));
      const { data: existing, error: lookupError } = await supabaseAdmin
        .from('tenders')
        .select('invitation_id')
        .in('invitation_id', ids);
      if (lookupError) {
        errors.push(`lookup: ${lookupError.message}`);
        break;
      }
      const known = new Set((existing || []).map((r: any) => String(r.invitation_id)));

      // ?repair=1: re-apply the publish time to rows this feed created earlier.
      if (searchParams.get('repair')) {
        for (const post of posts) {
          if (!known.has(post.invitationId) || !post.postedAt) continue;
          const { error: repairError } = await supabaseAdmin
            .from('tenders')
            .update({ publish_date: post.postedAt })
            .eq('invitation_id', post.invitationId)
            .eq('raw_data->>source', 'telegram');
          if (repairError) errors.push(`repair: ${repairError.message}`);
          else repaired += 1;
        }
      }
      const fresh = new Map<string, ReturnType<typeof toRow>>();
      for (const post of posts) {
        if (!known.has(post.invitationId) && !fresh.has(post.invitationId)) fresh.set(post.invitationId, toRow(post));
      }
      if (fresh.size) {
        const { error: insertError } = await supabaseAdmin
          .from('tenders')
          .upsert(Array.from(fresh.values()), { onConflict: 'invitation_id', ignoreDuplicates: true });
        if (insertError) {
          errors.push(`insert: ${insertError.message}`);
          break;
        }
        inserted += fresh.size;
      } else if (!searchParams.get('backfill')) {
        break; // caught up with what we already have
      }

      const oldest = posts.reduce((min, p) => (p.postedAt && Date.parse(p.postedAt) < min ? Date.parse(p.postedAt) : min), Infinity);
      if (oldest < cutoff) break;
    }

    if (!page.oldestPostId || page.oldestPostId === before) break;
    before = page.oldestPostId;
  }

  return NextResponse.json({
    success: errors.length === 0,
    source: `t.me/s/${TELEGRAM_CHANNEL}`,
    pages,
    postsSeen: seen,
    inserted,
    repaired,
    nextBefore: before ?? null,
    errors,
  });
}
