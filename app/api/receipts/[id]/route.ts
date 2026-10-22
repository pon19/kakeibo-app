import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE: 取引データの削除
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証エラー: ログインが必要です' },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API DELETE ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message || '削除に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT: 取引データの編集更新（is_sharedフラグに対応）
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証エラー: ログインが必要です' },
        { status: 401 }
      );
    }

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
      is_shared: body.is_shared ?? true, // ← 追加: 共有/個人フラグを更新対象に含める
    };

    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API PUT ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新に失敗しました' },
      { status: 500 }
    );
  }
}