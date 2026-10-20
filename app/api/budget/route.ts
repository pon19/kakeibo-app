import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 指定月の予算を取得
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // ユーザーの所属グループを取得
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let query = supabase.from('budgets').select('*').eq('month', month);

    if (member?.household_id) {
      query = query.eq('household_id', member.household_id);
    } else {
      query = query.eq('user_id', user.id);
    }

    const { data } = await query.maybeSingle();

    return NextResponse.json({ success: true, budget: data ? data.amount : 0 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 予算の設定・更新
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }

    const { month, amount } = await req.json();

    if (!month || amount === undefined || amount < 0) {
      return NextResponse.json({ success: false, error: '正しい予算金額を入力してください' }, { status: 400 });
    }

    // ユーザーの所属グループを取得
    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const budgetData = {
      user_id: user.id,
      household_id: member?.household_id || null,
      month,
      amount: Number(amount),
    };

    // upsert (挿入または更新)
    const { data, error } = await supabase
      .from('budgets')
      .upsert(budgetData, {
        onConflict: member?.household_id ? 'household_id,month' : 'user_id,month',
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, budget: data.amount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}