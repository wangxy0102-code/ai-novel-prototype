'use client';

import { useStoryStore } from '@/lib/store';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export default function ComparePage() {
    const { archive, originalStory, isOriginalStoryLoaded, originalStoryComment } = useStoryStore();

    const hasCustomStory = archive && archive.chapters.length > 2;
    const currentWorldState = hasCustomStory
        ? archive.chapters[archive.chapters.length - 1].worldStateSnapshot
        : null;
    const isStoryEnded = currentWorldState?.mainPlotStatus === 'completed' || currentWorldState?.mainPlotStatus === 'broken';

    // 获取原定剧情的最终状态
    const originalEndState = originalStory.length > 0
        ? originalStory[originalStory.length - 1].worldStateSnapshot
        : null;

    return (
        <div className="min-h-screen bg-black">
            {/* 顶部导航 */}
            <div className="border-b border-gray-800 bg-black/80 backdrop-blur-lg sticky top-0 z-50">
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

                    <div className="text-white text-lg font-semibold">
                        命运对比
                    </div>

                    <div className="w-20" />
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {!hasCustomStory ? (
                    <div className="text-center py-20">
                        <div className="text-gray-400 text-xl mb-4">
                            你还没有开始自定义剧情
                        </div>
                        <Link
                            href="/story"
                            className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300"
                        >
                            开始阅读
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* 标题 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-12"
                        >
                            <h1 className="text-4xl font-bold text-white mb-4">
                                你的故事 vs 原定命运
                            </h1>
                            <p className="text-gray-400">
                                观察你的选择如何改变了世界的走向
                            </p>
                        </motion.div>

                        {/* 对比区域 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                            {/* 原定剧情 */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-3xl">📖</span>
                                    <h2 className="text-2xl font-bold text-white">原定剧情</h2>
                                    {!isOriginalStoryLoaded && (
                                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded animate-pulse">
                                            生成中...
                                        </span>
                                    )}
                                </div>

                                {isOriginalStoryLoaded && originalStory.length > 0 ? (
                                    <>
                                        {/* 原定剧情总结 */}
                                        {originalStory.length > 0 && (
                                            <div className="mb-6 p-4 bg-green-900/20 border border-green-500/20 rounded-xl">
                                                <p className="text-gray-100 text-sm font-medium leading-relaxed">
                                                    {originalStoryComment || originalStory[originalStory.length - 1]?.content || ''}
                                                </p>
                                            </div>
                                        )}
                                        {/* 原定剧情章节列表 */}
                                        <div className="space-y-3 max-h-96 overflow-y-auto mb-6 pr-2">
                                            {originalStory.map((chapter, index) => (
                                                <div
                                                    key={chapter.id}
                                                    className="text-sm text-gray-300 pb-3 mb-3 border-b border-gray-800 last:border-0 last:mb-0 last:pb-0"
                                                >
                                                    <div className="text-purple-400 text-xs mb-1">
                                                        第 {index + 1} 段
                                                    </div>
                                                    <ReactMarkdown>{chapter.content}</ReactMarkdown>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 原定剧情状态 */}
                                        <div className="pt-4 border-t border-gray-800 space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-400">总章节数</span>
                                                <span className="text-green-400 font-medium">{originalStory.length} 章</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-400">主线状态</span>
                                                <span className="text-green-400 font-medium">完成</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-gray-400 text-center py-12">
                                        <div className="animate-spin h-8 w-8 border-2 border-purple-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                                        <p>正在后台生成原定剧情...</p>
                                        <p className="text-sm mt-2">这可能需要一些时间</p>
                                    </div>
                                )}
                            </motion.div>

                            {/* 你的剧情 */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-gray-900 rounded-2xl p-6 border border-purple-900">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className="text-3xl"></span>
                                    <h2 className="text-2xl font-bold text-white">你的剧情</h2>
                                </div>

                                {/* 用户剧情总结 */}
                                {archive.chapters.length > 0 && (
                                    <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/20 rounded-xl">
                                        <p className="text-gray-100 text-sm font-medium leading-relaxed">
                                            {archive.storyComment || archive.chapters[archive.chapters.length - 1]?.content || ''}
                                        </p>
                                    </div>
                                )}

                                {/* 用户剧情章节列表 */}
                                <div className="space-y-3 max-h-96 overflow-y-auto mb-6 pr-2">
                                    {archive.chapters.map((chapter, index) => (
                                        <div
                                            key={chapter.id}
                                            className={`text-sm text-gray-300 pb-3 mb-3 border-b border-gray-800 last:border-0 last:mb-0 last:pb-0 ${chapter.userSuggestion
                                                ? 'bg-purple-500/5 p-3 rounded-lg border-purple-500/10' // 如果是修改过的章节，保留一点微弱背景以示区别
                                                : ''
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-purple-400 text-xs">
                                                    第 {index + 1} 段
                                                </span>
                                                {chapter.userSuggestion && (
                                                    <span className="text-xs bg-purple-500/30 text-purple-300 px-1 rounded">
                                                        已修改
                                                    </span>
                                                )}
                                            </div>
                                            <ReactMarkdown>{chapter.content}</ReactMarkdown>
                                            {chapter.userSuggestion && (
                                                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-400">
                                                    你的建议: {chapter.userSuggestion}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* 用户剧情状态 */}
                                <div className="pt-4 border-t border-white/10 space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">总章节数</span>
                                        <span className="text-purple-400 font-medium">{archive.chapters.length} 章</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">主线状态</span>
                                        <span className={`font-medium ${currentWorldState?.mainPlotStatus === 'active' ? 'text-yellow-400' :
                                            currentWorldState?.mainPlotStatus === 'broken' ? 'text-red-400' :
                                                'text-green-400'
                                            }`}>
                                            {currentWorldState?.mainPlotStatus === 'active' ? '进行中' :
                                                currentWorldState?.mainPlotStatus === 'broken' ? '已断裂' :
                                                    '已完成'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">修改次数</span>
                                        <span className="text-pink-400 font-medium">
                                            {archive.modificationHistory.length} 次
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* 关键抉择点 */}
                        {archive.modificationHistory.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="bg-gray-900 rounded-2xl p-8 border border-gray-800 mb-12"
                            >
                                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="text-purple-400"></span>
                                    干涉因果记录
                                </h3>

                                <div className="space-y-4">
                                    {archive.modificationHistory.map((modification, index) => {
                                        const chapter = archive.chapters[modification.chapterNum];
                                        return (
                                            <div
                                                key={index}
                                                className="flex gap-4 pb-4 border-b border-gray-800 last:border-0"
                                            >
                                                <div className="flex-shrink-0 w-20 text-purple-400 font-medium text-sm">
                                                    第{modification.chapterNum}章后
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-white mb-2">{modification.suggestion}</div>
                                                    {chapter?.metadata.tags && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {chapter.metadata.tags.map((tag, i) => (
                                                                <span
                                                                    key={i}
                                                                    className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded"
                                                                >
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* 操作按钮 */}
                        <div className="text-center space-y-4">
                            {!isStoryEnded && (
                                <Link
                                    href="/story"
                                    className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-12 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/50 text-lg"
                                >
                                    继续阅读你的故事
                                </Link>
                            )}
                            {isStoryEnded && (
                                <div className="text-green-400 text-lg font-semibold mb-4">
                                    🎉 你的故事已完结！
                                </div>
                            )}
                            <div>
                                <Link
                                    href="/"
                                    className="inline-block text-gray-400 hover:text-white transition-colors py-2 px-6"
                                >
                                    返回首页
                                </Link>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
