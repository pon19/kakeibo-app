'use client';

import { useState, useEffect } from 'react';

export default function ProfileCheckModal() {
  const [nickname, setNickname] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.success && !data.nickname) {
        setNeedsSetup(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nickname.trim()) {
      setError('表示名を入力してください');
      return;
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();

      if (data.success) {
        setNeedsSetup(false);
        window.location.reload();
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading || !needsSetup) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
        <div className="text-center">
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
            必須設定
          </span>
          <h2 className="text-lg font-bold text-slate-800 mt-2">表示名を入力してください</h2>
          <p className="text-xs text-slate-500 mt-1">
            家族共有などで他のメンバーに表示される名前を設定してください。
          </p>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-100 text-rose-800 text-xs rounded-xl border border-rose-200">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">あなたの表示名</label>
            <input
              type="text"
              required
              placeholder="例: お父さん、太郎 など"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-3 border border-slate-200 bg-white text-slate-800 rounded-xl text-sm focus:outline-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
          >
            設定を完了する
          </button>
        </form>
      </div>
    </div>
  );
}