'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Receipt {
  id: string;
  merchant_name: string;
  purchased_at: string;
  total_amount: number;
  category: string;
}

export default function ReceiptListPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 編集モーダル用の状態
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/receipts');
      const json = await res.json();
      if (json.success) {
        setReceipts(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    if (!confirm('このレシートデータを削除してもよろしいですか？')) return;

    try {
      const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        alert('削除しました');
        setReceipts(receipts.filter((r) => r.id !== id));
      } else {
        alert('削除エラー: ' + json.error);
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    }
  };

  // 更新処理
  const handleUpdate = async () => {
    if (!editingReceipt) return;
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/receipts/${editingReceipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReceipt),
      });
      const json = await res.json();
      if (json.success) {
        alert('更新しました！');
        setReceipts(receipts.map((r) => (r.id === editingReceipt.id ? editingReceipt : r)));
        setEditingReceipt(null);
      } else {
        alert('更新エラー: ' + json.error);
      }
    } catch (err) {
      alert('通信エラーが発生しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(receipts.map((r) => r.category).filter(Boolean)))];

  const filteredReceipts = receipts.filter((receipt) => {
    const matchesCategory = selectedCategory === 'ALL' || receipt.category === selectedCategory;
    const matchesSearch =
      receipt.merchant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">レシート履歴一覧</h1>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            ダッシュボード
          </Link>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            ＋ レシート登録
          </Link>
        </div>
      </div>

      {/* 検索・フィルターエリア */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex-1">
          <input
            type="text"
            placeholder="店舗名やキーワードで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="カテゴリ選択"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-800"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'すべてのカテゴリ' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 一覧リスト */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500">
          該当するレシートデータが見つかりませんでした。
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full">
                    {receipt.category || '未分類'}
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    ¥{receipt.total_amount?.toLocaleString() ?? 0}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mt-2">
                  {receipt.merchant_name || '店舗名不明'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">日付: {receipt.purchased_at || '不明'}</p>
              </div>

              {/* 編集・削除ボタン */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setEditingReceipt(receipt)}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition"
                >
                  編集
                </button>
                <button
                  onClick={() => handleDelete(receipt.id)}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition"
                >
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 編集モーダル */}
      {editingReceipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 border-b pb-2">レシート情報の編集</h2>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">店舗名</label>
              <input
                type="text"
                value={editingReceipt.merchant_name}
                onChange={(e) => setEditingReceipt({ ...editingReceipt, merchant_name: e.target.value })}
                className="w-full p-2 border rounded-lg text-gray-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">日付</label>
                <input
                  type="date"
                  value={editingReceipt.purchased_at}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, purchased_at: e.target.value })}
                  className="w-full p-2 border rounded-lg text-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">金額</label>
                <input
                  type="number"
                  value={editingReceipt.total_amount}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, total_amount: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg font-bold text-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">カテゴリ</label>
              <input
                type="text"
                value={editingReceipt.category}
                onChange={(e) => setEditingReceipt({ ...editingReceipt, category: e.target.value })}
                className="w-full p-2 border rounded-lg text-gray-800"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingReceipt(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
              >
                {isUpdating ? '保存中...' : '更新を保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}