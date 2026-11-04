import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: 所属グループ・メンバー情報（profilesのnickname取得）
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }

    const { data: memberData } = await supabase
      .from('household_members')
      .select('household_id, role, households(id, name, invite_code)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!memberData) {
      return NextResponse.json({ success: true, household: null });
    }

    // メンバー一覧を取得
    const { data: members, error: mError } = await supabase
      .from('household_members')
      .select('id, user_id, role, created_at')
      .eq('household_id', memberData.household_id);

    if (mError) throw mError;

    // 各メンバーの user_id に紐づく profiles の nickname を一括取得
    const userIds = (members || []).map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('id', userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p.nickname]));

    const formattedMembers = (members || []).map((m) => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      is_me: m.user_id === user.id,
      display_name: profileMap.get(m.user_id) || `ユーザー (${m.user_id.slice(0, 6)})`,
    }));

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

// POST: グループ作成・参加・メンバー強制退会・自分退会・権限移譲
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // グループ作成
    if (action === 'create') {
      const { name } = body;
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, error: 'グループ名を入力してください' }, { status: 400 });
      }

      const invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: household, error: hError } = await supabase
        .from('households')
        .insert({ name: name.trim(), invite_code })
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

    // グループ参加
    if (action === 'join') {
      const { invite_code } = body;

      const { data: householdsList, error: findError } = await supabase
        .rpc('find_household_by_invite_code', { code: invite_code?.trim() });

      const household = householdsList?.[0];

      if (findError || !household) {
        return NextResponse.json(
          { success: false, error: '無効な招待コードです' },
          { status: 400 }
        );
      }

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

    // メンバー強制退会（管理者のみ）
    if (action === 'remove_member') {
      const { target_member_id } = body;

      const { data: myMember } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user.id)
        .single();

      if (!myMember || (myMember.role !== 'owner' && myMember.role !== 'admin')) {
        return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('household_members')
        .delete()
        .eq('id', target_member_id)
        .eq('household_id', myMember.household_id);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true });
    }

    // 自分のグループ退会
    if (action === 'leave') {
      const { data: myMember } = await supabase
        .from('household_members')
        .select('id, household_id, role')
        .eq('user_id', user.id)
        .single();

      if (!myMember) {
        return NextResponse.json({ success: false, error: 'グループに参加していません' }, { status: 400 });
      }

      if (myMember.role === 'owner') {
        const { data: members } = await supabase
          .from('household_members')
          .select('id')
          .eq('household_id', myMember.household_id);

        if (members && members.length > 1) {
          return NextResponse.json(
            { success: false, error: '管理者があなただけの状態で退会することはできません。事前に他のメンバーへ管理者権限を移譲してください。' },
            { status: 400 }
          );
        }
      }

      const { error: deleteError } = await supabase
        .from('household_members')
        .delete()
        .eq('id', myMember.id);

      if (deleteError) throw deleteError;

      return NextResponse.json({ success: true });
    }

    // 管理者権限の移譲
    if (action === 'transfer_ownership') {
      const { target_member_id } = body;

      const { data: myMember } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user.id)
        .single();

      if (!myMember || myMember.role !== 'owner') {
        return NextResponse.json({ success: false, error: '管理者のみ権限移譲を行えます' }, { status: 403 });
      }

      const { error: transferError } = await supabase
        .from('household_members')
        .update({ role: 'owner' })
        .eq('id', target_member_id)
        .eq('household_id', myMember.household_id);

      if (transferError) throw transferError;

      const { error: demoteError } = await supabase
        .from('household_members')
        .update({ role: 'member' })
        .eq('user_id', user.id)
        .eq('household_id', myMember.household_id);

      if (demoteError) throw demoteError;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: '無効な操作です' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}