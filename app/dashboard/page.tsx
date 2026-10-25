'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
  tax_rate?: number;
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
  is_shared?: boolean;
}

type ViewMode = 'category' | 'daily' | 'monthly' | 'yearly' | 'custom';
type ScopeMode = 'all' | 'shared' | 'personal';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export default function Dashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  // 予算関連 State
  const [budget, setBudget] = useState<number>(0);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [inputBudget, setInputBudget] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  // 明細展開用 State (展開中のID)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // グラフフィルター用 State
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [scopeMode, setScopeMode] = useState<ScopeMode>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 検索・絞り込みフィルター用 State
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

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

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const scopedReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const isShared = r.is_shared ?? true;
      if (scopeMode === 'shared') return isShared;
      if (scopeMode === 'personal') return !isShared;
      return true;
    });
  }, [receipts, scopeMode]);

  const currentMonthReceipts = useMemo(() => {
    return scopedReceipts.filter((r) => r.purchased_at?.startsWith(currentMonthStr));
  }, [scopedReceipts, currentMonthStr]);

  const currentMonthExpense = useMemo(() => {
    return currentMonthReceipts
      .filter((r) => r.type !== 'income')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);
  }, [currentMonthReceipts]);

  const currentMonthIncome = useMemo(() => {
    return currentMonthReceipts
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);
  }, [currentMonthReceipts]);

  const budgetUsagePercent = useMemo(() => {
    if (!budget || budget <= 0) return 0;
    return Math.min(Math.round((currentMonthExpense / budget) * 100), 100);
  }, [currentMonthExpense, budget]);

  const chartData = useMemo(() => {
    const expenses = scopedReceipts.filter((r) => r.type !== 'income');

    if (viewMode === 'category') {
      const map: { [key: string]: number } = {};
      expenses
        .filter((r) => r.purchased_at?.startsWith(currentMonthStr))
        .forEach((r) => {
          const cat = r.category || '未分類';
          map[cat] = (map[cat] || 0) + (r.total_amount || 0);
        });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    }

    if (viewMode === 'daily') {
      const map: { [key: string]: number } = {};
      expenses
        .filter((r) => r.purchased_at?.startsWith(currentMonthStr))
        .forEach((r) => {
          const day = r.purchased_at?.slice(8, 10) ? `${r.purchased_at.slice(8, 10)}日` : '不明';
          map[day] = (map[day] || 0) + (r.total_amount || 0);
        });
      return Object.entries(map)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, amount]) => ({ day, amount, name: day, value: amount }));
    }

    if (viewMode === 'monthly') {
      const map: { [key: string]: number } = {};
      expenses.forEach((r) => {
        const month = r.purchased_at?.slice(0, 7);
        if (month) {
          map[month] = (map[month] || 0) + (r.total_amount || 0);
        }
      });
      return Object.entries(map)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, amount]) => ({ month, amount, name: month, value: amount }));
    }

    if (viewMode === 'yearly') {
      const map: { [key: string]: number } = {};
      expenses.forEach((r) => {
        const year = r.purchased_at?.slice(0, 4);
        if (year) {
          map[year] = (map[year] || 0) + (r.total_amount || 0);
        }
      });
      return Object.entries(map)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([year, amount]) => ({ year, amount, name: year, value: amount }));
    }

    if (viewMode === 'custom') {
      const map: { [key: string]: number } = {};
      expenses.forEach((r) => {
        const date = r.purchased_at?.slice(0, 10) || '';
        if ((!customStartDate || date >= customStartDate) && (!customEndDate || date <= customEndDate)) {
          const cat = r.category || '未分類';
          map[cat] = (map[cat] || 0) + (r.total_amount || 0);
        }
      });
      return Object.entries(map).map(([name, value]) => ({ name, value }));
    }

    return [];
  }, [scopedReceipts, currentMonthStr, viewMode, customStartDate, customEndDate]);

  const filteredReceipts = useMemo(() => {
    return scopedReceipts.filter((r) => {
      const kw = searchKeyword.trim().toLowerCase();
      const matchMerchant = r.merchant_name?.toLowerCase().includes(kw);
      const matchItems = r.items?.some((item) => item.name?.toLowerCase().includes(kw));
      if (kw && !matchMerchant && !matchItems) return false;

      if (selectedCategory !== 'ALL' && r.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [scopedReceipts, searchKeyword, selectedCategory]);

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
    <main className="min-h-screen bg-slate-50 p-4 max-w-md mx-auto pb-24">
      {/* 画面ヘッダー */}
      <header className="my-4 text-center">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          集計・分析
        </h1>
        <p className="text-xs text-slate-400 mt-1">支出・収入・予算の進捗状況</p>
      </header>

      {/* スコープ切替タブ */}
      <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-bold mb-4">
        <button
          onClick={() => setScopeMode('all')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            scopeMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          すべて
        </button>
        <button
          onClick={() => setScopeMode('shared')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            scopeMode === 'shared' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500'
          }`}
        >
          👥 家族共有
        </button>
        <button
          onClick={() => setScopeMode('personal')}
          className={`flex-1 py-1.5 rounded-lg transition ${
            scopeMode === 'personal' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-500'
          }`}
        >
          👤 個人用
        </button>
      </div>

      {/* 今月の収支＆予算状況カード */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              今月の支出 ({currentMonthStr})
            </h2>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              ¥{currentMonthExpense.toLocaleString()}
            </div>
          </div>
          {currentMonthIncome > 0 && (
            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                今月の収入
              </span>
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

        {/* 📊 グラフ切り替えセクション */}
        <div className="pt-2 border-t space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'category', label: 'カテゴリー別' },
              { id: 'daily', label: '日別' },
              { id: 'monthly', label: '月毎' },
              { id: 'yearly', label: '年別' },
              { id: 'custom', label: '任意日付' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                  viewMode === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {viewMode === 'custom' && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl text-xs border border-slate-200">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="p-1.5 border rounded-lg bg-white w-full"
              />
              <span className="text-slate-400">〜</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="p-1.5 border rounded-lg bg-white w-full"
              />
            </div>
          )}

          {chartData.length > 0 ? (
            <div className="h-48 w-full pt-2">
              {(viewMode === 'category' || viewMode === 'custom') && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => [`¥${(Number(val) || 0).toLocaleString()}`, '金額']} />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {viewMode === 'daily' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData as any}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val: any) => [`¥${(Number(val) || 0).toLocaleString()}`, '支出']} />
                    <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {(viewMode === 'monthly' || viewMode === 'yearly') && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData as any}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey={viewMode === 'monthly' ? 'month' : 'year'} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val: any) => [`¥${(Number(val) || 0).toLocaleString()}`, '支出']} />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <p className="text-xs text-center text-slate-400 py-8 bg-slate-50 rounded-xl">
              表示可能な集計データがありません
            </p>
          )}
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
          取引データはありません
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReceipts.map((r) => {
            const isShared = r.is_shared ?? true;
            const isExpanded = expandedId === r.id;
            const hasItems = r.items && r.items.length > 0;

            return (
              <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-slate-400">{r.purchased_at?.slice(0, 10)}</span>
                  <div className="flex gap-1 items-center">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                        isShared
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isShared ? '👥 共有' : '👤 個人'}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        r.type === 'income'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.type === 'income' ? '収入' : r.category || '未分類'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-1">
                  <span className="font-bold text-slate-800 text-base">{r.merchant_name}</span>
                  <span
                    className={`font-bold text-lg ${
                      r.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {r.type === 'income' ? '+' : ''}¥{(r.total_amount || 0).toLocaleString()}
                  </span>
                </div>

                {/* 明細（items）アコーディオン表示部分 */}
                {hasItems && (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={() => toggleExpand(r.id)}
                      className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1"
                    >
                      {isExpanded ? '▲ 明細を閉じる' : `▼ 購入明細 (${r.items.length}件) を表示`}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 p-2.5 bg-slate-50 rounded-lg space-y-1 text-xs text-slate-700">
                        {r.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-0.5">
                            <span className="truncate pr-2">• {item.name || '品名なし'}</span>
                            <span className="font-medium text-slate-900 shrink-0">
                              ¥{(item.price || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs px-2.5 py-1 bg-rose-50 text-rose-600 font-medium rounded-md hover:bg-rose-100 transition"
                  >
                    🗑 削除
                  </button>
                </div>
              </div>
            );
          })}
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
                  className="w-full p-2.5 border border-slate-200 bg-white text-slate-800 rounded-xl text-base font-bold focus:outline-indigo-500"
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