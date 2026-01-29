import type { WorldState, Chapter, AIGenerationRequest } from '../types';

// 构建AI生成的Prompt
export function buildGenerationPrompt(request: AIGenerationRequest): string {
    const { worldState, previousChapter, userSuggestion } = request;

    const isNearEnding = worldState.currentChapter >= 8;
    const isProtagonistDead = !worldState.protagonistStatus.alive;

    let endingInstruction = '';
    if (isProtagonistDead) {
        endingInstruction = `
# 【故事已进入终章】
主角已退场。请在本章中：
1. 用一句话描述世界在主角死后的走向
2. 必须在标签中添加 #终章 #主角退场
3. 世界状态变化中简述"灵能时代的最终命运"`;
    } else if (isNearEnding) {
        endingInstruction = `
# 【故事即将进入尾声】
当前已是第 ${worldState.currentChapter} 章，请在接下来1-2章内完成故事：
- **正常结局路线**：主角揭露公司割韭菜本质 → 摧毁公司高层计划 → 国家干预介入 → 灵能时代终结 → 世界回归科技发展道路
- 若读者建议导致主角死亡，则立即进入异常结局
- 必须在本章或下一章添加 #终章 标签`;
    }

    return `# 世界规则（绝对约束）
${worldState.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

# 当前世界状态
- 章节进度：第 ${worldState.currentChapter} 章（共约10章）
- 主角状态：${worldState.protagonistStatus.alive ? '存活 - ' + worldState.protagonistStatus.occupation : '已退场'}
  - 能力：${worldState.protagonistStatus.power.join('、')}
  - 关键关系：${Object.entries(worldState.protagonistStatus.relationships)
            .map(([name, relation]) => `${name}(${relation})`)
            .join('、')}
- 主线状态：${worldState.mainPlotStatus === 'active' ? '进行中' : worldState.mainPlotStatus === 'broken' ? '已断裂' : '已完成'}
- 反派进度：${worldState.dynamicElements.villainProgress}
- 中立势力：${worldState.dynamicElements.neutralForces.join('、')}
${endingInstruction}

# 上一章梗概
${previousChapter.content.slice(0, 300)}...

【上章标签】：${previousChapter.metadata.tags.map(tag => '#' + tag).join(' ')}

# 读者修改建议
"${userSuggestion}"

# 任务要求
你是一位擅长极简叙事的AI作家。无论读者的建议多么颠覆性，你都必须：

1. **无条件接纳**：主角死亡、主线崩溃、反派获胜——一切皆可发生
2. **极简概括**：正文必须是一句话概括，格式为"xxx遇到了xxx事，选择xxx方式解决"，50字以内
3. **逻辑自洽**：推演需符合上述世界规则
4. **状态标注**：若触发关键变化（主角退场、终章），必须在标签中标注
5. **结局收束**：若已接近第10章或主角死亡，必须在1-2章内完成故事

# 输出格式（严格遵循）
直接输出剧情正文，不要任何标签、标题或元数据。正文内容为一句话概括，50字以内。

现在开始创作第 ${worldState.currentChapter + 1} 章。`;
}

// 构建一次性生成完整剧情的 Prompt
export function buildFullStoryPrompt(request: AIGenerationRequest): string {
    const { worldState, previousChapter, userSuggestion } = request;

    const remainingChapters = Math.max(1, 10 - worldState.currentChapter);

    return `# 世界规则（绝对约束）
${worldState.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

# 当前世界状态
- 剧情进度：第 ${worldState.currentChapter} 段（共约10段）
- 主角状态：${worldState.protagonistStatus.alive ? '存活 - ' + worldState.protagonistStatus.occupation : '已退场'}
- 主线状态：${worldState.mainPlotStatus === 'active' ? '进行中' : worldState.mainPlotStatus === 'broken' ? '已断裂' : '已完成'}

# 【关键】上一段剧情（你必须严格基于此内容续写）
"${previousChapter.content}"

${userSuggestion ? `# 读者的剧情指导
"${userSuggestion}"
` : ''}# 任务要求
你是一位擅长极简叙事的AI作家，你的任务是记录"命运"——用简洁有力的文字描述主角经历的事件。

**最重要的要求**：
1. **角色名一致性**：必须使用上一段剧情中出现的主角名字，严禁更换或创造新角色名！
2. 你生成的每一段都必须是上一段剧情的直接后果或延续！

请生成剩余剧情直到结局（**最多${remainingChapters}段，必须在此范围内结束故事**）。

要求：
1. **保持主角名字不变**：使用上一段中的主角名字，贯穿整个故事
2. **因果连贯**：每一段都必须是上一段的直接延续
3. **简洁有力**：每段50-80字，像命运记录一样陈述发生的事件，不要询问或提问
4. **逻辑自洽**：推演需符合世界规则
5. **必须收束**：最后一段必须是明确的结局（主角成功/失败/死亡/离开等），不能留悬念

# 结局强制要求
- **严禁无限续写**：生成的剧情必须在${remainingChapters}段内完结
- **最后一段必须是结局总结**：用一句话描述主角的最终结局和故事走向，这将作为整个故事的结尾展示给读者
- 结局示例："陈默揭开了公司的阴谋真相后选择隐退，带着林雨离开这座城市，从此过上了平静的生活。"

# 主角死亡处理
如果剧情导致主角死亡，随机选择：直接结局 / 时间循环回溯 / 穿越附身

# 输出格式
1. 每段直接输出剧情正文，段落之间用空行分隔
2. 最后一段是故事结局
3. **最后必须加一行"【点评】"**：用一句话（20-30字）对整个故事的主题/风格进行文学性点评
   - 点评示例："【点评】理性与疯狂的博弈中，知识的禁忌边界如裂缝般撕裂现实。"
   - 点评示例："【点评】在命运的十字路口，选择本身就是最大的勇气。"

开始创作：`;
}

