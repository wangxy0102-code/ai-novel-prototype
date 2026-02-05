import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Chapter, WorldState, StoryArchive } from './types';
import initialStateData from '../../seed-content/initial-state.json';
import dynamicElementsData from '../../seed-content/dynamic-elements.json';

interface StoryStore {
    // 当前故事档案
    archive: StoryArchive | null;

    // 故事模式：预设故事或生成故事
    storyMode: 'preset' | 'generated';

    // 生成故事的自定义数据
    customStoryData: {
        title: string;
        genre: string;
        description: string;
        worldRules: string[];
        protagonist: { name: string; occupation: string; powers: string[] };
        antagonist: { name: string; goal: string };
        isTestMode?: boolean; // 新增：标记是否为测试模式
    } | null;

    // 预生成的完整剧情缓存（用于用户自定义剧情预生成）
    cachedStory: Chapter[];
    cacheNextIndex: number;

    // 原定剧情（故事开始时自动生成，用于最终对比）
    originalStory: Chapter[];
    isOriginalStoryLoaded: boolean;

    // 初始化新故事
    initializeStory: () => void;

    // 初始化生成的故事
    initializeGeneratedStory: (storyData: StoryStore['customStoryData'], chapters: string[]) => void;

    // 添加章节
    addChapter: (chapter: Chapter) => void;

    // 更新章节内容
    updateChapterContent: (chapterId: number, newContent: string) => void;

    // 记录修改建议
    recordModification: (chapterNum: number, suggestion: string) => void;

    // 更新世界状态
    updateWorldState: (newState: Partial<WorldState>) => void;

    // 导出故事
    exportStory: () => string;

    // 导入故事
    importStory: (data: string) => void;

    // 重置故事
    resetStory: () => void;

    // 缓存相关方法
    setCachedStory: (chapters: Chapter[]) => void;
    getNextCachedChapter: () => Chapter | null;
    clearCache: () => void;

    // 原定剧情相关方法
    setOriginalStory: (chapters: Chapter[], comment?: string) => void;
    originalStoryComment?: string;

    // 回溯时间线：清除指定章节之后的所有内容
    rewindToChapter: (chapterId: number) => void;

    // 设置故事点评
    // 设置故事点评
    setStoryComment: (comment: string) => void;

    // 命运对比总结
    fateComparisonSummary?: string;
    setFateComparisonSummary: (summary: string) => void;
}

// 从种子内容加载初始世界状态
const createInitialWorldState = (): WorldState => {
    const data = initialStateData as any;
    return {
        rules: data.worldState.rules,
        currentChapter: data.worldState.currentChapter,
        protagonistStatus: {
            ...data.worldState.protagonistStatus,
        },
        mainPlotStatus: data.worldState.mainPlotStatus,
        dynamicElements: {
            villainProgress: data.worldState.dynamicElements.villainProgress,
            neutralForces: data.worldState.dynamicElements.neutralForces,
            naturalEvents: data.worldState.dynamicElements.naturalEvents,
        },
        timeline: data.worldState.timeline,
    };
};

