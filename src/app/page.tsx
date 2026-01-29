'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStoryStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const resetStory = useStoryStore((state) => state.resetStory);
  const initializeStory = useStoryStore((state) => state.initializeStory);
  const initializeGeneratedStory = useStoryStore((state) => state.initializeGeneratedStory);

  const [hasProgress, setHasProgress] = useState(false);
  const [chapterCount, setChapterCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
    router.push('/story');
  }, [resetStory, router]);

  // 生成新故事
  const handleGenerateNewStory = useCallback(async () => {
    setIsGenerating(true);
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
      setIsGenerating(false);
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
            onClick={!isGenerating ? handleGenerateNewStory : undefined}
            className={`bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 border transition-all group ${isGenerating
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
            {isGenerating ? (
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
            onClick={!isGenerating ? handlePresetStory : undefined}
            className={`bg-gray-900/50 backdrop-blur-lg rounded-2xl p-8 border border-purple-900/50 hover:border-purple-600 transition-all group ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
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
                    if (!isGenerating) handleStartOver();
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