// 解析完整剧情响应，返回多个章节和点评（新格式：纯文本，空行分隔）
export function parseFullStoryResponse(response: string, startChapter: number): {
    chapters: { title: string; content: string; tags: string[]; }[];
    comment: string;
} {
    const chapters: { title: string; content: string; tags: string[]; }[] = [];
    let comment = '';

    // 清理响应文本
    let cleanedResponse = response.trim();

    // 移除可能的 markdown 代码块
    cleanedResponse = cleanedResponse.replace(/```[\s\S]*?```/g, '');

    // 提取点评行
    const commentMatch = cleanedResponse.match(/【点评】(.+)/);
    if (commentMatch) {
        comment = commentMatch[1].trim();
        // 从响应中移除点评行
        cleanedResponse = cleanedResponse.replace(/【点评】.+/g, '').trim();
    }

    // 按空行分割，过滤空内容
    const paragraphs = cleanedResponse
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => {
            // 过滤掉标签行、元数据行、空行
            if (!p) return false;
            if (p.startsWith('标签') || p.startsWith('#') || p.startsWith('**')) return false;
            if (p.startsWith('---')) return false;
            if (p.startsWith('[第') || p.startsWith('[终')) return false;
            if (p.startsWith('【点评】')) return false; // 过滤点评行
            return p.length > 5; // 过滤太短的内容
        });

    paragraphs.forEach((content, index) => {
        const chapterNum = startChapter + index;
        // 只有最后一段才是结局
        const isLastParagraph = index === paragraphs.length - 1;

        chapters.push({
            title: isLastParagraph ? '结局' : `第${chapterNum}段`,
            content: content,
            tags: isLastParagraph ? ['结局'] : ['剧情发展'],
        });
    });

    return { chapters, comment };
}

