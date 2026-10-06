import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 削除処理 (DELETE)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '削除に失敗しました' },
      { status: 500 }
    );
  }
}

// 編集更新処理 (PUT)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const { data, error } = await supabase
      .from('transactions')
      .update({
        merchant_name: body.merchant_name,
        purchased_at: body.purchased_at,
        total_amount: body.total_amount,
        category: body.category,
        items: body.items || [], // itemsも更新対象に含める
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || '更新に失敗しました' },
      { status: 500 }
    );
  }
}