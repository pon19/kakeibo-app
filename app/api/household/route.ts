import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 現在の所属グループおよびメンバー情報を取得
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }

    // ユーザーの所属しているグループメンバー情報を検索
    const { data: memberData } = await supabase
      .from('household_members')
      .select('household_id, households(id, name, invite_code)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberData) {
      return NextResponse.json({ success: true, household: null });
    }

    // 同一グループのメンバー一覧を取得
    const { data: members } = await supabase
      .from('household_members')
      .select('id, user_id, role, created_at')
      .eq('household_id', memberData.household_id);

    return NextResponse.json({
      success: true,
      household: memberData.households,
      members: members || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: グループ作成 または 招待コードで参加
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }

    const { action, name, invite_code } = await req.json();

    if (action === 'create') {
      // 1. 新しいグループを作成
      const { data: household, error: hError } = await supabase
        .from('households')
        .insert({ name: name || '我が家' })
        .select()
        .single();

      if (hError) throw hError;

      // 2. 作成者を管理者としてメンバー登録
      const { error: mError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'owner',
        });

      if (mError) throw mError;

      return NextResponse.json({ success: true, household });
    }

    if (action === 'join') {
      // 1. 招待コードからグループを検索
      const { data: household, error: findError } = await supabase
        .from('households')
        .select('*')
        .eq('invite_code', invite_code?.trim())
        .single();

      if (findError || !household) {
        return NextResponse.json(
          { success: false, error: '無効な招待コードです' },
          { status: 400 }
        );
      }

      // 2. グループに参加メンバーとして登録
      const { error: joinError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'member',
        });

      if (joinError) {
        if (joinError.code === '23505') {
          return NextResponse.json(
            { success: false, error: 'すでにこのグループに参加しています' },
            { status: 400 }
          );
        }
        throw joinError;
      }

      return NextResponse.json({ success: true, household });
    }

    return NextResponse.json({ success: false, error: '不正なアクションです' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}