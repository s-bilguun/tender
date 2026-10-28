import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_PLANS = new Set(['VIP Pro', 'Enterprise Concierge']);
const clip = (value: unknown, max: number) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const contact = clip(body?.contact, 200);
  const company = clip(body?.company, 300);
  const rawPlan = clip(body?.plan, 80);
  const plan = ALLOWED_PLANS.has(rawPlan) ? rawPlan : 'VIP Pro';
  const billingCycle = body?.billingCycle === 'monthly' ? 'monthly' : 'annual';
  const locale = ['mn', 'en', 'zh'].includes(body?.locale) ? body.locale : null;

  if (contact.length < 3) {
    return NextResponse.json({ success: false, error: 'Contact is required.' }, { status: 400 });
  }

  if (!supabaseAdmin) {
    console.warn('[leads] SUPABASE_SERVICE_ROLE_KEY missing; lead not persisted:', { plan, contact, company });
    return NextResponse.json({ success: false, error: 'Lead storage is not configured.' }, { status: 503 });
  }

  const { error } = await supabaseAdmin.from('subscription_leads').insert({
    plan,
    billing_cycle: billingCycle,
    contact,
    company: company || null,
    locale,
    user_agent: clip(request.headers.get('user-agent'), 300) || null,
  });

  if (error) {
    console.error('[leads] insert failed:', error);
    return NextResponse.json({ success: false, error: 'Could not save request.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
