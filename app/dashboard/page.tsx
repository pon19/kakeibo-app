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

// グラフ用カラーパレット
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b'];

export default function Dashboard() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

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

  // 当月のデータ抽出 & 集計
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

  // カテゴリ別集計
  const categoryData = useMemo(() => {
    const map: { [key: string]: number } = {};
    currentMonthReceipts.forEach((r) => {
      const cat = r.category || '未分類';
      map[cat] = (map[cat] || 0) + (r.total_amount || 0);
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [currentMonthReceipts]);

  // CSVダウンロード処理
  const handleExportCSV = () => {
    if (receipts.length === 0) {
      alert('出力するデータがありません');
      return;
    }

    const headers = ['ID', '購入日時', '店舗名', 'カテゴリ', '計算モード', '値引き額', '消費税額', '合計金額'];
    const rows = receipts.map((r) => [
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
    link.setAttribute('download', `kakeibo_data_${new Date().toISOString().slice(0, 10)}.csv`);
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
          <span>家計簿データをCSV出力</span>
        </button>
      </div>

      {/* 今月の集計サマリーカード */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-6">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
          今月の支出 ({currentMonthStr})
        </h2>
        <div className="text-3xl font-extrabold text-slate-900 mb-4">
          ¥{currentMonthTotal.toLocaleString()}
        </div>

        {/* カテゴリ別割合グラフ */}
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
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 凡例リスト */}
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

      {/* 取引履歴一覧 */}
      <h2 className="text-sm font-bold text-slate-700 mb-3">最近の取引履歴</h2>

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-sm">データを読み込み中...</div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
          保存された取引データはありません
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {receipts.map((r) => (
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
            </div>
          ))}
        </div>
      )}
    </main>
  );
}