'use client';

import { useEffect, useState, useRef } from 'react';
import { useStoryStore, getInitialWorldState, getCurrentWorldState } from '@/lib/store';
import { updateWorldStateFromResponse } from '@/lib/ai/prompts';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { Chapter, AIGenerationResponse, WorldState } from '@/lib/types';
import Typewriter from '@/components/TypewriterText';

export default function StoryPage() {
    const {
        archive,
        addChapter,
        recordModification,
        updateWorldState,
        initializeStory,
        cachedStory,
        cacheNextIndex,
        setCachedStory,
        getNextCachedChapter,
        clearCache,
        originalStory,
        isOriginalStoryLoaded,
        setOriginalStory,
        updateChapterContent,
        storyMode,
        customStoryData,
        rewindToChapter,
        setStoryComment
    } = useStoryStore();

    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingFull, setIsGeneratingFull] = useState(false);
    const [isGeneratingOriginal, setIsGeneratingOriginal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState('');
    const [showSuggestionInput, setShowSuggestionInput] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [unchangedFateMessage, setUnchangedFateMessage] = useState(false);
    const [latestChapterId, setLatestChapterId] = useState<number | null>(null);
    const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [rewindConfirmId, setRewindConfirmId] = useState<number | null>(null);
    const hasInitialized = useRef(false);
    const hasStartedOriginalGeneration = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // 获取当前故事模式
    const currentStoryMode = useStoryStore.getState().storyMode;

    // 初始化故事
    useEffect(() => {
        const loadInitialContent = async () => {
            // 防止重复初始化
            if (hasInitialized.current) {
                setIsLoading(false);
                return;
            }

            const state = useStoryStore.getState();

            // 生成模式：章节已由首页初始化，直接触发打字机效果
            if (state.storyMode === 'generated' && state.archive && state.archive.chapters.length > 0) {
                hasInitialized.current = true;
                setLatestChapterId(1);
                setIsLoading(false);
                return;
            }

            // 预设模式：加载初始章节
            if (!state.archive || state.archive.chapters.length === 0) {
                hasInitialized.current = true;
                initializeStory();

                try {
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
                            tags: []
                        }
                    }));

                    initialChapters.forEach(chapter => addChapter(chapter));
                    // 触发第一章的打字机效果
                    if (initialChapters.length > 0) {
                        setLatestChapterId(1);
                    }
                } catch (err) {
                    console.error('Failed to load initial chapters:', err);
                    setError('加载初始内容失败');
                }
            } else {
                hasInitialized.current = true;
            }
            setIsLoading(false);
        };

        loadInitialContent();
    }, []);

    // 后台预生成原定剧情
    useEffect(() => {
        const generateOriginalStory = async () => {
            // 检查是否需要生成原定剧情
            if (isOriginalStoryLoaded || hasStartedOriginalGeneration.current || !archive || archive.chapters.length < 2) {
                return;
            }

            hasStartedOriginalGeneration.current = true;
            setIsGeneratingOriginal(true);

            try {
                // 关键修改：生成原定剧情时，必须使用纯净的种子章节（originalStory）作为上下文
                // 而绝不能使用可能已被用户修改的 archive.chapters
                // 这样才能保证"原定剧情"是基于初始设定推演的，与用户的第一次阅读体验一致
                const storeState = useStoryStore.getState();
                const seedChapters = storeState.originalStory.length > 0
                    ? storeState.originalStory
                    : archive.chapters; // 兼容旧存档

                const lastSeedChapter = seedChapters[seedChapters.length - 1];
                const seedWorldState = lastSeedChapter.worldStateSnapshot || getCurrentWorldState();

                const res = await fetch('/api/generate-full', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        worldState: seedWorldState,
                        previousChapter: lastSeedChapter,
                        userSuggestion: '按正常路线发展，揭露公司真相，国家干预，灵能时代终结', // 保持原有的原定剧情走向prompt
                    }),
                });

                const data = await res.json();

                if (res.ok && data.chapters) {
                    // 获取纯净的种子章节（从 originalStory 中获取，而非 archive）
                    // 此时 originalStory 应该包含初始的第1、2章
                    const seedChapters = useStoryStore.getState().originalStory;
                    const baseChapterId = seedChapters.length;
                    let currentState = seedWorldState;

                    const generatedChapters: Chapter[] = data.chapters.map((parsed: { title: string; content: string; tags: string[] }, index: number) => {
                        const chapterId = baseChapterId + index + 1;
                        const isEnding = parsed.tags.includes('终章');

                        const newState: WorldState = {
                            ...currentState,
                            currentChapter: chapterId,
                            mainPlotStatus: isEnding ? 'completed' : 'active',
                        };
                        currentState = newState;

                        return {
                            id: chapterId,
                            title: parsed.title,
                            content: parsed.content,
                            generatedBy: 'ai',
                            worldStateSnapshot: newState,
                            metadata: {
                                createdAt: new Date(),
                                impactedElements: parsed.tags,
                                tags: parsed.tags,
                            },
                        };
                    });

                    // 完整原定剧情 = 种子章节(来自store的原始快照) + 生成的章节
                    const fullOriginalStory = [...seedChapters, ...generatedChapters];
                    setOriginalStory(fullOriginalStory, data.comment);

                    // 重要修复：将生成的原定剧情也存入缓存，确保用户点击"接受命运/继续阅读"时
                    // 看到的剧情与"原定剧情"完全一致，消除非确定性带来的差异
                    if (generatedChapters.length > 0) {
                        setCachedStory(generatedChapters);
                    }

                    console.log('原定剧情生成完成，共', fullOriginalStory.length, '章');
                } else {
                    console.error('原定剧情生成失败:', data.error);
                }
            } catch (err) {
                console.error('原定剧情生成出错:', err);
            } finally {
                setIsGeneratingOriginal(false);
            }
        };

        generateOriginalStory();
    }, [archive?.chapters.length, isOriginalStoryLoaded]);

    // 单章生成（原有逻辑）
    const handleGenerate = async (userSuggestion: string) => {
        if (!archive || archive.chapters.length === 0) return;

        setIsGenerating(true);
        setError(null);

        try {
            const worldState = getCurrentWorldState();
            const lastChapter = archive.chapters[archive.chapters.length - 1];

            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    worldState,
                    previousChapter: lastChapter,
                    userSuggestion: userSuggestion || '继续发展剧情',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '生成失败');
            }

            const aiResponse = data as AIGenerationResponse;
            const generatedText = aiResponse.rawGeneratedText || aiResponse.content;

            const stateUpdates = updateWorldStateFromResponse(
                worldState,
                generatedText,
                userSuggestion
            );

            const newWorldState: WorldState = { ...worldState, ...stateUpdates, currentChapter: archive.chapters.length + 1 };

            const newChapter: Chapter = {
                id: archive.chapters.length + 1,
                title: aiResponse.chapterTitle,
                content: aiResponse.content,
                generatedBy: 'ai',
                userSuggestion: userSuggestion || undefined,
                worldStateSnapshot: newWorldState,
                metadata: {
                    createdAt: new Date(),
                    impactedElements: aiResponse.tags,
                    tags: aiResponse.tags,
                },
            };

            addChapter(newChapter);
            setLatestChapterId(newChapter.id); // 触发打字机效果
            if (userSuggestion) {
                recordModification(archive.chapters.length, userSuggestion);
            }
            updateWorldState(stateUpdates);
            setSuggestion('');
            setShowSuggestionInput(false);

        } catch (err: any) {
            console.error('Generation error:', err);
            setError(err.message || '生成失败，请重试');
        } finally {
            setIsGenerating(false);
        }
    };

    // 一键生成完整剧情
    const handleGenerateFullStory = async (userSuggestion: string = '') => {
        // 使用 getState 获取最新状态，确保编辑后的内容被正确读取
        const latestState = useStoryStore.getState();
        const currentArchive = latestState.archive;

        if (!currentArchive || currentArchive.chapters.length === 0) return;

        setIsGeneratingFull(true);
        setError(null);

        try {
            const worldState = getCurrentWorldState();
            const lastChapter = currentArchive.chapters[currentArchive.chapters.length - 1];

            const res = await fetch('/api/generate-full', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    worldState,
                    previousChapter: lastChapter,
                    userSuggestion: userSuggestion || '按正常路线发展',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || '生成失败');
            }

            // 将解析后的章节转换为完整的 Chapter 对象
            const baseChapterId = currentArchive.chapters.length;
            let currentState = worldState;

            const fullChapters: Chapter[] = data.chapters.map((parsed: { title: string; content: string; tags: string[] }, index: number) => {
                const chapterId = baseChapterId + index + 1;
                const isEnding = parsed.tags.includes('结局') || parsed.tags.includes('终章');

                const newState: WorldState = {
                    ...currentState,
                    currentChapter: chapterId,
                    mainPlotStatus: isEnding ? 'completed' : 'active',
                };
                currentState = newState;

                return {
                    id: chapterId,
                    title: parsed.title,
                    content: parsed.content,
                    generatedBy: 'ai',
                    userSuggestion: index === 0 ? (userSuggestion || undefined) : undefined,
                    worldStateSnapshot: newState,
                    metadata: {
                        createdAt: new Date(),
                        impactedElements: parsed.tags,
                        tags: parsed.tags,
                    },
                };
            });

            // 自动加载第一段新生成的剧情
            if (fullChapters.length > 0) {
                const firstChapter = fullChapters[0];
                addChapter(firstChapter);
                setLatestChapterId(firstChapter.id); // 触发打字机效果
                updateWorldState(firstChapter.worldStateSnapshot);

                // 将剩余章节存入缓存（跳过已添加的第一章）
                if (fullChapters.length > 1) {
                    setCachedStory(fullChapters.slice(1));
                } else {
                    setCachedStory([]);
                }
            } else {
                setCachedStory([]);
            }

            // 保存故事点评
            if (data.comment) {
                setStoryComment(data.comment);
            }

            setSuggestion('');
            setShowSuggestionInput(false);

        } catch (err: any) {
            console.error('Full story generation error:', err);
            setError(err.message || '生成完整剧情失败，请重试');
        } finally {
            setIsGeneratingFull(false);
        }
    };

    // 继续阅读 - 优先从缓存读取
    const handleContinue = () => {
        const cachedChapter = getNextCachedChapter();
        if (cachedChapter) {
            // 从缓存读取
            addChapter(cachedChapter);
            setLatestChapterId(cachedChapter.id); // 触发打字机效果
            updateWorldState(cachedChapter.worldStateSnapshot);
        } else {
            // 无缓存，调用原有生成
            handleGenerate('');
        }
    };

    // 自定义剧情 - 清除缓存
    const handleCustomSuggestion = (userSuggestion: string) => {
        clearCache(); // 清除已有缓存
        handleGenerate(userSuggestion);
    };

    // 当章节数变化时自动滚动到底部
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [archive?.chapters.length]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-white text-xl">加载中...</div>
            </div>
        );
    }

    const chapters = archive?.chapters || [];
    const currentWorldState = chapters.length > 0 ? chapters[chapters.length - 1].worldStateSnapshot : null;
    const isStoryEnded = currentWorldState?.mainPlotStatus === 'completed' || currentWorldState?.mainPlotStatus === 'broken';
    const hasCache = cachedStory.length > 0 && cacheNextIndex < cachedStory.length;
    const remainingCached = cachedStory.length - cacheNextIndex;

    return (
        <div className="h-screen bg-black flex flex-col">
            {/* 顶部导航 - 固定 */}
            <div className="flex-shrink-0 border-b border-gray-800 bg-black">
                <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        返回首页
                    </Link>

                    <div className="text-white text-lg font-semibold">
                        {archive?.storyTitle || '交互小说'}
                    </div>

                    <div className="text-gray-400 text-sm flex items-center gap-3">
                        <span>第 {chapters.length} 段</span>
                        {hasCache && (
                            <span className="text-green-400 text-xs bg-green-400/10 px-2 py-1 rounded">
                                命运已定: {remainingCached}章
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* 剧情区域 - 可滚动 */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto p-6 pb-4">
                    <div className="space-y-6">
                        {/* 无关输入提示 */}
                        <AnimatePresence>
                            {unchangedFateMessage && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="text-center text-purple-400/70 text-sm py-4 italic"
                                >
                                    因果未曾发生改变，一如既定命运...
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {chapters.map((chapter, index) => {
                                const isLatest = index === chapters.length - 1 && chapter.id === latestChapterId;
                                const isLastChapter = index === chapters.length - 1;
                                const isEditing = editingChapterId === chapter.id;

                                return (
                                    <motion.div
                                        key={chapter.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.3 }}
                                        className="pb-6 mb-6 border-b border-gray-800/50 last:border-0 group"
                                    >
                                        {isEditing ? (
                                            // 编辑模式
                                            <div className="space-y-3">
                                                <textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full bg-gray-900 border border-purple-600 rounded-lg px-4 py-3 text-gray-300 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none text-sm leading-relaxed"
                                                    rows={4}
                                                    autoFocus
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => {
                                                            setEditingChapterId(null);
                                                            setEditContent('');
                                                        }}
                                                        className="px-4 py-2 text-gray-400 hover:text-white text-sm transition-colors"
                                                    >
                                                        取消
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (editContent.trim()) {
                                                                updateChapterContent(chapter.id, editContent.trim());
                                                                recordModification(chapter.id, '手动编辑剧情');
                                                                clearCache();
                                                                setEditingChapterId(null);
                                                                setEditContent('');
                                                                // 编辑后自动生成后续剧情
                                                                handleGenerateFullStory('');
                                                            }
                                                        }}
                                                        disabled={!editContent.trim() || isGeneratingFull}
                                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
                                                    >
                                                        确认并生成后续
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // 阅读模式
                                            <>
                                                <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
                                                    {isLatest ? (
                                                        <Typewriter
                                                            text={chapter.content}
                                                            speed={30}
                                                            onComplete={() => setLatestChapterId(null)}
                                                        />
                                                    ) : (
                                                        <p>{chapter.content}</p>
                                                    )}
                                                </div>
                                                {/* 操作按钮区 - 默认隐藏，hover时显示 */}
                                                <div className="mt-3 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                    {/* 回溯时间线按钮：AI生成的非最新章节、非第一章可回溯 */}
                                                    {chapter.generatedBy === 'ai' && !isLastChapter && !isStoryEnded && index > 0 && (
                                                        rewindConfirmId === chapter.id ? (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                <span className="text-orange-400">确认回溯到此？之后的剧情将被清除</span>
                                                                <button
                                                                    onClick={() => {
                                                                        rewindToChapter(chapter.id);
                                                                        setRewindConfirmId(null);
                                                                        setStoryComment(''); // 清除点评
                                                                    }}
                                                                    className="text-red-400 hover:text-red-300"
                                                                >
                                                                    确认
                                                                </button>
                                                                <button
                                                                    onClick={() => setRewindConfirmId(null)}
                                                                    className="text-gray-500 hover:text-gray-400"
                                                                >
                                                                    取消
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setRewindConfirmId(chapter.id)}
                                                                className="text-orange-400/60 hover:text-orange-400 text-xs transition-colors"
                                                            >
                                                                回溯时间线
                                                            </button>
                                                        )
                                                    )}
                                                    {/* 最新章节显示编辑按钮（仅 AI 生成的章节可编辑）*/}
                                                    {isLastChapter && !isStoryEnded && !isLatest && chapter.generatedBy === 'ai' && (
                                                        <button
                                                            onClick={() => {
                                                                setEditingChapterId(chapter.id);
                                                                setEditContent(chapter.content);
                                                            }}
                                                            className="text-purple-400/60 hover:text-purple-400 text-xs transition-colors"
                                                        >
                                                            编辑此段剧情
                                                        </button>
                                                    )}
                                                </div>
                                                {chapter.userSuggestion && (
                                                    <div className="mt-4 pt-3 border-t border-purple-900/30">
                                                        <span className="text-purple-400 text-xs">干涉因果：</span>
                                                        <span className="text-gray-500 text-xs ml-2">{chapter.userSuggestion}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* 错误提示 */}
                        {error && (
                            <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl">
                                <p className="text-red-300 text-sm">
                                    <strong>生成失败</strong>：{error}
                                </p>
                            </div>
                        )}

                        {/* 生成进度提示 */}
                        {isGeneratingFull && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-6 bg-purple-900/20 border border-purple-800 rounded-xl text-center"
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <svg className="animate-spin h-6 w-6 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-purple-200 text-lg font-semibold">命运之轮正在转动...</span>
                                </div>
                            </motion.div>
                        )}

                        {/* 故事结束提示 */}
                        {isStoryEnded && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center"
                            >
                                <h3 className="text-white font-semibold text-xl mb-4">
                                    {currentWorldState?.mainPlotStatus === 'completed' ? '命运终局' : '因果断裂'}
                                </h3>

                                <p className="text-gray-400 mb-6 text-sm leading-relaxed italic">
                                    {/* 显示故事点评 */}
                                    {archive?.storyComment || '故事已结束，感谢你的阅读。'}
                                </p>

                                {archive && archive.modificationHistory.length > 0 ? (
                                    <>
                                        <p className="text-purple-400 text-sm mb-4">
                                            你曾 {archive.modificationHistory.length} 次干涉因果
                                        </p>
                                        <Link
                                            href="/compare"
                                            className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-8 rounded-xl transition-all"
                                        >
                                            查看命运对比
                                        </Link>
                                    </>
                                ) : (
                                    <p className="text-gray-500 text-sm">
                                        你未曾干涉因果，命运如既定般展开。
                                    </p>
                                )}

                                <div className="mt-6 pt-6 border-t border-gray-800">
                                    <Link
                                        href="/"
                                        className="inline-block bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-6 py-2 rounded-lg text-sm transition-all border border-gray-700"
                                    >
                                        返回首页
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* 交互区域 - 固定底部 */}
            {!isStoryEnded && (
                <div className="flex-shrink-0 border-t border-gray-800 bg-black">
                    <div className="max-w-4xl mx-auto px-6 py-4">
                        {/* 分隔线上方的提示 */}
                        <div className="text-center mb-3">
                            <span className="text-gray-600 text-xs">—— 命运的岔路口 ——</span>
                        </div>

                        {/* 输入框 */}
                        <textarea
                            value={suggestion}
                            onChange={(e) => setSuggestion(e.target.value)}
                            placeholder="在此写下你想要改变的剧情走向..."
                            rows={2}
                            disabled={isGenerating || isGeneratingFull}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 resize-none disabled:opacity-50 text-sm"
                        />

                        {/* 按钮组 */}
                        <div className="flex gap-3 mt-3">
                            {/* 干涉因果按钮 */}
                            <button
                                onClick={() => {
                                    if (suggestion.trim()) {
                                        clearCache();
                                        recordModification(chapters.length, suggestion);
                                        handleGenerateFullStory(suggestion);
                                        setSuggestion('');
                                    }
                                }}
                                disabled={isGenerating || isGeneratingFull || !suggestion.trim()}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        改写中...
                                    </span>
                                ) : (
                                    '干涉因果'
                                )}
                            </button>

                            {/* 接受命运按钮 */}
                            <button
                                onClick={() => {
                                    if (hasCache) {
                                        handleContinue();
                                    } else {
                                        handleGenerateFullStory('');
                                    }
                                }}
                                disabled={isGenerating || isGeneratingFull}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-gray-700"
                            >
                                {isGeneratingFull ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        命运展开中...
                                    </span>
                                ) : (
                                    hasCache ? '接受命运' : '开始你的命运'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



