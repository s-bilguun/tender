import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://tender-mu-five.vercel.app';

export const revalidate = 3600;

/** Home page plus the most recently published tenders (Google reads up to 50k URLs). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: 'hourly', priority: 1 },
  ];
  try {
    const { data } = await supabase
      .from('tenders')
      .select('invitation_id, publish_date, updated_at')
      .order('publish_date', { ascending: false, nullsFirst: false })
      .limit(2000);
    for (const row of data || []) {
      entries.push({
        url: `${SITE}/tender/${row.invitation_id}`,
        lastModified: row.updated_at || row.publish_date || undefined,
        changeFrequency: 'daily',
        priority: 0.6,
      });
    }
  } catch {
    // Sitemap still lists the home page when the database is unreachable.
  }
  return entries;
}
