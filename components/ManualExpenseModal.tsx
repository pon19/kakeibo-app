'use client';

import { useState } from 'react';

interface ManualExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  '食費',
  '日用品',
  '交通費',
  '交際費',
  '住居費・光熱費',
  '趣味・教養',
  '医療・健康',
  'その他',
];

export default function ManualExpenseModal({
  isOpen,
  onClose,
  onSuccess,
}: ManualExpenseModalProps) {
  const [merchantName, setMerchantName] = useState('');
  const [purchasedAt, setPurchasedAt] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [totalAmount, setTotalAmount] = useState('');
  const [category, setCategory] = useState('食費');
  const [taxRate, setTaxRate] = useState<'10' | '8'>('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

    // 内税計算（概算）
    const rate = taxRate === '10' ? 0.1 : 0.08;
    const taxAmount = Math.round(amount - amount / (1 + rate));

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_name: merchantName || '手入力の支出',
          purchased_at: purchasedAt,
          total_amount: amount,
          discount_amount: 0,
          tax_type: 'inclusive',
          tax_amount: taxAmount,
          category,
          items: [
            {
              name: merchantName || '手入力',
              price: amount,
              quantity: 1,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.success) {
        // フォームリセット
        setMerchantName('');
        setTotalAmount('');
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

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">手入力で支出を追加</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm p-1"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-100 text-rose-800 text-xs rounded-xl">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              用途・店舗名
            </label>
            <input
              type="text"
              placeholder="例: 自動販売機、電車代"
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
                金額 (税込)
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                カテゴリ
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
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
              className="w-1/2 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 transition flex items-center justify-center gap-1"
            >
              {loading ? '保存中...' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}