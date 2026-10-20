'use client';

import { useState, useEffect } from 'react';

interface Household {
  id: string;
  name: string;
  invite_code: string;
}

export default function HouseholdPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHousehold();
  }, []);

  const fetchHousehold = async () => {
    try {
      const res = await fetch('/api/household');
      const data = await res.json();
      if (data.success) {
        setHousehold(data.household);
      }
    } catch (err) {
      console.error(err);
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
        setHousehold(data.household);
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
        body: JSON.stringify({ action: 'join', invite_code: inviteCodeInput }),
      });
      const data = await res.json();
      if (data.success) {
        setHousehold(data.household);
        setMessage('グループに参加しました！');
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
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">参加中のグループ</span>
            <h2 className="text-xl font-bold text-slate-800 mt-2">{household.name}</h2>
          </div>

          <div className="pt-3 border-t">
            <label className="block text-xs font-medium text-slate-500 mb-1">家族を招待するコード</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                readOnly
                value={household.invite_code}
                className="w-full p-2.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-center font-mono font-bold text-base"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(household.invite_code);
                  alert('招待コードをコピーしました');
                }}
                className="py-2.5 px-4 bg-indigo-600 text-white text-xs font-medium rounded-xl hover:bg-indigo-700 transition flex-shrink-0"
              >
                コピー
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              このコードを家族に共有し、下の「招待コードで参加」から入力してもらってください。
            </p>
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
                  placeholder="8桁の招待コードを入力"
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
    </main>
  );
}