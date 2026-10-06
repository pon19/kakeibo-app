import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('purchased_at', { ascending: false });

    if (error) throw error;

    console.log('[DEBUG 5] Fetched Receipts Count:', data?.length);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[ERROR] Fetch Receipts Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'データ取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('[DEBUG 4] Received Payload in /api/receipts POST:', body);
    console.log('[DEBUG 4-1] items field check:', body.items);

    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          merchant_name: body.merchant_name,
          purchased_at: body.purchased_at,
          total_amount: body.total_amount,
          category: body.category,
          items: body.items || [], // items をそのまま格納
        },
      ])
      .select();

    if (error) {
      console.error('[ERROR] Supabase Insert Error:', error);
      throw error;
    }

    console.log('[DEBUG 4-2] Supabase Inserted Data Result:', data);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[ERROR] Save Receipt Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'データの保存に失敗しました' },
      { status: 500 }
    );
  }
}