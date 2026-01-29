'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';

interface ChapterReaderProps {
    title: string;
    content: string;
    chapterNumber: number;
}

export default function ChapterReader({ title, content, chapterNumber }: ChapterReaderProps) {
    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto px-6 py-8"
        >
            {/* 章节标题 */}
            <div className="mb-8">
                <div className="text-sm text-purple-400 font-medium mb-2">
                    第 {chapterNumber} 章
                </div>
                <h1 className="text-4xl font-bold text-white mb-4">
                    {title}
                </h1>
                <div className="h-1 w-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            </div>

            {/* 章节内容 */}
            <div className="prose prose-invert prose-lg max-w-none">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        p: ({ children }) => (
                            <p className="mb-6 text-gray-200 leading-relaxed text-lg">
                                {children}
                            </p>
                        ),
                        h2: ({ children }) => (
                            <h2 className="text-2xl font-bold text-white mt-12 mb-6">
                                {children}
                            </h2>
                        ),
                        h3: ({ children }) => (
                            <h3 className="text-xl font-semibold text-purple-300 mt-8 mb-4">
                                {children}
                            </h3>
                        ),
                        strong: ({ children }) => (
                            <strong className="text-purple-300 font-semibold">
                                {children}
                            </strong>
                        ),
                        em: ({ children }) => (
                            <em className="text-pink-300">
                                {children}
                            </em>
                        ),
                        hr: () => (
                            <hr className="my-8 border-white/20" />
                        ),
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </motion.article>
    );
}
