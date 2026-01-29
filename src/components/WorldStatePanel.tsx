'use client';

import { WorldState } from '@/lib/types';
import { motion } from 'framer-motion';

interface WorldStatePanelProps {
    worldState: WorldState;
}

export default function WorldStatePanel({ worldState }: WorldStatePanelProps) {
    const getMainPlotStatusText = () => {
        switch (worldState.mainPlotStatus) {
            case 'active':
                return { text: '进行中', color: 'text-green-400' };
            case 'broken':
                return { text: '已断裂', color: 'text-red-400' };
            case 'completed':
                return { text: '✓ 已完成', color: 'text-blue-400' };
            default:
                return { text: '未知', color: 'text-gray-400' };
        }
    };

    const plotStatus = getMainPlotStatusText();

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 sticky top-6"
        >
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                <span className="text-purple-400"></span>
                世界状态
            </h3>

            {/* 主角状态 */}
            <div className="mb-6">
                <div className="text-gray-400 text-sm mb-2">主角</div>
                <div className="space-y-1">
                    <div className="text-white font-medium">
                        {worldState.protagonistStatus.name || '未命名主角'}
                    </div>
                    <div className="text-gray-300 text-sm">
                        {worldState.protagonistStatus.occupation}
                    </div>
                    <div className={`text-sm font-medium ${worldState.protagonistStatus.alive ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {worldState.protagonistStatus.alive ? '● 存活' : '● 已退场'}
                    </div>
                </div>
            </div>

            {/* 主线状态 */}
            <div className="mb-6">
                <div className="text-gray-400 text-sm mb-2">主线</div>
                <div className={`font-medium ${plotStatus.color}`}>
                    {plotStatus.text}
                </div>
            </div>

            {/* 反派进度 */}
            <div className="mb-6">
                <div className="text-gray-400 text-sm mb-2">反派进度</div>
                <div className="text-gray-200 text-sm">
                    {worldState.dynamicElements.villainProgress}
                </div>
            </div>

            {/* 当前章节 */}
            <div>
                <div className="text-gray-400 text-sm mb-2">章节进度</div>
                <div className="text-white font-medium">
                    第 {worldState.currentChapter} 章
                </div>
            </div>

            {/* 时间线缩略 */}
            {worldState.timeline && worldState.timeline.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="text-gray-400 text-sm mb-3">事件时间线</div>
                    <div className="space-y-2">
                        {worldState.timeline.slice(-3).map((event, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
                                <div className="text-gray-300 text-xs">
                                    <span className="text-purple-300">Ch.{event.chapter}</span>{' '}
                                    {event.event}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
