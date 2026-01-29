'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStoryStore, getInitialWorldState, getCurrentWorldState } from '@/lib/store';
import { updateWorldStateFromResponse } from '@/lib/ai/prompts';
import ChapterReader from '@/components/ChapterReader';
import WorldStatePanel from '@/components/WorldStatePanel';
import ModifySuggestionForm from '@/components/ModifySuggestionForm';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { Chapter, AIGenerationResponse, WorldState } from '@/lib/types';

export default function ReadChapterPage() {
    const params = useParams();
    const router = useRouter();
    const chapterId = parseInt(params.chapterId as string);

    const { archive, addChapter, recordModification, updateWorldState } = useStoryStore();
    const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [needsApiConfig, setNeedsApiConfig] = useState(false);

    // 初始化章节数据
    useEffect(() => {
        const loadChapter = async () => {
            try {
                // 如果是前2章且archive为空,加载初始章节
                if (chapterId <= 2 && (!archive || archive.chapters.length === 0)) {
                    const res = await fetch('/api/init-chapters');
                    const { chapters: seedData } = await res.json();

                    const initialState = getInitialWorldState();
                    const initialChapters: Chapter[] = seedData.map((c: any) => ({
                        ...c,
                        generatedBy: 'original',
                        worldStateSnapshot: {
                            ...initialState,
                            currentChapter: c.id
                        },
                        metadata: {
                            createdAt: new Date(),
                            impactedElements: [],
                            tags: c.id === 1 ? ['灵能入门', '选择站队'] : ['初试身手', '疑云初现']
                        }
                    }));

                    initialChapters.forEach(chapter => addChapter(chapter));
                    setCurrentChapter(initialChapters[chapterId - 1]);
                } else if (archive && archive.chapters[chapterId - 1]) {
                    setCurrentChapter(archive.chapters[chapterId - 1]);
                } else {
                    setError('章节不存在');
                }
            } catch (err) {
                console.error('Failed to load chapter:', err);
                setError('加载章节失败');
            } finally {
                setIsLoading(false);
            }
        };

        loadChapter();
    }, [chapterId, archive, addChapter]);

    const handleGenerateNext = async (suggestion: string) => {
        if (!currentChapter) return;

        setIsGenerating(true);
        setError(null);
        setNeedsApiConfig(false);

        try {
            const worldState = getCurrentWorldState();

            let generatedText = '';

            // 调用AI生成API
            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    worldState,
                    previousChapter: currentChapter,
                    userSuggestion: suggestion,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.needsConfig) {
                    setNeedsApiConfig(true);
                }
                throw new Error(data.error || 'Failed to generate chapter');
            }

            const aiResponse = data as AIGenerationResponse;
            const finalGeneratedText = aiResponse.rawGeneratedText || aiResponse.content;

            // 更新世界状态
            const stateUpdates = updateWorldStateFromResponse(
                worldState,
                finalGeneratedText,
                suggestion
            );

            const newWorldState: WorldState = { ...worldState, ...stateUpdates, currentChapter: chapterId + 1 };

            // 创建新章节
            const newChapter: Chapter = {
                id: chapterId + 1,
                title: aiResponse.chapterTitle,
                content: aiResponse.content,
                generatedBy: 'ai',
                userSuggestion: suggestion,
                worldStateSnapshot: newWorldState,
                metadata: {
                    createdAt: new Date(),
                    impactedElements: aiResponse.tags,
                    tags: aiResponse.tags,
                },
            };

            // 保存到store
            addChapter(newChapter);
            recordModification(chapterId, suggestion);
            updateWorldState(stateUpdates);

            // 跳转至新章节
            router.push(`/read/${chapterId + 1}`);

        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || '生成失败，请重试');
        } finally {
            setIsGenerating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">加载中...</div>
            </div>
        );
    }

    if (error || !currentChapter) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="text-red-400 text-xl mb-4">{error || '章节不存在'}</div>
                    <Link
                        href="/"
                        className="text-purple-400 hover:text-purple-300 underline"
                    >
                        返回首页
                    </Link>
                </div>
            </div>
        );
    }

    const worldState = currentChapter.worldStateSnapshot;
    const hasNextChapter = archive && archive.chapters.length > chapterId;
    const isLastChapter = !hasNextChapter;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* 顶部导航 */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        返回首页
                    </Link>

                    <div className="text-gray-400 text-sm">
                        归墟轮回 · 第 {chapterId} 章
                    </div>

                    <Link
                        href="/compare"
                        className="text-purple-400 hover:text-purple-300 transition-colors text-sm"
                    >
                        查看结局对比
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 主内容区 */}
                    <div className="lg:col-span-2 space-y-8">
                        <ChapterReader
                            title={currentChapter.title}
                            content={currentChapter.content}
                            chapterNumber={chapterId}
                        />

                        {/* 章节间导航 */}
                        <div className="flex items-center justify-between border-t border-white/10 pt-6">
                            {chapterId > 1 ? (
                                <Link
                                    href={`/read/${chapterId - 1}`}
                                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    上一章
                                </Link>
                            ) : (
                                <div />
                            )}

                            {hasNextChapter && (
                                <Link
                                    href={`/read/${chapterId + 1}`}
                                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    下一章
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            )}
                        </div>

                        {/* 修改建议表单 - 仅在最后一章显示 */}
                        {isLastChapter && (
                            <div className="mt-8">
                                {needsApiConfig && (
                                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                        <p className="text-red-200 text-sm mb-2">
                                            <strong>未配置 AI API Key</strong>
                                        </p>
                                        <p className="text-red-200/80 text-sm">
                                            请在项目根目录创建 <code className="bg-black/30 px-2 py-1 rounded">.env.local</code> 文件，
                                            并参考 <code className="bg-black/30 px-2 py-1 rounded">.env.example</code> 填入 OpenAI 或 Anthropic 的 API Key。
                                        </p>
                                    </div>
                                )}

                                {error && !needsApiConfig && (
                                    <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                                        <p className="text-red-200 text-sm">
                                            <strong>生成失败</strong>：{error}
                                        </p>
                                    </div>
                                )}

                                <ModifySuggestionForm
                                    onSubmit={handleGenerateNext}
                                    isGenerating={isGenerating}
                                    chapterNumber={chapterId}
                                />
                            </div>
                        )}
                    </div>

                    {/* 侧边栏 */}
                    <div className="lg:col-span-1">
                        <WorldStatePanel worldState={worldState} />
                    </div>
                </div>
            </div>
        </div>
    );
}
