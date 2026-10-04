'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    merchant_name?: string;
    purchased_at?: string;
    total_amount?: number;
    category?: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ファイル選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
      setSaveSuccess(false);
    }
  };

  // Gemini API でレシート解析
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setSaveSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        alert('レシートの解析に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Supabase へ保存
  const handleSave = async () => {
    if (!result) return;
    setLoading(true);

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setResult(null);
        setFile(null);
      } else {
        alert('保存に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto pb-20">
      <h1 className="text-2xl font-bold text-center text-slate-800 my-4">
        レシート家計簿
      </h1>

      {/* ナビゲーションボタン */}
      <div className="flex gap-2 mb-6">
        <Link
          href="/dashboard"
          className="flex-1 py-2 px-3 bg-indigo-600 text-white rounded-lg font-medium text-center hover:bg-indigo-700 transition shadow-sm text-sm"
        >
          📊 ダッシュボードを見る
        </Link>
      </div>

      {/* 保存完了メッセージ */}
      {saveSuccess && (
        <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 rounded-lg text-sm text-center font-medium border border-emerald-200 flex flex-col gap-2">
          <span>✅ 取引データを保存しました！</span>
          <Link href="/dashboard" className="underline text-emerald-900 font-bold">
            ダッシュボードで確認する →
          </Link>
        </div>
      )}

      {/* レシート画像選択・撮影エリア */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-3">
          レシートを撮影・選択
        </h2>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition mb-4 cursor-pointer"
        />

        {file && (
          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition"
          >
            {loading ? '解析中...' : 'レシートを解析する'}
          </button>
        )}
      </div>

      {/* 解析結果の確認・編集フォーム */}
      {result && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-slate-700 border-b pb-2">
            解析結果の確認
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              店舗名
            </label>
            <input
              type="text"
              value={result.merchant_name || ''}
              onChange={(e) =>
                setResult({ ...result, merchant_name: e.target.value })
              }
              className="w-full p-2 border rounded-lg text-slate-800 text-sm focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              購入日時
            </label>
            <input
              type="date"
              value={result.purchased_at?.slice(0, 10) || ''}
              onChange={(e) =>
                setResult({ ...result, purchased_at: e.target.value })
              }
              className="w-full p-2 border rounded-lg text-slate-800 text-sm focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              合計金額（円）
            </label>
            <input
              type="number"
              value={result.total_amount || ''}
              onChange={(e) =>
                setResult({
                  ...result,
                  total_amount: Number(e.target.value),
                })
              }
              className="w-full p-2 border rounded-lg text-slate-800 text-sm focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              カテゴリ
            </label>
            <input
              type="text"
              value={result.category || ''}
              onChange={(e) =>
                setResult({ ...result, category: e.target.value })
              }
              className="w-full p-2 border rounded-lg text-slate-800 text-sm focus:outline-indigo-500"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full mt-2 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 disabled:bg-slate-300 transition"
          >
            {loading ? '保存中...' : '家計簿に保存する'}
          </button>
        </div>
      )}
    </main>
  );
}