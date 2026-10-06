import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'ファイルがアップロードされていません' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `Analyze this receipt image and extract the details in JSON format ONLY:
    {
      "merchant_name": "店舗名",
      "purchased_at": "YYYY-MM-DD",
      "total_amount": 1000,
      "category": "カテゴリ名 (例: 食費, 日用品, 娯楽)",
      "tax_type": "inclusive", // "inclusive" (税込) または "exclusive" (税別)
      "items": [
        {
          "name": "商品名",
          "price": 500,
          "quantity": 1,
          "tax_rate": 8 // 食料品・飲料（酒類除く）は 8、それ以外（日用品・外食・酒類など）は 10
        }
      ]
    }

    RULES:
    - Set "tax_type" to "exclusive" IF the receipt states "税別", "外税", "+消費税". Otherwise set to "inclusive".
    - For each item in "items", determine "tax_rate":
      * 8 for groceries, food, non-alcoholic drinks (reduced tax rate).
      * 10 for alcohol, daily necessities, household goods, dining out, etc.

    IMPORTANT: Respond ONLY with valid JSON. Do NOT wrap it in markdown code blocks or add any extra text or symbols.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: file.type,
        },
      },
    ]);

    const responseText = await result.response.text();
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('[ERROR] Receipt parsing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'レシートの解析に失敗しました' },
      { status: 500 }
    );
  }
}