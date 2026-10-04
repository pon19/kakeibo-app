'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      await parseReceipt(base64);
    };
    reader.readAsDataURL(file);
  };

  const parseReceipt = async (base64Image: string) => {
    setLoading(true);
    setData(null);
    try {
      const res = await fetch('/api/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      const resData = await res.json();
      if (resData.success) {
        setData(resData.data);
      } else {
        alert('解析エラー: ' + resData.error);
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // Supabaseにデータを保存する処理
  const handleSave = async () => {
    if (!data) return;
    setSaving(true);

    try {
      const { error } = await supabase.from('transactions').insert([
        {
          merchant_name: data.merchantName,
          purchased_at: data.purchasedAt,
          total_amount: data.totalAmount,
          category: data.category,
          items: data.items,
        },
      ]);

      if (error) throw error;

      alert('家計簿に保存しました！');
      setData(null);
      setImagePreview(null);
    } catch (err: any) {
      alert('保存に失敗しました: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="max-w-md mx-auto p-4 min-h-screen bg-gray-50 text-gray-800 pb-12">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">レシート家計簿</h1>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <label className="block text-sm font-semibold mb-2">レシートを撮影・選択</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
          disabled={loading}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
        />

        {imagePreview && (
          <div className="mt-4 relative">
            <img src={imagePreview} alt="Receipt" className="w-full max-h-60 object-contain rounded-lg border" />
            {loading && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white font-bold animate-pulse">
                Geminiで解析中...
              </div>
            )}
          </div>
        )}
      </div>

      {data && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-bold border-b pb-2 text-gray-900">内容の確認・補正</h2>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">店舗名</label>
            <input
              type="text"
              value={data.merchantName}
              onChange={(e) => setData({ ...data, merchantName: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">日付</label>
              <input
                type="date"
                value={data.purchasedAt}
                onChange={(e) => setData({ ...data, purchasedAt: e.target.value })}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">金額</label>
              <input
                type="number"
                value={data.totalAmount}
                onChange={(e) => setData({ ...data, totalAmount: Number(e.target.value) })}
                className="w-full p-2 border rounded-md font-bold text-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">カテゴリ</label>
            <input
              type="text"
              value={data.category}
              onChange={(e) => setData({ ...data, category: e.target.value })}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            {saving ? '保存中...' : '家計簿に保存する'}
          </button>
        </div>
      )}
    </main>
  );
}