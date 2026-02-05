import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { buildFullStoryPrompt, parseFullStoryResponse, checkAPIConfig } from '@/lib/ai/prompts';
import type { AIGenerationRequest } from '@/lib/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as AIGenerationRequest;
        const { worldState, previousChapter, userSuggestion, provider: requestedProvider, isTestMode } = body;

        // 检查API配置
        const apiConfig = checkAPIConfig();
        const provider = requestedProvider || apiConfig.provider;

        if (!provider) {
            return NextResponse.json(
                {
                    error: 'No AI API key configured. Please add DEEPSEEK_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY to your .env.local file.',
                    needsConfig: true,
                },
                { status: 400 }
            );
        }

        // 构建完整剧情 prompt
        const prompt = buildFullStoryPrompt({
            worldState,
            previousChapter,
            userSuggestion,
            isTestMode,
        });

        let generatedText = '';

        // 根据provider调用相应API
        if (provider === 'openai') {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            const completion = await openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-4o-2024-11-20',
                messages: [
                    {
                        role: 'system',
                        content: '你是一位擅长极简叙事的AI作家，能够一次性生成完整的故事剧情。每章必须浓缩为一句话概括（类似于"xxx遇到了xxx事，选择xxx方式解决"）。',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.85,
                max_tokens: 4000,
            });

            generatedText = completion.choices[0]?.message?.content || '';

        } else if (provider === 'anthropic') {
            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });

            const message = await anthropic.messages.create({
                model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
                max_tokens: 4000,
                temperature: 0.85,
                system: '你是一位擅长极简叙事的AI作家，能够一次性生成完整的故事剧情。每章必须浓缩为一句话概括（类似于"xxx遇到了xxx事，选择xxx方式解决"）。',
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });

            const textContent = message.content.find(block => block.type === 'text');
            generatedText = textContent && 'text' in textContent ? textContent.text : '';
        } else if (provider === 'deepseek') {
            // DeepSeek 使用 OpenAI 兼容的 API
            const deepseek = new OpenAI({
                apiKey: process.env.DEEPSEEK_API_KEY,
                baseURL: 'https://api.deepseek.com',
            });

            const completion = await deepseek.chat.completions.create({
                model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: '你是一位擅长极简叙事的AI作家，能够一次性生成完整的故事剧情。每章必须浓缩为一句话概括（类似于"xxx遇到了xxx事，选择xxx方式解决"）。',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.85,
                max_tokens: 4000,
            });

            generatedText = completion.choices[0]?.message?.content || '';
        }

        if (!generatedText) {
            return NextResponse.json(
                { error: 'Failed to generate content from AI' },
                { status: 500 }
            );
        }

        // 解析完整剧情响应
        const { chapters: parsedChapters, comment } = parseFullStoryResponse(generatedText, worldState.currentChapter + 1);

        if (parsedChapters.length === 0) {
            return NextResponse.json(
                {
                    error: 'Failed to parse AI response into chapters',
                    rawResponse: generatedText,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            chapters: parsedChapters,
            comment: comment,
            rawResponse: generatedText,
        });

    } catch (error: any) {
        console.error('AI Full Story Generation Error:', error);

        return NextResponse.json(
            {
                error: error.message || 'Failed to generate full story',
                details: error.toString(),
            },
            { status: 500 }
        );
    }
}
