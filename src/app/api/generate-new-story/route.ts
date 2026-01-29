import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { buildNewStoryPrompt, parseNewStoryResponse, checkAPIConfig } from '@/lib/ai/prompts';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        // 检查API配置
        const apiConfig = checkAPIConfig();
        const provider = apiConfig.provider;

        if (!provider) {
            return NextResponse.json(
                {
                    error: 'No AI API key configured. Please add DEEPSEEK_API_KEY, OPENAI_API_KEY or ANTHROPIC_API_KEY to your .env.local file.',
                    needsConfig: true,
                },
                { status: 400 }
            );
        }

        // 构建新故事 prompt
        const prompt = buildNewStoryPrompt();

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
                        content: '你是一位擅长创作交互式小说的AI作家。你需要生成全新的故事设定，包含世界观、角色和开头章节。输出必须是有效的JSON格式。',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.9,
                max_tokens: 2000,
            });

            generatedText = completion.choices[0]?.message?.content || '';

        } else if (provider === 'anthropic') {
            const anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });

            const message = await anthropic.messages.create({
                model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
                max_tokens: 2000,
                temperature: 0.9,
                system: '你是一位擅长创作交互式小说的AI作家。你需要生成全新的故事设定，包含世界观、角色和开头章节。输出必须是有效的JSON格式。',
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
                        content: '你是一位擅长创作交互式小说的AI作家。你需要生成全新的故事设定，包含世界观、角色和开头章节。输出必须是有效的JSON格式。',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.9,
                max_tokens: 2000,
            });

            generatedText = completion.choices[0]?.message?.content || '';
        }

        if (!generatedText) {
            return NextResponse.json(
                { error: 'Failed to generate content from AI' },
                { status: 500 }
            );
        }

        // 解析新故事响应
        const storyData = parseNewStoryResponse(generatedText);

        if (!storyData) {
            return NextResponse.json(
                {
                    error: 'Failed to parse AI response into story data',
                    rawResponse: generatedText,
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            story: storyData,
            rawResponse: generatedText,
        });

    } catch (error: any) {
        console.error('AI New Story Generation Error:', error);

        return NextResponse.json(
            {
                error: error.message || 'Failed to generate new story',
                details: error.toString(),
            },
            { status: 500 }
        );
    }
}
