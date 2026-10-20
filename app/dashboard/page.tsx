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
  type?: 'expense' | 'income';
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

  // 予算関連 State
  const [budget, setBudget] = useState<number>(0);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [inputBudget, setInputBudget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  // 検索・絞り込みフィルター用 State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // モーダル編集用 State
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const currentMonthStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  useEffect(() => {
    fetchReceipts();
    fetchBudget();
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

  const fetchBudget = async () => {
    try {
      const res = await fetch(`/api/budget?month=${currentMonthStr}`);
      const data = await res.json();
      if (data.success) {
        setBudget(data.budget || 0);
        setInputBudget(String(data.budget || ''));
      }
    } catch (err) {
      console.error('予算の取得に失敗しました', err);
    }
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBudget(true);

    try {
      const res = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonthStr,
          amount: Number(inputBudget),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBudget(data.budget);
        setIsBudgetModalOpen(false);
      } else {
        alert(data.error || '予算の保存に失敗しました');
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    } finally {
      setSavingBudget(false);
    }
  };

  const currentMonthReceipts = useMemo(() => {
    return receipts.filter((r) => r.purchased_at?.startsWith(currentMonthStr));
  }, [receipts, currentMonthStr]);

  // 支出合計
  const currentMonthExpense = useMemo(() => {
    return currentMonthReceipts
      .filter((r) => r.type !== 'income')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);
  }, [currentMonthReceipts]);

  // 収入合計
  const currentMonthIncome = useMemo(() => {
    return currentMonthReceipts
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);
  }, [currentMonthReceipts]);

  // 予算進捗率 (%)
  const budgetUsagePercent = useMemo(() => {
    if (!budget || budget <= 0) return 0;
    return Math.min(Math.round((currentMonthExpense / budget) * 100), 100);
  }, [currentMonthExpense, budget]);

  const categoryData = useMemo(() => {
    const map: { [key: string]: number } = {};
    currentMonthReceipts
      .filter((r) => r.type !== 'income')
      .forEach((r) => {
        const cat = r.category || '未分類';
        map[cat] = (map[cat] || 0) + (r.total_amount || 0);
      });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [currentMonthReceipts]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    receipts.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [receipts]);

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('この取引データを削除しますか？')) return;

    try {
      const res = await fetch(`/api/receipts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setReceipts((prev) => prev.filter((r) => r.id !== id));
      } else {
        alert('削除に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (err: any) {
      alert('エラーが発生しました: ' + err.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto pb-20">
      <div className="flex items-center justify-between my-4">
        <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
        <Link className="text-xs bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-300 transition" href="/">
          ← レシート撮影へ
        </Link>
      </div>

      {/* 今月の収支＆予算状況カード */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">今月の支出 ({currentMonthStr})</h2>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              ¥{currentMonthExpense.toLocaleString()}
            </div>
          </div>
          {currentMonthIncome > 0 && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">今月の収入</span>
              <div className="text-sm font-bold text-emerald-600 mt-1">
                +¥{currentMonthIncome.toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* 予算進捗バー */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-bold text-slate-600">
              目標予算: {budget > 0 ? `¥${budget.toLocaleString()}` : '未設定'}
            </span>
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="text-xs text-indigo-600 font-bold underline hover:text-indigo-800"
            >
              {budget > 0 ? '予算を変更' : '＋ 予算を設定'}
            </button>
          </div>

          {budget > 0 ? (
            <div className="space-y-1">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    currentMonthExpense > budget
                      ? 'bg-rose-500'
                      : budgetUsagePercent >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((currentMonthExpense / budget) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>消化率 {Math.round((currentMonthExpense / budget) * 100)}%</span>
                <span>
                  {currentMonthExpense > budget ? (
                    <strong className="text-rose-500 font-bold">
                      ⚠️ ¥{(currentMonthExpense - budget).toLocaleString()} の予算オーバー
                    </strong>
                  ) : (
                    <span>残額: ¥{(budget - currentMonthExpense).toLocaleString()}</span>
                  )}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-dashed text-center">
              予算を設定すると使いすぎ防止の進捗バーが表示されます
            </p>
          )}
        </div>

        {/* ドーナツチャート */}
        {categoryData.length > 0 && (
          <div className="pt-2">
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
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
          </div>
        )}
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
          取引データはありません
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReceipts.map((r) => (
            <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs text-slate-400">{r.purchased_at?.slice(0, 10)}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  r.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {r.type === 'income' ? '収入' : r.category || '未分類'}
                </span>
              </div>

              <div className="flex justify-between items-center mt-1">
                <span className="font-bold text-slate-800 text-base">{r.merchant_name}</span>
                <span className={`font-bold text-lg ${r.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {r.type === 'income' ? '+' : ''}¥{(r.total_amount || 0).toLocaleString()}
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end gap-2">
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

      {/* 予算設定モーダル */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-800 mb-1">今月の予算を設定</h3>
            <p className="text-xs text-slate-400 mb-4">{currentMonthStr} 月の目標支出予算（円）を入力してください。</p>

            <form onSubmit={handleSaveBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">目標予算額</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  placeholder="例: 150000"
                  value={inputBudget}
                  onChange={(e) => setInputBudget(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-base font-bold text-slate-800 focus:outline-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-200 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={savingBudget}
                  className="w-1/2 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 transition"
                >
                  {savingBudget ? '保存中...' : '設定を保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}