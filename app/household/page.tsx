'use client';

import { useState, useEffect } from 'react';

interface Household {
  id: string;
  name: string;
  invite_code: string;
}

interface Member {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  is_me: boolean;
  email?: string;
}

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // モーダル制御用のステート
  const [confirmModal, setConfirmModal] = useState<{
    type: 'remove' | 'leave' | 'transfer';
    targetId?: string;
    targetName?: string;
  } | null>(null);
  const [transferTargetId, setTransferTargetId] = useState<string>('');

  useEffect(() => {
    fetchHousehold();
  }, []);

  const fetchHousehold = async () => {
    try {
      const res = await fetch('/api/household');
      const data = await res.json();
      console.log('📥 /api/household GET response:', data);
      if (data.success) {
        setHousehold(data.household || null);
        setMyRole(data.my_role || null);
        setMembers(data.members || []);
      } else {
        setError(data.error || '情報の取得に失敗しました');
      }
    } catch (err: any) {
      console.error(err);
      setError('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name: groupName }),
      });
      const data = await res.json();
      if (data.success) {
        fetchHousehold();
        setMessage('グループを作成しました！');
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', invite_code: inviteCodeInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        fetchHousehold();
        setMessage('グループに参加しました！');
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // メンバーの強制退会実行
  const executeRemoveMember = async (targetMemberId: string) => {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_member', target_member_id: targetMemberId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('メンバーを退会させました');
        setConfirmModal(null);
        fetchHousehold();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 自分のグループ退会実行
  const executeLeave = async () => {
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      });
      const data = await res.json();
      if (data.success) {
        setHousehold(null);
        setMembers([]);
        setConfirmModal(null);
        setMessage('グループを退会しました');
      } else {
        setError(data.error);
        setConfirmModal(null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 権限移譲の実行
  const executeTransfer = async () => {
    if (!transferTargetId) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/household', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'transfer_ownership', target_member_id: transferTargetId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('管理者権限を移譲しました。続けて退会処理を行えます。');
        setConfirmModal(null);
        fetchHousehold();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto pb-24">
      {/* 画面ヘッダー */}
      <header className="my-4 text-center">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          家族共有
        </h1>
        <p className="text-xs text-slate-400 mt-1">家計簿データの共有・招待管理</p>
      </header>

      {error && (
        <div className="mb-4 p-3 bg-rose-100 text-rose-800 text-xs rounded-xl border border-rose-200">
          ⚠️ {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 text-xs rounded-xl border border-emerald-200">
          ✅ {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">読み込み中...</div>
      ) : household ? (
        <div className="space-y-4">
          {/* グループ基本情報 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {myRole === 'owner' || myRole === 'admin' ? '管理者グループ' : '参加中グループ'}
              </span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">{household.name}</h2>
            </div>

            <div className="pt-3 border-t">
              <label className="block text-xs font-medium text-slate-500 mb-1">家族を招待するコード</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  value={household.invite_code || ''}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-center font-mono font-bold text-base"
                />
                <button
                  onClick={() => {
                    if (household.invite_code) {
                      navigator.clipboard.writeText(household.invite_code);
                      alert('招待コードをコピーしました');
                    }
                  }}
                  className="py-2.5 px-4 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition flex-shrink-0"
                >
                  コピー
                </button>
              </div>
            </div>
          </div>

          {/* 所属メンバー一覧 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800">所属メンバー ({members.length}人)</h3>
            <div className="space-y-2">
              {/* 所属メンバー一覧内の表示部分 */}
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <p className="font-semibold text-slate-700">
                    {m.display_name} {m.is_me && <span className="text-indigo-600 font-bold">(あなた)</span>}
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      m.role === 'owner' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {m.role === 'owner' ? '管理者' : 'メンバー'}
                    </span>
                  </p>
                </div>
                {/* 管理者かつ自分以外の場合、強制退会ボタンを表示 */}
                {(myRole === 'owner' || myRole === 'admin') && !m.is_me && (
                  <button
                    onClick={() => setConfirmModal({ type: 'remove', targetId: m.id, targetName: m.display_name })}
                    className="px-2.5 py-1 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-100 transition font-medium"
                  >
                    退会させる
                  </button>
                )}
              </div>
            ))}
            </div>
          </div>

          {/* 自分のグループ退会ボタン */}
          <div className="pt-2">
            <button
              onClick={() => setConfirmModal({ type: 'leave' })}
              className="w-full py-3 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition"
            >
              グループを退会する
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* グループ新規作成 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-3">新しいグループを作成</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">グループ名</label>
                <input
                  type="text"
                  required
                  placeholder="例: 我が家の家計簿"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-white text-slate-800 rounded-xl text-sm focus:outline-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition"
              >
                グループを作成する
              </button>
            </form>
          </div>

          {/* 招待コードで参加 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-3">招待コードでグループに参加</h2>
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">招待コード</label>
                <input
                  type="text"
                  required
                  placeholder="招待コードを入力"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-white text-slate-800 rounded-xl text-sm uppercase font-mono focus:outline-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 text-white font-medium text-sm rounded-xl hover:bg-emerald-700 transition"
              >
                グループに参加する
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- 確認ポップアップ（モーダル） --- */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-xl">
            {confirmModal.type === 'remove' && (
              <>
                <h3 className="text-base font-bold text-slate-800">メンバーの強制退会</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  このメンバーをグループから強制退会させてもよろしいですか？（この操作は元に戻せません）
                </p>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => confirmModal.targetId && executeRemoveMember(confirmModal.targetId)}
                    className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
                  >
                    退会させる
                  </button>
                </div>
              </>
            )}

            {confirmModal.type === 'leave' && (
              <>
                <h3 className="text-base font-bold text-slate-800">グループの退会確認</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  本当にこのグループから退会しますか？押し間違いによる意図しない退会にご注意ください。
                  {myRole === 'owner' && (
                    <span className="block mt-2 text-amber-600 font-bold">
                      ※あなたが管理者の場合、他に管理者がいない状態で退会するには事前に権限移譲が必要です。
                    </span>
                  )}
                </p>
                
                {myRole === 'owner' && members.filter(m => !m.is_me).length > 0 && (
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">退会前に管理者を委譲する相手を選択</label>
                    <select
                      value={transferTargetId}
                      onChange={(e) => setTransferTargetId(e.target.value)}
                      className="w-full p-2 border border-slate-200 text-xs rounded-xl bg-white"
                    >
                      <option value="">メンバーを選択してください</option>
                      {members.filter(m => !m.is_me).map(m => (
                        <option key={m.id} value={m.id}>ユーザー ({m.user_id.slice(0, 8)}...)</option>
                      ))}
                    </select>
                    <button
                      onClick={executeTransfer}
                      disabled={!transferTargetId}
                      className="mt-2 w-full py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 disabled:opacity-50 transition"
                    >
                      管理者権限を移譲する
                    </button>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setConfirmModal(null)}
                    className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={executeLeave}
                    className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
                  >
                    退会する
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}