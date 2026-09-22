import { NextRequest, NextResponse } from 'next/server';
import { getTenderDetailData } from '@/lib/tender-detail';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Invitation ID is required' }, { status: 400 });
    }

    const data = await getTenderDetailData(id);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Тендер олдсонгүй' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
