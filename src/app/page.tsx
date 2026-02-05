'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStoryStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

import { STORY_GENRES } from '@/lib/ai/prompts';

export default function HomePage() {
  const router = useRouter();
  const resetStory = useStoryStore((state) => state.resetStory);
  const initializeStory = useStoryStore((state) => state.initializeStory);
  const initializeGeneratedStory = useStoryStore((state) => state.initializeGeneratedStory);

  const [hasProgress, setHasProgress] = useState(false);
  const [chapterCount, setChapterCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showTestGenreSelection, setShowTestGenreSelection] = useState(false);
  const [generatingType, setGeneratingType] = useState<'normal' | 'test' | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    const archive = useStoryStore.getState().archive;
    setHasProgress(archive !== null && archive.chapters.length > 0);
    setChapterCount(archive?.chapters.length || 0);
    setIsHydrated(true);
  }, []);

  // 开始或继续体验预设故事（确保重置为预设模式）
  const handlePresetStory = useCallback(() => {
    const state = useStoryStore.getState();
    // 如果当前是生成模式或没有进度，需要重置为预设模式
    if (state.storyMode !== 'preset' || !state.archive || state.archive.chapters.length === 0) {
      resetStory(); // 重置会将 storyMode 设为 preset
    }
    router.push('/story');
  }, [resetStory, router]);

  const handleStartOver = useCallback(() => {
    if (hasProgress) {
      setShowConfirm(true);
    } else {
      resetStory();
      router.push('/story');
    }
  }, [hasProgress, resetStory, router]);

  const confirmReset = useCallback(() => {
    resetStory();
    setShowConfirm(false);
    showTestGenreSelection && setShowTestGenreSelection(false); // Close other modals if open (though unlikely)
    router.push('/story');
  }, [resetStory, router, showTestGenreSelection]);

  // 生成新故事
  const handleGenerateNewStory = useCallback(async () => {
    setGeneratingType('normal');
    setGenerateError(null);

    try {
      const res = await fetch('/api/generate-new-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '生成失败');
      }

      // 初始化生成的故事
      initializeGeneratedStory(data.story, data.story.initialChapters);
      router.push('/story');
    } catch (err: any) {
      console.error('Generate new story error:', err);
      setGenerateError(err.message || '生成新故事失败，请重试');
    } finally {
      setGeneratingType(null);
    }
  }, [initializeGeneratedStory, router]);

  // 生成新故事（测试版）- 支持指定类型
  const handleGenerateNewStoryTest = useCallback(async (genre?: string) => {
    setGeneratingType('test');
    setGenerateError(null);
    setShowTestGenreSelection(false);

    try {
      const res = await fetch('/api/generate-new-story-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '生成失败');
      }

      // 初始化生成的故事（带测试标记）
      initializeGeneratedStory(data.story, data.story.initialChapters);
      router.push('/story');
    } catch (err: any) {
      console.error('Generate new story test error:', err);
      setGenerateError(err.message || '生成测试故事失败，请重试');
    } finally {
      setGeneratingType(null);
    }
  }, [initializeGeneratedStory, router]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* 自定义确认弹窗 */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white text-xl font-semibold mb-4">确认重置</h3>
              <p className="text-gray-400 mb-6">
                确定要重置所有剧情进度吗？此操作不可恢复。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-lg transition-all border border-gray-700"
                >
                  取消
                </button>
                <button
                  onClick={confirmReset}
                  className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white py-3 px-4 rounded-lg transition-all"
                >
                  确认重置
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 故事类型选择弹窗 */}
      <AnimatePresence>
        {showTestGenreSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTestGenreSelection(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-gray-900 border border-blue-900/50 rounded-2xl p-6 max-w-2xl w-full shadow-2xl shadow-blue-900/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-white text-2xl font-bold flex items-center gap-3">
                  <span className="bg-blue-600 w-1 h-6 rounded-full"></span>
                  选择故事类型
                </h3>
                <button
                  onClick={() => setShowTestGenreSelection(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {/* 随机选项 */}
                <button
                  onClick={() => handleGenerateNewStoryTest()}
                  className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 hover:border-blue-400 p-4 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all hover:bg-blue-900/60"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">🎲</span>
                  <span className="text-blue-100 font-medium">随机类型</span>
                </button>

                {STORY_GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => handleGenerateNewStoryTest(genre)}
                    className="bg-gray-800/50 border border-gray-700 hover:border-blue-500/50 p-4 rounded-xl flex flex-col items-center justify-center gap-2 group transition-all hover:bg-gray-800"
                  >
                    <span className="text-gray-300 font-medium group-hover:text-blue-300 transition-colors">{genre}</span>
                  </button>
                ))}
              </div>

              <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-900/30 text-sm text-blue-200/80">
                <p>💡 选择一个类型，AI 将为您生成符合该题材风格的专属故事开篇。</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl w-full"
      >
        {/* 主标题区域 */}
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mb-4"
          >
            生成式交互小说
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-gray-500 text-lg"
          >
            干涉因果，重塑命运
          </motion.p>
        </div>

        {/* 错误提示 */}
        {generateError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-300 text-sm text-center"
          >
            {generateError}
          </motion.div>
        )}

        {/* 两个主要按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="grid md:grid-cols-2 gap-6 mb-8"
        >
          {/* 开始新的故事 */}
          <div
            onClick={!generatingType ? handleGenerateNewStory : undefined}
            className={`bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 border transition-all group ${generatingType === 'normal'
              ? 'border-purple-600 cursor-wait'
              : 'border-gray-800 hover:border-purple-600 cursor-pointer'
              }`}
          >
            <div className="text-purple-400 text-3xl mb-4"></div>
            <h2 className="text-white text-2xl font-semibold mb-3 group-hover:text-purple-300 transition-colors">
              开始新的故事
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              生成全新的故事世界，体验独一无二的剧情
            </p>
            {generatingType === 'normal' ? (
              <span className="inline-flex items-center gap-2 text-purple-400 text-xs bg-purple-900/30 px-3 py-1 rounded-full">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在创造新世界...
              </span>
            ) : (
              <span className="inline-block text-purple-400 text-xs bg-purple-900/30 px-3 py-1 rounded-full">
                点击开始
              </span>
            )}
          </div>

          {/* 体验预设故事 */}
          <div
            onClick={!generatingType ? handlePresetStory : undefined}
            className={`bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 border border-purple-900/50 hover:border-purple-600 transition-all group ${generatingType ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
          >
            <div className="text-purple-400 text-3xl mb-4"></div>
            <h2 className="text-white text-2xl font-semibold mb-3 group-hover:text-purple-300 transition-colors">
              体验预设故事
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              《归墟轮回》— 2052年灵能时代，科幻 × 灵异 × 反乌托邦
            </p>
            {hasProgress ? (
              <div className="flex gap-2">
                <span className="inline-block text-purple-400 text-xs bg-purple-900/30 px-3 py-1 rounded-full">
                  已读至第 {chapterCount} 段
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!generatingType) handleStartOver();
                  }}
                  className="text-gray-500 hover:text-white text-xs transition-colors"
                >
                  从头开始
                </button>
              </div>
            ) : (
              <span className="inline-block text-purple-400 text-xs bg-purple-900/30 px-3 py-1 rounded-full">
                点击开始
              </span>
            )}
          </div>

          {/* 开始新的故事（测试版） */}
          <div
            onClick={!generatingType ? () => setShowTestGenreSelection(true) : undefined}
            className={`md:col-span-2 bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 border transition-all group ${generatingType === 'test'
              ? 'border-blue-600 cursor-wait'
              : 'border-gray-800 hover:border-blue-600 cursor-pointer'
              }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="text-blue-400 text-3xl"></div>
              <div className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded border border-blue-800">
                TEST
              </div>
            </div>
            <h2 className="text-white text-2xl font-semibold mb-3 group-hover:text-blue-300 transition-colors">
              开始新的故事 (测试)
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              体验"一行一章"高能模式：强节奏、双结局、随机因果
            </p>
            {generatingType === 'test' ? (
              <span className="inline-flex items-center gap-2 text-blue-400 text-xs bg-blue-900/30 px-3 py-1 rounded-full">
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在创造...
              </span>
            ) : (
              <span className="inline-block text-blue-400 text-xs bg-blue-900/30 px-3 py-1 rounded-full">
                点击测试
              </span>
            )}
          </div>
        </motion.div>

        {/* 底部信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center"
        >
          <p className="text-gray-600 text-sm">
            干涉因果，重塑命运
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Force refresh
