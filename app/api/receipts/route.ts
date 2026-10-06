import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 1. 取引データ一覧の取得 (GET)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('transactions') // transactions テーブルから取得
      .select('*')
      .order('purchased_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Fetch Receipts Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'データ取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 2. 取引データの保存 (POST)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          merchant_name: body.merchant_name,
          purchased_at: body.purchased_at,
          total_amount: body.total_amount,
          category: body.category,
        },
      ])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Save Receipt Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'データの保存に失敗しました' },
      { status: 500 }
    );
  }
}