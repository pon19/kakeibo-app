'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

interface ParsedReceipt {
  merchant_name?: string;
  purchased_at?: string;
  total_amount?: number;
  category?: string;
  items?: ReceiptItem[];
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedReceipt | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
      setSaveSuccess(false);
    }
  };

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

  const handleSave = async () => {
    if (!result) return;
    setLoading(true);

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setResult(null);
        setFile(null);
        setPreviewUrl(null);
      } else {
        alert('保存に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 明細項目の更新処理
  const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
    if (!result || !result.items) return;
    const updatedItems = [...result.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setResult({ ...result, items: updatedItems });
  };

  // 明細行の削除
  const handleRemoveItem = (index: number) => {
    if (!result || !result.items) return;
    const updatedItems = result.items.filter((_, i) => i !== index);
    setResult({ ...result, items: updatedItems });
  };

  // 明細行の追加
  const handleAddItem = () => {
    if (!result) return;
    const currentItems = result.items || [];
    setResult({
      ...result,
      items: [...currentItems, { name: '', price: 0, quantity: 1 }],
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto pb-20">
      <h1 className="text-2xl font-bold text-center text-slate-800 my-4">
        レシート家計簿
      </h1>

      <div className="flex gap-2 mb-6">
        <Link
          href="/dashboard"
          className="flex-1 py-2 px-3 bg-indigo-600 text-white rounded-lg font-medium text-center hover:bg-indigo-700 transition shadow-sm text-sm"
        >
          📊 ダッシュボードを見る
        </Link>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 rounded-lg text-sm text-center font-medium border border-emerald-200 flex flex-col gap-2">
          <span>✅ 取引データを保存しました！</span>
          <Link href="/dashboard" className="underline text-emerald-900 font-bold">
            ダッシュボードで確認する →
          </Link>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-3">
          レシートを撮影・選択
        </h2>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={cameraInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          accept="image/*"
          ref={libraryInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="py-3 px-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl font-medium text-sm flex flex-col items-center justify-center gap-1 hover:bg-indigo-100 transition"
          >
            <span className="text-xl">📷</span>
            <span>カメラで撮影</span>
          </button>
          <button
            type="button"
            onClick={() => libraryInputRef.current?.click()}
            className="py-3 px-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium text-sm flex flex-col items-center justify-center gap-1 hover:bg-slate-100 transition"
          >
            <span className="text-xl">🖼️️</span>
            <span>アルバムから選択</span>
          </button>
        </div>

        {previewUrl && (
          <div className="mb-4 flex flex-col items-center">
            <img
              src={previewUrl}
              alt="選択したレシート"
              className="max-h-48 rounded-lg object-contain border border-slate-200"
            />
          </div>
        )}

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

          {/* 購入明細リスト表示・編集 */}
          <div className="pt-2 border-t mt-2">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-700">
                購入品目（明細）
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-1 rounded hover:bg-indigo-100"
              >
                ＋ 品目追加
              </button>
            </div>

            {result.items && result.items.length > 0 ? (
              <div className="flex flex-col gap-2">
                {result.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <input
                      type="text"
                      placeholder="商品名"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                      className="flex-1 p-1.5 border rounded text-xs text-slate-800"
                    />
                    <input
                      type="number"
                      placeholder="価格"
                      value={item.price}
                      onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))}
                      className="w-20 p-1.5 border rounded text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-red-500 hover:text-red-700 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">明細データはありません</p>
            )}
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