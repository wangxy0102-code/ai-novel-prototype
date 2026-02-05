import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { buildComparisonPrompt } from '@/lib/ai/prompts';

export const runtime = 'edge';

export async function POST(req: Request) {
    try {
        const { originalSummary, actualSummary, genre, protagonistName } = await req.json();

        if (!originalSummary || !actualSummary) {
            return NextResponse.json(
                { error: 'Missing summary data' },
                { status: 400 }
            );
        }

        // 优先使用 DeepSeek，其次 OpenAI
        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
        const baseURL = process.env.DEEPSEEK_API_KEY ? 'https://api.deepseek.com' : undefined;
        const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || 'deepseek-chat';

        if (!apiKey) {
            return NextResponse.json(
                { error: '无 API Key 配置' },
                { status: 500 }
            );
        }

        const client = new OpenAI({
            apiKey,
            baseURL,
        });

        const prompt = buildComparisonPrompt(originalSummary, actualSummary, genre || '通用', protagonistName);

        const completion = await client.chat.completions.create({
            model,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 100,
        });

        const comparisonText = completion.choices[0]?.message?.content?.trim() || '命运发生了无法言说的改变。';

        // 简单的清理
        const cleanText = comparisonText.replace(/^["'“”]|["'“”]$/g, '');

        return NextResponse.json({ comparison: cleanText });

    } catch (error: any) {
        console.error('Comparison generation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate comparison' },
            { status: 500 }
        );
    }
}
