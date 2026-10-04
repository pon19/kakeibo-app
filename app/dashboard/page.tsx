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

interface Transaction {
  id: string;
  merchant_name: string;
  purchased_at: string;
  total_amount: number;
  category: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

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

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6 pb-12">
      {/* ヘッダーナビゲーション */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* 修正後（ダーク背景でも読みやすい文字色に指定） */}
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">家計簿ダッシュボード</h1>
        <div className="flex gap-2">
          <Link
            href="/receipts"
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            履歴一覧
          </Link>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
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
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
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
        </>
      )}
    </div>
  );
}