import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('transactions') // ← receipts から transactions に修正
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