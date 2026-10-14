import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// service_role キーがあれば優先的に使用し、なければ anon キーを使用
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';
const supabase = createClient(supabaseUrl, supabaseKey);

// 削除処理 (DELETE)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[SUPABASE DELETE ERROR]', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API DELETE ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message || '削除に失敗しました' },
      { status: 500 }
    );
  }
}

// 編集更新処理 (PUT)
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const updateData = {
      merchant_name: body.merchant_name,
      purchased_at: body.purchased_at,
      total_amount: body.total_amount,
      discount_amount: body.discount_amount ?? 0,
      tax_type: body.tax_type ?? 'inclusive',
      tax_amount: body.tax_amount ?? 0,
      category: body.category,
      items: body.items || [],
    };

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('[SUPABASE PUT ERROR]', error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API PUT ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新に失敗しました' },
      { status: 500 }
    );
  }
}