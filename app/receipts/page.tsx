'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

interface Transaction {
  id: string;
  merchant_name: string;
  purchased_at: string;
  total_amount: number;
  category: string;
  items?: ReceiptItem[];
}

export default function ReceiptsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/receipts');
      const json = await res.json();
      if (json.success && json.data) {
        setTransactions(json.data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    if (!confirm('本当にこのデータを削除しますか？')) return;

    try {
      const res = await fetch(`/api/receipts/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setTransactions((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert('削除に失敗しました: ' + json.error);
      }
    } catch (err: any) {
      alert('削除エラー: ' + err.message);
    }
  };

  // 編集モーダルを開く
  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction({
      ...transaction,
      items: transaction.items ? [...transaction.items] : [],
    });
    setIsModalOpen(true);
  };

  // 明細（items）の動的変更
  const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
    if (!editingTransaction) return;
    const updatedItems = [...(editingTransaction.items || [])];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // 明細金額の合計値を算出
    const newTotal = updatedItems.reduce((sum, item) => sum + Number(item.price || 0), 0);

    setEditingTransaction({
      ...editingTransaction,
      items: updatedItems,
      total_amount: newTotal > 0 ? newTotal : editingTransaction.total_amount,
    });
  };

  const handleAddItem = () => {
    if (!editingTransaction) return;
    const currentItems = editingTransaction.items || [];
    setEditingTransaction({
      ...editingTransaction,
      items: [...currentItems, { name: '', price: 0, quantity: 1 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editingTransaction) return;
    const updatedItems = (editingTransaction.items || []).filter((_, i) => i !== index);
    setEditingTransaction({
      ...editingTransaction,
      items: updatedItems,
    });
  };

  // 編集内容を保存（API送信）
  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    try {
      const res = await fetch(`/api/receipts/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_name: editingTransaction.merchant_name,
          purchased_at: editingTransaction.purchased_at,
          total_amount: Number(editingTransaction.total_amount),
          category: editingTransaction.category,
          items: editingTransaction.items || [],
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setEditingTransaction(null);
        fetchTransactions(); // 再読み込み
      } else {
        alert('更新に失敗しました: ' + json.error);
      }
    } catch (err: any) {
      alert('更新エラー: ' + err.message);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-16">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">取引履歴一覧・編集</h1>
        <Link
          href="/dashboard"
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          📊 ダッシュボードへ戻る
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">読み込み中...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
          登録されている取引データがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {transactions.map((t) => {
            const isExpanded = expandedId === t.id;
            const hasItems = t.items && t.items.length > 0;

            return (
              <div key={t.id} className="p-4 space-y-2">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-base">
                        {t.merchant_name || '名称未設定'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-medium border border-blue-100">
                        {t.category || '未分類'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      日付: {t.purchased_at?.slice(0, 10)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="text-lg font-extrabold text-gray-900">
                      ¥{Number(t.total_amount).toLocaleString()}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(t)}
                        className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold hover:bg-amber-100 transition"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>

                {/* 品目明細のアコーディオン展開表示 */}
                {hasItems && (
                  <div className="pt-2">
                    <button
                      onClick={() => toggleExpand(t.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      {isExpanded ? '▲ 明細を閉じる' : `▼ 購入品目 (${t.items?.length}件) を表示`}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 pl-3 border-l-2 border-indigo-200 bg-slate-50 p-2.5 rounded-r-lg space-y-1">
                        {t.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-gray-700 py-0.5">
                            <span>• {item.name || '品名なし'}</span>
                            <span className="font-medium text-gray-900">
                              ¥{Number(item.price || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 編集用モーダル（ポップアップ） */}
      {isModalOpen && editingTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-2">取引データの編集</h2>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">店舗名</label>
                <input
                  type="text"
                  value={editingTransaction.merchant_name || ''}
                  onChange={(e) =>
                    setEditingTransaction({ ...editingTransaction, merchant_name: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">購入日付</label>
                <input
                  type="date"
                  value={editingTransaction.purchased_at?.slice(0, 10) || ''}
                  onChange={(e) =>
                    setEditingTransaction({ ...editingTransaction, purchased_at: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">合計金額（円）</label>
                <input
                  type="number"
                  value={editingTransaction.total_amount || 0}
                  onChange={(e) =>
                    setEditingTransaction({
                      ...editingTransaction,
                      total_amount: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">カテゴリ</label>
                <input
                  type="text"
                  value={editingTransaction.category || ''}
                  onChange={(e) =>
                    setEditingTransaction({ ...editingTransaction, category: e.target.value })
                  }
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800"
                />
              </div>

              {/* 明細（items）編集セクション */}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700">購入品目（明細）編集</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2.5 py-1 rounded-md hover:bg-indigo-100 transition"
                  >
                    ＋ 品目追加
                  </button>
                </div>

                {editingTransaction.items && editingTransaction.items.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {editingTransaction.items.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <input
                          type="text"
                          placeholder="商品名"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="flex-1 p-1.5 border rounded text-xs text-gray-800 focus:outline-indigo-500"
                        />
                        <input
                          type="number"
                          placeholder="価格"
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))}
                          className="w-24 p-1.5 border rounded text-xs text-gray-800 focus:outline-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 hover:text-red-700 text-sm font-bold px-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-1">明細データはありません</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 text-sm transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 text-sm transition shadow-sm"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}