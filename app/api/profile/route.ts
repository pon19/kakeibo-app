import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({ success: true, nickname: profile?.nickname || null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: '認証エラー' }, { status: 401 });

    const { nickname } = await req.json();
    if (!nickname || !nickname.trim()) {
      return NextResponse.json({ success: false, error: '表示名を入力してください' }, { status: 400 });
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, nickname: nickname.trim(), updated_at: new Date().toISOString() });

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}