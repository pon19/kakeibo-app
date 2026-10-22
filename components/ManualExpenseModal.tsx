'use client';

import { useState } from 'react';

interface ManualExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  '食費',
  '日用品',
  '交通費',
  '交際費',
  '住居費・光熱費',
  '趣味・教養',
  '医療・健康',
  'その他',
];

const INCOME_CATEGORIES = [
  '給与',
  '賞与',
  '副収入',
  '臨時収入',
  'お小遣い',
  'その他収入',
];

export default function ManualExpenseModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualExpenseModalProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [merchantName, setMerchantName] = useState('');
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState('食費');
  const [taxRate, setTaxRate] = useState<'10' | '8'>('10');
  
  // 共有/個人切り替え用State（デフォルトは true = 家族共有）
  const [isShared, setIsShared] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // 支出/収入切り替え時にデフォルトカテゴリを変更
  const handleTypeChange = (newType: 'expense' | 'income') => {
    setType(newType);
    setCategory(newType === 'expense' ? '食費' : '給与');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amount = Number(totalAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('正しい金額を入力してください');
      setLoading(false);
      return;
    }

    const rate = taxRate === '10' ? 0.1 : 0.08;
    const taxAmount = type === 'expense' ? Math.round(amount - amount / (1 + rate)) : 0;

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, // expense or income
          merchant_name: merchantName || (type === 'expense' ? '手入力の支出' : '手入力の収入'),
          purchased_at: purchasedAt,
          total_amount: amount,
          discount_amount: 0,
          tax_type: 'inclusive',
          tax_amount: taxAmount,
          category,
          is_shared: isShared, // ← 共有/個人フラグを追加
          items: [
            {
              name: merchantName || (type === 'expense' ? '手入力支出' : '手入力収入'),
              price: amount,
              quantity: 1,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMerchantName('');
        setTotalAmount('');
        setIsShared(true); // 初期化
        onSuccess();
        onClose();
      } else {
        setError(data.error || '保存に失敗しました');
      }
    } catch (err: any) {
      setError(err.message || '通信エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">手入力でデータ追加</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm p-1"
          >
            ✕
          </button>
        </div>

        {/* 支出 / 収入 の切り替えタブ */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              type === 'expense'
                ? 'bg-rose-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💸 支出
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💰 収入
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-100 text-rose-800 text-xs rounded-xl">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 👥 家族共有 / 👤 個人用 切替トグル */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">
                {isShared ? '👥 家族共有' : '👤 個人の記録'}
              </p>
              <p className="text-[10px] text-slate-500">
                {isShared ? '世帯全体のグラフ・一覧に反映' : '自分のみ閲覧・計算に反映'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsShared(!isShared)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                isShared
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {isShared ? '共有中' : '個人用'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {type === 'expense' ? '用途・店舗名' : '収入元・名称'}
            </label>
            <input
              type="text"
              placeholder={type === 'expense' ? '例: 自動販売機、電車代' : '例: ○○株式会社、給与'}
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              className="w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                日付
              </label>
              <input
                type="date"
                required
                value={purchasedAt}
                onChange={(e) => setPurchasedAt(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                金額 (円)
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="1000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-500 font-bold"
              />
            </div>
          </div>

          <div className={type === 'expense' ? 'grid grid-cols-2 gap-3' : 'w-full'}>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                カテゴリ
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-500"
              >
                {currentCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {type === 'expense' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  適用税率
                </label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value as '10' | '8')}
                  className="w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-500"
                >
                  <option value="10">標準税率 (10%)</option>
                  <option value="8">軽減税率 (8%)</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 bg-slate-100 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-200 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`w-1/2 py-2.5 text-white font-medium text-sm rounded-xl transition flex items-center justify-center gap-1 ${
                type === 'expense'
                  ? 'bg-rose-500 hover:bg-rose-600'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } disabled:bg-slate-300`}
            >
              {loading ? '保存中...' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}