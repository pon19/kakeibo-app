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

    // モデル名を gemini-3.5-flash に設定
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `Analyze this receipt image and extract the following details in JSON format ONLY:
    {
      "merchant_name": "店舗名",
      "purchased_at": "YYYY-MM-DD",
      "total_amount": 1000,
      "category": "カテゴリ名 (例: 食費, 日用品, 娯楽)"
    }
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

    // マークダウン記号（```json ... ```）を取り除く処理
    const cleanedText = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const parsedData = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Receipt parsing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'レシートの解析に失敗しました' },
      { status: 500 }
    );
  }
}