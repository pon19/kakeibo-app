import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 削除処理 (DELETE)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('transactions').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// 更新処理 (PUT)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const { error } = await supabase
      .from('transactions')
      .update({
        merchant_name: body.merchant_name,
        purchased_at: body.purchased_at,
        total_amount: body.total_amount,
        category: body.category,
      })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}