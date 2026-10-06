'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
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

        // 最新の「年-月」をデフォルト選択肢に設定
        if (json.data.length > 0) {
          const latestDate = json.data[0].purchased_at; // YYYY-MM-DD
          if (latestDate) {
            setSelectedMonth(latestDate.slice(0, 7)); // YYYY-MM
          }
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 存在する全「年-月」のリストを作成（重複排除・降順）
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((t) => {
      if (t.purchased_at) {
        months.add(t.purchased_at.slice(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // 選択中の月のデータのみフィルタリング
  const monthlyTransactions = useMemo(() => {
    if (!selectedMonth) return transactions;
    return transactions.filter((t) => t.purchased_at?.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // 今月の合計金額
  const totalAmount = useMemo(() => {
    return monthlyTransactions.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  }, [monthlyTransactions]);

  // カテゴリ別集計データ（円グラフ用）
  const categoryData = useMemo(() => {
    const map: { [key: string]: number } = {};
    monthlyTransactions.forEach((t) => {
      const cat = t.category || '未分類';
      map[cat] = (map[cat] || 0) + Number(t.total_amount || 0);
    });
    return Object.keys(map).map((key) => ({
      name: key,
      value: map[key],
    }));
  }, [monthlyTransactions]);

  // 店舗別Top5集計データ（棒グラフ用）
  const merchantData = useMemo(() => {
    const map: { [key: string]: number } = {};
    monthlyTransactions.forEach((t) => {
      const merchant = t.merchant_name || '不明';
      map[merchant] = (map[merchant] || 0) + Number(t.total_amount || 0);
    });
    return Object.keys(map)
      .map((key) => ({ name: key, amount: map[key] }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthlyTransactions]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-12">
      {/* ヘッダーナビゲーション */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">家計簿ダッシュボード</h1>
        <div className="flex gap-2">
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm"
          >
            ＋ レシート登録
          </Link>
        </div>
      </div>

      {/* 月選択フィルター */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-600">表示対象月:</span>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-800 bg-white"
        >
          {availableMonths.length > 0 ? (
            availableMonths.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))
          ) : (
            <option value="">データなし</option>
          )}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">集計中...</div>
      ) : (
        <>
          {/* 月間合計カード */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-2xl shadow-md">
            <p className="text-sm font-medium text-blue-100">{selectedMonth || '全期間'} の総支出</p>
            <p className="text-4xl font-extrabold mt-1">¥{totalAmount.toLocaleString()}</p>
            <p className="text-xs text-blue-200 mt-2">件数: {monthlyTransactions.length} 件</p>
          </div>

          {/* グラフエリア */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* カテゴリ別割合（円グラフ） */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center">
              <h2 className="text-base font-bold text-gray-800 self-start mb-4">カテゴリ別支出内訳</h2>
              {categoryData.length === 0 ? (
                <div className="py-12 text-gray-400 text-sm">データがありません</div>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `¥${Number(value).toLocaleString()}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* 店舗別Top5（棒グラフ） */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
              <h2 className="text-base font-bold text-gray-800 mb-4">利用店舗 Top 5</h2>
              {merchantData.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">データがありません</div>
              ) : (
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={merchantData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: any) => `¥${Number(value).toLocaleString()}`} />
                      <Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* 直近の取引履歴一覧 */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-800">取引履歴一覧 ({monthlyTransactions.length}件)</h2>
            {monthlyTransactions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">この月のデータはありません</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {monthlyTransactions.map((t) => {
                  const isExpanded = expandedId === t.id;
                  const hasItems = t.items && t.items.length > 0;

                  return (
                    <div key={t.id} className="py-3 text-sm">
                      <div
                        onClick={() => hasItems && toggleExpand(t.id)}
                        className={`flex justify-between items-center ${
                          hasItems ? 'cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition' : 'p-2'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-gray-800 flex items-center gap-2">
                            <span>{t.merchant_name || '不明'}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-normal">
                              {t.category}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{t.purchased_at}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900">¥{Number(t.total_amount).toLocaleString()}</div>
                          {hasItems && (
                            <div className="text-xs text-blue-600 font-medium mt-0.5">
                              {isExpanded ? '▲ 明細を閉じる' : '▼ 明細を表示'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 品目明細のアコーディオン展開エリア */}
                      {isExpanded && hasItems && (
                        <div className="mt-2 ml-2 pl-3 border-l-2 border-blue-200 bg-slate-50 p-2 rounded-r-lg space-y-1">
                          <p className="text-xs font-bold text-gray-500 mb-1">購入品目:</p>
                          {t.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-700 py-0.5">
                              <span>• {item.name || '商品名なし'}</span>
                              <span className="font-medium">¥{Number(item.price || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}