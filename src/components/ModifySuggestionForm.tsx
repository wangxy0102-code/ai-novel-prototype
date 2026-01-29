'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModifySuggestionFormProps {
    onSubmit: (suggestion: string) => void;
    isGenerating: boolean;
    chapterNumber: number;
}

export default function ModifySuggestionForm({
    onSubmit,
    isGenerating,
    chapterNumber
}: ModifySuggestionFormProps) {
    const [suggestion, setSuggestion] = useState('');
    const [showExamples, setShowExamples] = useState(false);

    const examples = [
        '让主角拒绝公司的要求，选择独自调查真相',
        '让林雨背叛主角，将他出卖给公司高层',
        '让主角在这次任务中牺牲，切换至其他角色视角',
        '让反派提前发现主角的真实意图',
        '让民间觉醒者联盟介入，三方博弈',
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (suggestion.trim() && !isGenerating) {
            onSubmit(suggestion.trim());
        }
    };

    const handleExampleClick = (example: string) => {
        setSuggestion(example);
        setShowExamples(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                    <span className="text-2xl">💭</span>
                    第 {chapterNumber} 章之后，你希望如何改变剧情？
                </h3>
                <button
                    onClick={() => setShowExamples(!showExamples)}
                    className="text-purple-300 hover:text-purple-200 text-sm transition-colors"
                >
                    {showExamples ? '隐藏示例' : '查看示例'}
                </button>
            </div>

            <AnimatePresence>
                {showExamples && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 space-y-2"
                    >
                        <div className="text-gray-400 text-sm mb-2">点击填入示例建议：</div>
                        {examples.map((example, index) => (
                            <button
                                key={index}
                                onClick={() => handleExampleClick(example)}
                                className="w-full text-left px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 text-sm transition-all border border-white/10 hover:border-purple-400/50"
                            >
                                {example}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit}>
                <textarea
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder='例如："让配角背叛，主角孤身赴死"&#10;&#10;无任何限制 — 主角死亡、主线崩坏、反派获胜，一切皆可。'
                    rows={4}
                    disabled={isGenerating}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                />

                <div className="flex items-center justify-between mt-4">
                    <div className="text-gray-400 text-sm">
                        {isGenerating ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                AI 正在推演中...
                            </span>
                        ) : (
                            <span>提交后 AI 将基于你的建议生成下一章</span>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={!suggestion.trim() || isGenerating}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-purple-500/50 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                生成中
                            </>
                        ) : (
                            <>
                                🎲 提交建议并生成下一章
                            </>
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-200 text-sm">
                    <strong>提示</strong>：本原型暂无回溯功能。提交建议后将立即生成新章节，无法撤销。
                </p>
            </div>
        </motion.div>
    );
}