export const useStoryStore = create<StoryStore>()(
    persist(
        (set, get) => ({
            archive: null,
            storyMode: 'preset' as const,
            customStoryData: null,
            cachedStory: [],
            cacheNextIndex: 0,
            originalStory: [],
            isOriginalStoryLoaded: false,
            fateComparisonSummary: undefined,

            initializeStory: () => {
                const newArchive: StoryArchive = {
                    id: `story-${Date.now()}`,
                    storyTitle: '归墟轮回',
                    createdAt: new Date(),
                    chapters: [],
                    modificationHistory: [],
                    endings: {
                        original: initialStateData.originalEnding.summary,
                    },
                };
                set({
                    archive: newArchive,
                    storyMode: 'preset',
                    customStoryData: null,
                    cachedStory: [],
                    cacheNextIndex: 0,
                    originalStory: [],
                    isOriginalStoryLoaded: false,
                    fateComparisonSummary: undefined,
                });
            },

            initializeGeneratedStory: (storyData: StoryStore['customStoryData'], chapters: string[]) => {
                const initialWorldState = createInitialWorldState();
                // 使用生成故事的世界规则替换预设规则
                if (storyData) {
                    initialWorldState.rules = storyData.worldRules;
                    initialWorldState.protagonistStatus.occupation = storyData.protagonist.occupation;
                    initialWorldState.protagonistStatus.power = storyData.protagonist.powers;
                }

                const newArchive: StoryArchive = {
                    id: `generated-story-${Date.now()}`,
                    storyTitle: storyData?.title || '交互小说',
                    createdAt: new Date(),
                    chapters: chapters.map((content, index) => ({
                        id: index + 1,
                        title: `第 ${index + 1} 章`,
                        content,
                        generatedBy: 'original' as const,
                        worldStateSnapshot: {
                            ...initialWorldState,
                            currentChapter: index + 1,
                        },
                        metadata: {
                            createdAt: new Date(),
                            impactedElements: [],
                            tags: [],
                        },
                    })),
                    modificationHistory: [],
                    endings: {
                        original: storyData?.description || '未知结局',
                    },
                };
                // 立即将初始章节作为原定剧情的种子保存
                // 这样即使后续用户修改了 archive 中的章节，原定剧情的根基也是纯净的初始版本
                const seedOriginalChapters: Chapter[] = chapters.map((content, index) => ({
                    id: index + 1,
                    title: `第 ${index + 1} 章`,
                    content,
                    generatedBy: 'original' as const,
                    worldStateSnapshot: {
                        ...initialWorldState,
                        currentChapter: index + 1,
                    },
                    metadata: {
                        createdAt: new Date(),
                        impactedElements: [],
                        tags: [],
                    },
                }));

                set({
                    archive: newArchive,
                    storyMode: 'generated',
                    customStoryData: storyData,
                    cachedStory: [],
                    cacheNextIndex: 0,
                    originalStory: seedOriginalChapters,
                    isOriginalStoryLoaded: false, // 仍需后续生成完整剧情
                    fateComparisonSummary: undefined,
                });
            },

            addChapter: (chapter: Chapter) => {
                set((state: StoryStore) => {
                    if (!state.archive) return state;

                    // 检查是否已存在相同ID的章节，避免重复
                    const existingIds = new Set(state.archive.chapters.map(c => c.id));
                    if (existingIds.has(chapter.id)) {
                        console.warn(`Chapter ${chapter.id} already exists, skipping duplicate`);
                        return state;
                    }

                    return {
                        archive: {
                            ...state.archive,
                            chapters: [...state.archive.chapters, chapter],
                        },
                    };
                });
            },

            updateChapterContent: (chapterId: number, newContent: string) => {
                set((state: StoryStore) => {
                    if (!state.archive) return state;

                    const updatedChapters = state.archive.chapters.map(chapter =>
                        chapter.id === chapterId
                            ? { ...chapter, content: newContent, userSuggestion: '手动编辑' }
                            : chapter
                    );

                    return {
                        archive: {
                            ...state.archive,
                            chapters: updatedChapters,
                        },
                    };
                });
            },

            recordModification: (chapterNum: number, suggestion: string) => {
                set((state: StoryStore) => {
                    if (!state.archive) return state;

                    return {
                        archive: {
                            ...state.archive,
                            modificationHistory: [
                                ...state.archive.modificationHistory,
                                {
                                    chapterNum,
                                    suggestion,
                                    timestamp: new Date(),
                                },
                            ],
                        },
                    };
                });
            },

            updateWorldState: (newState: Partial<WorldState>) => {
                set((state: StoryStore) => {
                    if (!state.archive || state.archive.chapters.length === 0) return state;

                    const lastChapter = state.archive.chapters[state.archive.chapters.length - 1];
                    const updatedWorldState = {
                        ...lastChapter.worldStateSnapshot,
                        ...newState,
                    };

                    // 更新最后一章的世界状态快照
                    const updatedChapters = [...state.archive.chapters];
                    updatedChapters[updatedChapters.length - 1] = {
                        ...lastChapter,
                        worldStateSnapshot: updatedWorldState,
                    };

                    return {
                        archive: {
                            ...state.archive,
                            chapters: updatedChapters,
                        },
                    };
                });
            },

            exportStory: () => {
                const state = get();
                return JSON.stringify(state.archive, null, 2);
            },

            importStory: (data: string) => {
                try {
                    const archive = JSON.parse(data) as StoryArchive;
                    set({ archive });
                } catch (error) {
                    console.error('Failed to import story:', error);
                }
            },

            resetStory: () => {
                set({ archive: null, cachedStory: [], cacheNextIndex: 0, originalStory: [], isOriginalStoryLoaded: false, fateComparisonSummary: undefined });
            },

            setCachedStory: (chapters: Chapter[]) => {
                set({ cachedStory: chapters, cacheNextIndex: 0 });
            },

            getNextCachedChapter: () => {
                const state = get();
                if (state.cacheNextIndex >= state.cachedStory.length) {
                    return null;
                }
                const chapter = state.cachedStory[state.cacheNextIndex];
                set({ cacheNextIndex: state.cacheNextIndex + 1 });
                return chapter;
            },

            clearCache: () => {
                set({ cachedStory: [], cacheNextIndex: 0 });
            },

            setOriginalStory: (chapters: Chapter[], comment?: string) => {
                set({
                    originalStory: chapters,
                    isOriginalStoryLoaded: true,
                    originalStoryComment: comment
                });
            },

            rewindToChapter: (chapterId: number) => {
                set((state: StoryStore) => {
                    if (!state.archive) return state;

                    // 找到目标章节的索引
                    const targetIndex = state.archive.chapters.findIndex(c => c.id === chapterId);
                    if (targetIndex === -1) return state;

                    // 保留目标章节及之前的所有章节
                    const remainingChapters = state.archive.chapters.slice(0, targetIndex + 1);

                    // 获取最后保留章节的世界状态
                    const lastChapter = remainingChapters[remainingChapters.length - 1];
                    const newWorldState = lastChapter?.worldStateSnapshot || state.archive.chapters[0]?.worldStateSnapshot;

                    // 更新主线状态为进行中（因为回溯了）
                    if (newWorldState) {
                        newWorldState.mainPlotStatus = 'active';
                    }

                    return {
                        archive: {
                            ...state.archive,
                            chapters: remainingChapters,
                        },
                        // 清除缓存
                        cachedStory: [],
                        cacheNextIndex: 0,
                    };
                });
            },

            setStoryComment: (comment: string) => {
                set((state: StoryStore) => {
                    if (!state.archive) return state;
                    return {
                        archive: {
                            ...state.archive,
                            storyComment: comment,
                        },
                    };
                });
            },

            // 设置命运对比总结
            setFateComparisonSummary: (summary: string) => {
                set((state: StoryStore) => {
                    return {
                        fateComparisonSummary: summary
                    };
                });
            },
        }),
        {
            name: 'story-archive',
            // 自定义序列化以处理Date对象
            onRehydrateStorage: () => (state: any) => {
                if (state?.archive) {
                    state.archive.createdAt = new Date(state.archive.createdAt);
                    state.archive.modificationHistory = state.archive.modificationHistory.map((item: any) => ({
                        ...item,
                        timestamp: new Date(item.timestamp),
                    }));
                    state.archive.chapters = state.archive.chapters.map((chapter: any) => ({
                        ...chapter,
                        metadata: {
                            ...chapter.metadata,
                            createdAt: new Date(chapter.metadata.createdAt),
                        },
                    }));
                }
            }
        }
    )
);

// 辅助函数：获取当前世界状态
export const getCurrentWorldState = (): WorldState => {
    const archive = useStoryStore.getState().archive;
    if (!archive || archive.chapters.length === 0) {
        return createInitialWorldState();
    }
    return archive.chapters[archive.chapters.length - 1].worldStateSnapshot;
};

// 辅助函数：获取初始章节建议值（实际内容将从API加载）
export const getInitialWorldState = (): WorldState => {
    return createInitialWorldState();
};
