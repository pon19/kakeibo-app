import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: ログインユーザーの取引履歴取得
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証エラー: ログインが必要です' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API GET RECEIPTS ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'データ取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: ログインユーザーの取引データ新規保存
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証エラー: ログインが必要です' },
        { status: 401 }
      );
    }

    const body = await req.json();

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id, // ログインユーザーのIDをセット
        merchant_name: body.merchant_name,
        purchased_at: body.purchased_at,
        total_amount: body.total_amount,
        discount_amount: body.discount_amount || 0,
        tax_type: body.tax_type || 'inclusive',
        tax_amount: body.tax_amount || 0,
        category: body.category,
        items: body.items || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API POST RECEIPT ERROR]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'データ保存に失敗しました' },
      { status: 500 }
    );
  }
}