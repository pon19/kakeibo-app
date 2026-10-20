'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // 新規登録
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
      } else {
        // ログイン
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto flex flex-col justify-center">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-xl font-bold text-center text-slate-800 mb-2">
          レシート家計簿
        </h1>
        <p className="text-xs text-center text-slate-500 mb-6">
          {isSignUp ? '新規アカウント登録' : 'ログインしてご利用ください'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-100 text-rose-800 text-xs rounded-lg border border-rose-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 text-xs rounded-lg border border-emerald-200">
            ✅ {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">パスワード</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="6文字以上"
              className="w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition text-sm flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block"></span>
            )}
            <span>{isSignUp ? 'アカウントを作成する' : 'ログイン'}</span>
          </button>
        </form>

        <div className="mt-6 pt-4 border-t text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setMessage(null);
            }}
            className="text-xs text-indigo-600 font-medium hover:underline"
          >
            {isSignUp ? 'すでにアカウントをお持ちの方（ログイン）' : '新規アカウント作成はこちら'}
          </button>
        </div>
      </div>
    </main>
  );
}