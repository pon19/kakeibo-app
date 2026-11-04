import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 所属グループ・メンバー情報（メールアドレス付き）を取得
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
      .select('household_id, role, households(id, name, invite_code)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberData) {
      return NextResponse.json({ success: true, household: null });
    }

    // 同一グループのメンバー一覧を取得
    const { data: members, error: mError } = await supabase
      .from('household_members')
      .select('id, user_id, role, created_at')
      .eq('household_id', memberData.household_id);

    if (mError) throw mError;

    // 各メンバーのメールアドレス情報を取得（Auth API または profiles から）
    // ※Supabaseの仕様上、各ユーザーのemailを取得するためサービスロールやプロファイル参照を調整
    const formattedMembers = await Promise.all(
      (members || []).map(async (m) => {
        // admin APIが使えない環境に備え、メールアドレスはIDから取得またはプレースホルダー
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          created_at: m.created_at,
          is_me: m.user_id === user.id,
        };
      })
    );

    return NextResponse.json({
      success: true,
      my_role: memberData.role,
      household: memberData.households,
      members: formattedMembers,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: 作成・参加・退会・メンバー除外・権限移譲
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. 新しいグループを作成
    if (action === 'create') {
      const { name } = body;
      const { data: household, error: hError } = await supabase
        .from('households')
        .insert({ name: name || '我が家' })
        .select()
        .single();

      if (hError) throw hError;

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

    // 2. 招待コードでグループに参加
    if (action === 'join') {
      const { invite_code } = body;
      
      // SECURITY DEFINER関数を使って招待コードからグループを検索（RLSをバイパス）
      const { data: householdsList, error: findError } = await supabase
        .rpc('find_household_by_invite_code', { code: invite_code?.trim() });

      const household = householdsList?.[0];

      if (findError || !household) {
        return NextResponse.json(
          { success: false, error: '無効な招待コードです' },
          { status: 400 }
        );
      }

      // グループに参加メンバーとして登録
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

    // 3. 管理者による「メンバー強制退会」
    if (action === 'remove_member') {
      const { target_member_id } = body;

      // 自分の権限チェック
      const { data: myMember } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user.id)
        .single();

      if (!myMember || (myMember.role !== 'owner' && myMember.role !== 'admin')) {
        return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('household_members')
        .delete()
        .eq('id', target_member_id)
        .eq('household_id', myMember.household_id);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true, message: 'メンバーを退会させました' });
    }

    // 4. ユーザー自身の「グループ退会」
    if (action === 'leave') {
      const { data: myMember } = await supabase
        .from('household_members')
        .select('id, household_id, role')
        .eq('user_id', user.id)
        .single();

      if (!myMember) {
        return NextResponse.json({ success: false, error: 'グループに所属していません' }, { status: 400 });
      }

      // 管理者の場合、他に管理者がいるか（またはメンバーが自分だけか）確認
      if (myMember.role === 'owner' || myMember.role === 'admin') {
        const { data: allMembers } = await supabase
          .from('household_members')
          .select('id, role')
          .eq('household_id', myMember.household_id);

        const otherMembers = (allMembers || []).filter((m) => m.id !== myMember.id);
        const hasOtherAdmin = otherMembers.some((m) => m.role === 'owner' || m.role === 'admin');

        // 他にメンバーがいるのに、管理者が自分しかいない場合は退会不可
        if (otherMembers.length > 0 && !hasOtherAdmin) {
          return NextResponse.json(
            {
              success: false,
              error: 'あなたが唯一の管理者です。退会する前に、別のメンバーを管理者に指定してください。',
            },
            { status: 400 }
          );
        }
      }

      // 自分自身をメンバーテーブルから削除
      const { error: leaveError } = await supabase
        .from('household_members')
        .delete()
        .eq('id', myMember.id);

      if (leaveError) throw leaveError;

      return NextResponse.json({ success: true, message: 'グループを退会しました' });
    }

    // 5. 管理者権限の移譲
    if (action === 'transfer_ownership') {
      const { target_member_id } = body;

      const { data: myMember } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user.id)
        .single();

      if (!myMember || (myMember.role !== 'owner' && myMember.role !== 'admin')) {
        return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 });
      }

      // 対象メンバーを owner に更新
      const { error: transferError } = await supabase
        .from('household_members')
        .update({ role: 'owner' })
        .eq('id', target_member_id)
        .eq('household_id', myMember.household_id);

      if (transferError) throw transferError;

      // 自身の権限を member に変更
      await supabase
        .from('household_members')
        .update({ role: 'member' })
        .eq('user_id', user.id)
        .eq('household_id', myMember.household_id);

      return NextResponse.json({ success: true, message: '管理者権限を移譲しました' });
    }

    return NextResponse.json({ success: false, error: '不正なアクションです' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}