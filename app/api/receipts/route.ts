import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 取引履歴取得（所属グループがあればグループ共有データを含めて取得）
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }

    // ユーザーの所属グループを取得
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let query = supabase.from('transactions').select('*');

    if (member?.household_id) {
      // グループ所属時は、そのグループのデータ または 個人のデータを取得
      query = query.or(`household_id.eq.${member.household_id},user_id.eq.${user.id}`);
    } else {
      // 未所属時は個人のデータのみ取得
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query.order('purchased_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 取引データ新規保存（グループ所属時は household_id も自動設定）
// app/api/receipts/route.ts 内の POST 部分
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const body = await req.json();

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        household_id: member?.household_id || null,
        type: body.type || 'expense', // ← type (expense / income) を追加
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}