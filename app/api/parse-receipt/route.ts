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
      "discount_amount": 0, // 値引き・割引の合計額（円）。ない場合は 0
      "category": "カテゴリ名 (例: 食費, 日用品, 娯楽)",
      "tax_type": "inclusive", // "inclusive" (税込) または "exclusive" (税別)
      "items": [
        {
          "name": "商品名",
          "price": 500,
          "quantity": 1,
          "tax_rate": 8
        }
      ]
    }

    RULES:
    - Set "tax_type" to "exclusive" IF the receipt states "税別", "外税", "+消費税". Otherwise set to "inclusive".
    - Sum up any discounts or coupon deductions into "discount_amount".
    - For each item in "items", determine "tax_rate":
      * 8 for groceries, food, non-alcoholic drinks (reduced tax rate).
      * 10 for alcohol, daily necessities, household goods, dining out, etc.

    IMPORTANT: Respond ONLY with valid JSON. Do NOT wrap it in markdown code blocks or add any extra text or symbols.`;

    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType: file.type,
            },
          },
        ]);
        break;
      } catch (err: any) {
        if ((err.status === 503 || err.message?.includes('503')) && attempts < maxAttempts) {
          console.warn(`[WARN] Gemini API 503 Error. Retrying attempt ${attempts}/${maxAttempts}...`);
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempts));
        } else {
          throw err;
        }
      }
    }

    if (!result) {
      throw new Error('解析結果の取得に失敗しました');
    }

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