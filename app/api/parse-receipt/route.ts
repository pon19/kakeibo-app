import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const ai = new GoogleGenAI({});

// レシートから取り出したいデータの構造を定義
const receiptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    merchantName: { type: Type.STRING, description: '店舗名' },
    purchasedAt: { type: Type.STRING, description: '購入日付（YYYY-MM-DD形式）' },
    totalAmount: { type: Type.NUMBER, description: '合計金額' },
    category: { type: Type.STRING, description: 'カテゴリ（食費、日用品、交通費など）' },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: '品名' },
          price: { type: Type.NUMBER, description: '金額' },
        },
        required: ['name', 'price'],
      },
    },
  },
  required: ['merchantName', 'purchasedAt', 'totalAmount', 'category', 'items'],
};

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: '画像が見つかりません' }, { status: 400 });
    }

    const matches = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : 'image/jpeg';
    const base64Data = matches ? matches[2] : imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // Gemini 2.5 Flash モデルで画像を解析
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { inlineData: { mimeType, data: base64Data } },
        { text: 'レシート画像から店舗名、日付、合計金額、カテゴリ、品目明細を抽出してください。' },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: receiptSchema,
        temperature: 0.1,
      },
    });

    const parsedReceipt = JSON.parse(response.text || '{}');
    return NextResponse.json({ success: true, data: parsedReceipt });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}