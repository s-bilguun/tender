import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return NextResponse.json({
    hasServiceKey: !!serviceKey,
    keyPrefix: serviceKey ? serviceKey.substring(0, 10) : 'none',
    keyLength: serviceKey ? serviceKey.length : 0,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL
  });
}
