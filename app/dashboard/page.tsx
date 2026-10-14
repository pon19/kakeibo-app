'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  tax_rate: number;
}

interface Receipt {
  id: string;
  merchant_name: string;
  purchased_at: string;
  total_amount: number;
  discount_amount: number;
  category: string;
  tax_type: 'inclusive' | 'exclusive';
  tax_amount: number;
  items: ReceiptItem[];
  created_at: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export default function Dashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  // 検索・絞り込みフィルター用 State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // モーダル編集用 State
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      const res = await fetch('/api/receipts');
      const data = await res.json();
      if (data.success) {
        setReceipts(data.data);
      }
    } catch (err) {
      console.error('データの取得に失敗しました', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [receipts]);

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  const currentMonthReceipts = useMemo(() => {
    return receipts.filter((r) => r.purchased_at?.startsWith(currentMonthStr));
  }, [receipts, currentMonthStr]);

  const currentMonthTotal = useMemo(() => {
    return currentMonthReceipts.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  }, [currentMonthReceipts]);

  const categoryData = useMemo(() => {
    const map: { [key: string]: number } = {};
    currentMonthReceipts.forEach((r) => {
      const cat = r.category || '未分類';
      map[cat] = (map[cat] || 0) + (r.total_amount || 0);
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [currentMonthReceipts]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const kw = searchKeyword.trim().toLowerCase();
      const matchMerchant = r.merchant_name?.toLowerCase().includes(kw);
      const matchItems = r.items?.some((item) => item.name?.toLowerCase().includes(kw));
      if (kw && !matchMerchant && !matchItems) return false;

      if (selectedCategory !== 'ALL' && r.category !== selectedCategory) {
        return false;
      }

      const date = r.purchased_at?.slice(0, 10) || '';
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;

      return true;
    });
  }, [receipts, searchKeyword, selectedCategory, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchKeyword('');
    setSelectedCategory('ALL');
    setStartDate('');
    setEndDate('');
  };

  // --- 削除機能 ---
  const handleDelete = async (id: string) => {
    if (!window.confirm('この取引データを削除しますか？')) return;

    try {
      const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setReceipts((prev) => prev.filter((r) => r.id !== id));
        if (editingReceipt?.id === id) setEditingReceipt(null);
      } else {
        alert('削除に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    }
  };

  // --- 編集更新機能 ---
  const handleUpdate = async () => {
    if (!editingReceipt) return;
    setIsUpdating(true);

    try {
      const res = await fetch(`/api/receipts/${editingReceipt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReceipt),
      });

      const data = await res.json();
      if (data.success) {
        const updatedData = Array.isArray(data.data) ? data.data[0] : data.data;
        setReceipts((prev) =>
          prev.map((r) => (r.id === editingReceipt.id ? { ...r, ...updatedData } : r))
        );
        setEditingReceipt(null);
      } else {
        alert('更新に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // モーダル内での明細操作
  const handleItemChangeInEdit = (index: number, field: keyof ReceiptItem, value: any) => {
    if (!editingReceipt) return;
    const updatedItems = [...(editingReceipt.items || [])];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditingReceipt({ ...editingReceipt, items: updatedItems });
  };

  const handleAddItemInEdit = () => {
    if (!editingReceipt) return;
    const currentItems = editingReceipt.items || [];
    setEditingReceipt({
      ...editingReceipt,
      items: [...currentItems, { name: '', price: 0, quantity: 1, tax_rate: 8 }],
    });
  };

  const handleRemoveItemInEdit = (index: number) => {
    if (!editingReceipt) return;
    setEditingReceipt({
      ...editingReceipt,
      items: editingReceipt.items.filter((_, i) => i !== index),
    });
  };

  // CSVダウンロード
  const handleExportCSV = () => {
    if (filteredReceipts.length === 0) {
      alert('出力するデータがありません');
      return;
    }

    const headers = ['ID', '購入日時', '店舗名', 'カテゴリ', '計算モード', '値引き額', '消費税額', '合計金額'];
    const rows = filteredReceipts.map((r) => [
      `"${r.id}"`,
      `"${r.purchased_at?.slice(0, 10) || ''}"`,
      `"${(r.merchant_name || '').replace(/"/g, '""')}"`,
      `"${(r.category || '').replace(/"/g, '""')}"`,
      `"${r.tax_type === 'exclusive' ? '外税' : '内税'}"`,
      r.discount_amount || 0,
      r.tax_amount || 0,
      r.total_amount || 0,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `kakeibo_filtered_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto pb-20">
      <div className="flex items-center justify-between my-4">
        <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
        <Link className="text-xs bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-300 transition" href="/">
          ← レシート撮影へ
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={handleExportCSV}
          className="w-full py-2 px-4 bg-emerald-600 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 transition shadow-sm"
        >
          <span>📥</span>
          <span>絞り込み結果をCSV出力</span>
        </button>
      </div>

      {/* 今月の集計カード */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          今月の支出 ({currentMonthStr})
        </h2>
        <div className="text-3xl font-extrabold text-slate-900 mb-4">
          ¥{currentMonthTotal.toLocaleString()}
        </div>

        {categoryData.length > 0 ? (
          <div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [
                      `¥${(Number(value) || 0).toLocaleString()}`,
                      '金額',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100">
              {categoryData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></span>
                  <span className="text-slate-600 truncate flex-1">{item.name}</span>
                  <span className="font-bold text-slate-800">¥{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg">
            今月の集計データはまだありません
          </p>
        )}
      </div>

      {/* 検索・フィルター */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 space-y-3">
        <h2 className="text-xs font-bold text-slate-700 flex justify-between items-center">
          <span>🔍 取引の絞り込み・検索</span>
          {(searchKeyword || selectedCategory !== 'ALL' || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-indigo-600 font-normal underline hover:text-indigo-800"
            >
              条件リセット
            </button>
          )}
        </h2>

        <div>
          <input
            type="text"
            placeholder="店舗名・商品名で検索..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full p-2 border rounded-lg text-xs text-slate-800 focus:outline-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">カテゴリ</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border rounded-lg text-xs text-slate-800 bg-white"
            >
              <option value="ALL">すべて</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-1.5 border rounded-lg text-xs text-slate-800 bg-white"
            />
          </div>
        </div>
      </div>

      {/* 取引履歴一覧 */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700">取引履歴</h2>
        <span className="text-xs text-slate-400">{filteredReceipts.length} 件</span>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">データを読み込み中...</div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
          条件に該当する取引データはありません
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReceipts.map((r) => (
            <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-slate-400">{r.purchased_at?.slice(0, 10)}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  {r.category || '未分類'}
                </span>
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="font-bold text-slate-800 text-base">{r.merchant_name}</span>
                <span className="font-bold text-slate-900 text-lg">¥{(r.total_amount || 0).toLocaleString()}</span>
              </div>

              {r.items && r.items.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-50 text-xs text-slate-500">
                  <span>明細 ({r.items.length}件): </span>
                  <span>{r.items.map((i) => i.name).filter(Boolean).join(', ')}</span>
                </div>
              )}

              {/* アクションボタン */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => setEditingReceipt(r)}
                  className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 font-medium rounded-md hover:bg-indigo-100 transition"
                >
                  ✏️ 編集
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="text-xs px-2.5 py-1 bg-rose-50 text-rose-600 font-medium rounded-md hover:bg-rose-100 transition"
                >
                  🗑 削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 編集モーダル */}
      {editingReceipt && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 shadow-xl max-h-[90vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-800 text-base">取引データの修正</h3>
              <button
                onClick={() => setEditingReceipt(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">店舗名</label>
              <input
                type="text"
                value={editingReceipt.merchant_name || ''}
                onChange={(e) => setEditingReceipt({ ...editingReceipt, merchant_name: e.target.value })}
                className="w-full p-2 border rounded-lg text-sm text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">購入日時</label>
              <input
                type="date"
                value={editingReceipt.purchased_at?.slice(0, 10) || ''}
                onChange={(e) => setEditingReceipt({ ...editingReceipt, purchased_at: e.target.value })}
                className="w-full p-2 border rounded-lg text-sm text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">カテゴリ</label>
                <input
                  type="text"
                  value={editingReceipt.category || ''}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, category: e.target.value })}
                  className="w-full p-2 border rounded-lg text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">合計金額（円）</label>
                <input
                  type="number"
                  value={editingReceipt.total_amount || 0}
                  onChange={(e) => setEditingReceipt({ ...editingReceipt, total_amount: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg text-sm font-bold text-slate-800"
                />
              </div>
            </div>

            {/* 明細の編集 */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-700">購入品目（明細）</span>
                <button
                  type="button"
                  onClick={handleAddItemInEdit}
                  className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-1 rounded hover:bg-indigo-100"
                >
                  ＋ 追加
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {editingReceipt.items?.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <input
                      type="text"
                      placeholder="商品名"
                      value={item.name}
                      onChange={(e) => handleItemChangeInEdit(idx, 'name', e.target.value)}
                      className="flex-1 p-1.5 border rounded text-xs text-slate-800 bg-white"
                    />
                    <input
                      type="number"
                      placeholder="価格"
                      value={item.price}
                      onChange={(e) => handleItemChangeInEdit(idx, 'price', Number(e.target.value))}
                      className="w-16 p-1.5 border rounded text-xs text-slate-800 bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItemInEdit(idx)}
                      className="text-rose-500 hover:text-rose-700 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <button
                onClick={() => setEditingReceipt(null)}
                className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-200 transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:bg-slate-300 transition"
              >
                {isUpdating ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}