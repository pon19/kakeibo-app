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
      "tax_type": "inclusive", // "inclusive" (内税/税込) または "exclusive" (外税/税別)
      "tax_amount": 100, // レシートに記載されている消費税額（数値、不明・記載なしの場合は 0）
      "items": [
        {
          "name": "商品名",
          "price": 500,
          "quantity": 1
        }
      ]
    }

    TAX RULE:
    - Set "tax_type" to "exclusive" IF the receipt explicitly states "税別", "外税", "+消費税", or lists tax added separately to the subtotal.
    - Set "tax_type" to "inclusive" IF the receipt explicitly states "税込", "内税", "(内消費税等)", or does not specify.
    - Extract "tax_amount" if listed (e.g. "消費税 100円", "内消費税 80円"). If not explicitly mentioned, return 0.

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
    console.log('[DEBUG 1] Gemini Raw Response:', responseText);

    const cleanedText = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsedData = JSON.parse(cleanedText);
    console.log('[DEBUG 2] Parsed Gemini Data:', parsedData);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('[ERROR] Receipt parsing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'レシートの解析に失敗しました' },
      { status: 500 }
    );
  }
}