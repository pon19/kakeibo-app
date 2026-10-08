'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  tax_rate: number;
}

interface ParsedReceipt {
  merchant_name?: string;
  purchased_at?: string;
  total_amount?: number;
  discount_amount?: number;
  category?: string;
  tax_type?: 'inclusive' | 'exclusive';
  tax_amount?: number;
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

  useEffect(() => {
    if (!result || !result.items) return;

    if (result.tax_type === 'exclusive') {
      let calculatedTax = 0;
      let itemsSubtotal = 0;

      result.items.forEach((item) => {
        const itemTotal = (item.price || 0) * (item.quantity || 1);
        itemsSubtotal += itemTotal;
        calculatedTax += Math.floor(itemTotal * ((item.tax_rate || 10) / 100));
      });

      const discount = result.discount_amount || 0;
      const subtotalAfterDiscount = Math.max(0, itemsSubtotal - discount);

      setResult((prev) =>
        prev
          ? {
              ...prev,
              tax_amount: calculatedTax,
              total_amount: subtotalAfterDiscount + calculatedTax,
            }
          : null
      );
    }
  }, [result?.tax_type, result?.discount_amount, JSON.stringify(result?.items)]);

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

    const payload = {
      merchant_name: result.merchant_name,
      purchased_at: result.purchased_at,
      total_amount: result.total_amount,
      discount_amount: result.discount_amount || 0,
      category: result.category,
      tax_type: result.tax_type || 'inclusive',
      tax_amount: result.tax_amount || 0,
      items: result.items || [],
    };

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
    if (!result || !result.items) return;
    const updatedItems = [...result.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setResult({ ...result, items: updatedItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!result || !result.items) return;
    const updatedItems = result.items.filter((_, i) => i !== index);
    setResult({ ...result, items: updatedItems });
  };

  const handleAddItem = () => {
    if (!result) return;
    const currentItems = result.items || [];
    setResult({
      ...result,
      items: [...currentItems, { name: '', price: 0, quantity: 1, tax_rate: 8 }],
    });
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto pb-20">
      <h1 className="text-2xl font-bold text-center text-slate-800 my-4">
        レシート家計簿
      </h1>

      <div className="flex gap-2 mb-6">
        <Link className="flex-1 py-2 px-3 bg-indigo-600 text-white rounded-lg font-medium text-center hover:bg-indigo-700 transition shadow-sm text-sm" href="/dashboard">
          📊 ダッシュボードを見る
        </Link>
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 bg-emerald-100 text-emerald-800 rounded-lg text-sm text-center font-medium border border-emerald-200 flex flex-col gap-2">
          <span>✅ 取引データを保存しました！</span>
          <Link className="underline text-emerald-900 font-bold" href="/dashboard">
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
            <span className="text-xl">🖼</span>
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
            解析結果の確認・修正
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">店舗名</label>
            <input
              type="text"
              value={result.merchant_name || ''}
              onChange={(e) => setResult({ ...result, merchant_name: e.target.value })}
              className="w-full p-2 border rounded-lg text-slate-800 text-sm focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">購入日時</label>
            <input
              type="date"
              value={result.purchased_at?.slice(0, 10) || ''}
              onChange={(e) => setResult({ ...result, purchased_at: e.target.value })}
              className="w-full p-2 border rounded-lg text-slate-800 text-sm focus:outline-indigo-500"
            />
          </div>

          {/* 税区分 チェック切替領域 */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">計算モード</span>
              <div className="flex items-center gap-3 text-xs font-medium">
                <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                  <input
                    type="radio"
                    name="tax_type"
                    value="inclusive"
                    checked={result.tax_type === 'inclusive'}
                    onChange={() => setResult({ ...result, tax_type: 'inclusive' })}
                    className="accent-indigo-600"
                  />
                  <span className="text-slate-800 font-semibold">内税（税込）</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-slate-200 shadow-sm">
                  <input
                    type="radio"
                    name="tax_type"
                    value="exclusive"
                    checked={result.tax_type === 'exclusive'}
                    onChange={() => setResult({ ...result, tax_type: 'exclusive' })}
                    className="accent-indigo-600"
                  />
                  <span className="text-slate-800 font-semibold">外税（税別）</span>
                </label>
              </div>
            </div>

            {/* モード別の説明表示 */}
            {result.tax_type === 'inclusive' ? (
              <div className="text-xs text-slate-500 bg-white p-2 rounded border border-slate-100">
                📝 表示されている合計金額がそのまま支払額（税込）になります。
              </div>
            ) : (
              <div className="text-xs text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-100 font-medium">
                💡 各品目の金額（税別）と税率（8%/10%）、値引き額から、消費税と合計金額を自動計算します。
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">値引き額（円）</label>
              <input
                type="number"
                value={result.discount_amount ?? 0}
                onChange={(e) => setResult({ ...result, discount_amount: Number(e.target.value) })}
                className="w-full p-2 border rounded-lg text-sm text-red-600 font-medium bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">消費税額（円）</label>
              <input
                type="number"
                value={result.tax_amount ?? 0}
                readOnly={result.tax_type === 'exclusive'}
                onChange={(e) => setResult({ ...result, tax_amount: Number(e.target.value) })}
                className={`w-full p-2 border rounded-lg text-sm ${
                  result.tax_type === 'exclusive' ? 'bg-slate-100 text-slate-600' : 'bg-white text-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">合計金額（円）</label>
              <input
                type="number"
                value={result.total_amount || ''}
                readOnly={result.tax_type === 'exclusive'}
                onChange={(e) => setResult({ ...result, total_amount: Number(e.target.value) })}
                className={`w-full p-2 border rounded-lg text-sm font-bold ${
                  result.tax_type === 'exclusive' ? 'bg-slate-100 text-slate-600' : 'bg-white text-slate-800'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">カテゴリ</label>
            <input
              type="text"
              value={result.category || ''}
              onChange={(e) => setResult({ ...result, category: e.target.value })}
              className="w-full p-2 border rounded-lg text-slate-800 text-sm focus:outline-indigo-500"
            />
          </div>

          {/* 明細（税率選択付き） */}
          <div className="pt-2 border-t mt-2">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-700">購入品目（明細）</label>
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
                      className="flex-1 p-1.5 border rounded text-xs text-slate-800 bg-white"
                    />
                    <input
                      type="number"
                      placeholder="価格"
                      value={item.price}
                      onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))}
                      className="w-16 p-1.5 border rounded text-xs text-slate-800 bg-white"
                    />
                    <select
                      value={item.tax_rate || 8}
                      onChange={(e) => handleItemChange(idx, 'tax_rate', Number(e.target.value))}
                      className="p-1.5 border rounded text-xs text-slate-800 bg-white font-medium"
                    >
                      <option value={8}>8%</option>
                      <option value={10}>10%</option>
                    </select>
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