// 解析AI返回的章节内容
export function parseAIResponse(response: string): {
    title: string;
    content: string;
    stateChanges: string;
    tags: string[];
} {
    const lines = response.split('\n');

    let title = '';
    let content = '';
    let stateChanges = '';
    let tags: string[] = [];

    let inMetadata = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 检测元数据分隔符
        if (line === '---' || line === '***') {
            inMetadata = true;
            continue;
        }

        // 提取元数据
        if (inMetadata) {
            const stateMatch = line.match(/^\*\*?世界状态变化\*\*?[:：]\s*(.*)$/);
            const tagMatch = line.match(/^\*\*?剧情标签\*\*?[:：]\s*(.*)$/);

            if (stateMatch) {
                stateChanges = stateMatch[1].trim();
            } else if (tagMatch) {
                const tagStr = tagMatch[1].trim();
                tags = tagStr.split(/[\s,，#]+/)
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
            }
            continue;
        }

        // 收集正文内容（分隔符之前的所有非空行）
        if (!inMetadata && line.length > 0 && !line.startsWith('#')) {
            content += line + ' ';
        }
    }

    // 从标签生成简单标题
    title = tags.length > 0 ? tags[0] : '剧情发展';

    return {
        title: title,
        content: content.trim(),
        stateChanges: stateChanges || '世界继续演进',
        tags: tags.length > 0 ? tags : ['未分类'],
    };
}

// 根据AI响应更新世界状态
export function updateWorldStateFromResponse(
    currentState: WorldState,
    response: string,
    userSuggestion: string
): Partial<WorldState> {
    const parsed = parseAIResponse(response);

    // 检测特殊标签，自动更新状态
    const updates: Partial<WorldState> = {
        currentChapter: currentState.currentChapter + 1,
    };

    // 检测主线状态变化
    if (parsed.tags.some(tag => tag.includes('主线断裂') || tag.includes('主线中断'))) {
        updates.mainPlotStatus = 'broken';
    } else if (parsed.tags.some(tag => tag.includes('主线完成') || tag.includes('终章'))) {
        updates.mainPlotStatus = 'completed';
    }

    // 检测主角状态
    if (parsed.tags.some(tag => tag.includes('主角退场') || tag.includes('主角死亡')) ||
        userSuggestion.toLowerCase().includes('主角死') ||
        userSuggestion.toLowerCase().includes('主角退场')) {
        updates.protagonistStatus = {
            ...currentState.protagonistStatus,
            alive: false,
        };
    }

    // 更新时间线
    updates.timeline = [
        ...currentState.timeline,
        {
            chapter: currentState.currentChapter + 1,
            event: parsed.stateChanges,
            impactedElements: parsed.tags,
        },
    ];

    return updates;
}

// 检查AI API配置
export function checkAPIConfig(): {
    hasOpenAI: boolean;
    hasAnthropic: boolean;
    hasDeepSeek: boolean;
    provider: 'openai' | 'anthropic' | 'deepseek' | null;
} {
    const hasOpenAI = !!process.env.OPENAI_API_KEY &&
        !process.env.OPENAI_API_KEY.includes('your_openai_api_key_here') &&
        process.env.OPENAI_API_KEY.length > 10;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY &&
        !process.env.ANTHROPIC_API_KEY.includes('your_anthropic_api_key_here') &&
        process.env.ANTHROPIC_API_KEY.length > 10;
    const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY &&
        process.env.DEEPSEEK_API_KEY.length > 10;

    let provider: 'openai' | 'anthropic' | 'deepseek' | null = null;

    // 根据默认配置选择 provider
    if (process.env.DEFAULT_AI_PROVIDER === 'deepseek' && hasDeepSeek) {
        provider = 'deepseek';
    } else if (process.env.DEFAULT_AI_PROVIDER === 'anthropic' && hasAnthropic) {
        provider = 'anthropic';
    } else if (process.env.DEFAULT_AI_PROVIDER === 'openai' && hasOpenAI) {
        provider = 'openai';
    } else if (hasDeepSeek) {
        provider = 'deepseek';
    } else if (hasOpenAI) {
        provider = 'openai';
    } else if (hasAnthropic) {
        provider = 'anthropic';
    }

    return { hasOpenAI, hasAnthropic, hasDeepSeek, provider };
}

// 随机世界观参数
const WORLD_PLANES = ['无魔', '低魔', '中魔', '高魔', '超魔'] as const;
const POWER_SYSTEMS = ['科技', '魔法', '修真', '克苏鲁'] as const;
const GENDERS = ['男', '女'] as const;
const STORY_GENRES = ['校园', '悬疑', '恋爱', '惊悚', '奇幻', '科幻', '都市', '职场', '冒险', '生存'] as const;

function getRandomItem<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomAge(): number {
    // 随机年龄 8-80 岁
    return Math.floor(Math.random() * 73) + 8;
}

// 构建新故事生成的 Prompt
export function buildNewStoryPrompt(): string {
    const plane = getRandomItem(WORLD_PLANES);
    const powerSystem = getRandomItem(POWER_SYSTEMS);
    const gender = getRandomItem(GENDERS);
    const age = getRandomAge();
    const genre = getRandomItem(STORY_GENRES);

    // 根据位面等级生成世界描述
    const planeDescriptions: Record<string, string> = {
        '无魔': '这是一个没有超自然力量的现实世界，故事以日常生活、人际关系、社会事件为主',
        '低魔': '这是一个超自然力量隐藏在日常之下的世界，普通人不知道力量的存在',
        '中魔': '这是一个超自然力量为人所知的世界，力量持有者可以影响局部事件',
        '高魔': '这是一个力量者主导的世界，强者可以毁灭城市、改变国家命运',
        '超魔': '这是一个顶级力量者可以操纵宇宙规律的世界，穿越时空、改写因果皆有可能',
    };

    const powerDescriptions: Record<string, string> = {
        '科技': '力量来源于科技（赛博朋克、太空科幻、未来科技等）',
        '魔法': '力量来源于魔法（西式奇幻、元素魔法、咒语等）',
        '修真': '力量来源于修炼（东方修仙、内功心法、飞升渡劫等）',
        '克苏鲁': '力量来源于不可名状的存在（旧日支配者、疯狂真相、禁忌知识等）',
    };

    const genreDescriptions: Record<string, string> = {
        '校园': '故事发生在学校环境，围绕学生、老师、校园生活展开',
        '悬疑': '故事以解谜、推理为主，有未解之谜需要主角揭开真相',
        '恋爱': '故事围绕感情发展，有明确的情感线和CP关系',
        '惊悚': '故事充满紧张感和危机，主角面临生死考验或恐怖威胁',
        '奇幻': '故事发生在充满奇妙生物和魔幻元素的世界',
        '科幻': '故事以未来科技、太空探索、人工智能为背景',
        '都市': '故事发生在现代城市，涉及都市生活的各种题材',
        '职场': '故事围绕工作环境展开，涉及职场竞争、成长',
        '冒险': '故事以探险、寻宝、旅途为主线',
        '生存': '主角面临生存危机，需要在恶劣环境中求生',
    };

    // 用户期望的结局类型
    const ENDING_ARCHETYPES = [
        '沉冤得雪', '大仇得报', '探究本质', '揭露真相',
        '人生圆满', '表白成功', '得道飞升', '打破循环',
        '赢得比赛', '战争落幕', '登基皇位', '退隐山林',
        '挣脱枷锁', '了却因果', '喜结良缘'
    ];
    const targetEnding = getRandomItem(ENDING_ARCHETYPES);

    return `你是一位擅长创作畅销小说的金牌作家，深谙"黄金三章"法则，擅长制造冲突、悬念和爽点。
请根据以下预设参数，并**以结局为导向**反推开局，生成一个极具吸引力的全新故事设定。

# 预设参数
- **故事类型**：${genre} - ${genreDescriptions[genre]}
- **世界位面**：${plane}位面 - ${planeDescriptions[plane]}
- **力量体系**：${powerSystem} - ${powerDescriptions[powerSystem]}
- **主角设定**：${gender}性，${age}岁
- **目标结局**：${targetEnding}（故事最终将走向这个结局，请以此构建核心冲突）

# 叙事原则（提升吸引力）
1. **开篇即高潮**：拒绝平铺直叙，直接展示核心冲突、危机或异象。
2. **黄金三章**：前两章必须建立强烈的代入感，抛出悬念或巨大的期待感（爽点）。
3. **主角主动性**：主角不应是被动接受，而应展现出性格特点或独特的应对方式。
4. **具体且有画面感**：细节描写要生动，避免空洞的设定堆砌。

# 创作要求
1. **中文姓名**：必须为主角起一个具体的中文姓名（2-3个字）。
2. **第三人称**：正文中**必须使用主角名字**而非"他/她"。
3. **冲突明确**：反派或阻碍必须具体，不仅仅是背景板。
4. **节奏紧凑**：前两章每段60-100字，信息密度要高，直接推动剧情。

# 输出格式（严格遵循JSON格式）
{
  "title": "故事标题（4-8个字，要吸睛，如《...》）",
  "genre": "${genre}${plane} · ${targetEnding}",
  "description": "一句话简介（30字内，包含核心钩子）",
  "worldPlane": "${plane}",
  "powerSystem": "${powerSystem}",
  "worldRules": [
    "核心规则1（与结局【${targetEnding}】相关的关键设定）",
    "规则2",
    "规则3",
    "规则4",
    "规则5"
  ],
  "protagonist": {
    "name": "主角姓名",
    "age": ${age},
    "gender": "${gender}",
    "occupation": "具体的职业或身份",
    "powers": ["核心金手指/能力", "辅助能力"]
  },
  "antagonist": {
    "name": "反派或具体阻碍",
    "goal": "阻碍主角达成【${targetEnding}】的具体动机"
  },
  "initialChapters": [
    "第一段（冲突爆发/异象突起）：60-100字，使用主角名字，设置悬念或危机。",
    "第二段（金手指觉醒/决心确立）：60-100字，使用主角名字，展示主角的非凡之处或破局行动。"
  ]
}

直接输出JSON，不要任何其他内容。`;
}

// 解析新故事响应
export interface NewStoryData {
    title: string;
    genre: string;
    description: string;
    worldPlane?: string;
    powerSystem?: string;
    worldRules: string[];
    protagonist: {
        name: string;
        age?: number;
        gender?: string;
        occupation: string;
        powers: string[];
    };
    antagonist: {
        name: string;
        goal: string;
    };
    initialChapters: string[];
}

export function parseNewStoryResponse(response: string): NewStoryData | null {
    try {
        // 清理可能的 markdown 代码块
        let cleanResponse = response.trim();
        if (cleanResponse.startsWith('```json')) {
            cleanResponse = cleanResponse.slice(7);
        } else if (cleanResponse.startsWith('```')) {
            cleanResponse = cleanResponse.slice(3);
        }
        if (cleanResponse.endsWith('```')) {
            cleanResponse = cleanResponse.slice(0, -3);
        }
        cleanResponse = cleanResponse.trim();

        const data = JSON.parse(cleanResponse) as NewStoryData;

        // 验证必要字段
        if (!data.title || !data.worldRules || !data.initialChapters) {
            console.error('Missing required fields in new story data');
            return null;
        }

        return data;
    } catch (error) {
        console.error('Failed to parse new story response:', error);
        return null;
    }
}
