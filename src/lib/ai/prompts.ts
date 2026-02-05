import type { WorldState, Chapter, AIGenerationRequest } from '../types';

// 构建AI生成的Prompt
export function buildGenerationPrompt(request: AIGenerationRequest): string {
    const { worldState, previousChapter, userSuggestion, isTestMode } = request;

    const isNearEnding = worldState.currentChapter >= (isTestMode ? 9 : 8); // 测试模式总长约9-13章
    const isProtagonistDead = !worldState.protagonistStatus.alive;

    let endingInstruction = '';
    if (isProtagonistDead) {
        endingInstruction = `
# 【故事已进入终章】
主角已退场。请在本章中：
1. 用一句话描述世界在主角死后的走向
2. 必须在标签中添加 #终章 #主角退场
3. 世界状态变化中简述"并未因主角死亡而停止运转的世界"`;
    } else if (isNearEnding) {
        endingInstruction = `
# 【故事即将进入尾声】
当前已是第 ${worldState.currentChapter} 章，请在接下来1-2章内完成故事：
- **收束主线**：根据前文铺垫的核心冲突（如复仇、揭秘、求生、恋爱等），给出一个合乎逻辑的结局。
- **呼应开篇**：结局应回应故事开始时的目标或愿望。
- **情感升华**：尝试在结局中进行主题升华或情感爆发。
- 若读者建议导致主角死亡，则立即进入异常结局
- 必须在本章或下一章添加 #终章 标签`;
    }

    // 测试模式的特殊指令
    let testModeInstruction = '';
    if (isTestMode) {
        testModeInstruction = `
# 【测试模式核心要求】
1. **一行一章**：严格输出一句话！但这**一句话要写得丰满、有画面感**。
2. **强钩子句尾**：结尾必须有情绪刺点、悬念或冲击。
3. **拒绝干瘪**：不要写成流水账，句中必须包含具体的细节描写。
4. **短促节奏**：全篇控制在9-13章内。
5. **修改逻辑**：如果读者的建议导致原定剧情无法展开，请通过【回溯时间】、【穿越】或【立即结束并简述世界观】的方式来合理化，不要生硬拒绝。
        `;
    }

    return `# 世界规则（绝对约束）
${worldState.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

# 当前世界状态
- 章节进度：第 ${worldState.currentChapter} 章（${isTestMode ? '共13章内' : '共约10章'}）
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
2. **极简概括**：${isTestMode ? '**严格一句话！**' : '50字以内，一句话概括'}
3. **逻辑自洽**：推演需符合上述世界规则
4. **状态标注**：若触发关键变化（主角退场、终章），必须在标签中标注
5. **结局收束**：${isTestMode ? '若接近第13章或主角死亡，必须尽快完结' : '若已接近第10章或主角死亡，必须在1-2章内完成故事'}
6. **角色名纠错**：如果读者建议中的主角名字有误（同音/错别字），请**自动修正为正确名字**。
${testModeInstruction}

# 输出格式（严格遵循）
直接输出剧情正文，不要任何标签、标题或元数据。${isTestMode ? '正文严格只有一句话。' : '正文内容为一句话概括，50字以内。'}

现在开始创作第 ${worldState.currentChapter + 1} 章。`;
}

// 构建一次性生成完整剧情的 Prompt
export function buildFullStoryPrompt(request: AIGenerationRequest): string {
    const { worldState, previousChapter, userSuggestion, isTestMode } = request;

    const remainingChapters = Math.max(1, (isTestMode ? 13 : 10) - worldState.currentChapter);

    // 测试模式的特殊指令
    let testModeInstruction = '';
    if (isTestMode) {
        testModeInstruction = `
# 【测试模式核心要求（一行一章）】
1. **严格限制**：每一段正文**严格只有一句话**！但不要写得太干瘪，要**言之有物，细节丰富**。
2. **强钩子**：每一句的结尾都要有情绪与悬念的钩子。
3. **节奏**：全篇在13句以内收尾。
4. **结局类型**：不要局限于悲剧。如果走向合适，可以是【沉冤得雪】、【大仇得报】、【人生圆满】、【挣脱枷锁】等正面结局，或者【温暖释然】的收尾。随机应变，不要套路化。
5. **悲怆或温暖**：结局时，主角的回应要语气轻柔却有力量。
        `;
    }

    // 针对穿越题材的特殊逻辑：命运修正力/蝴蝶效应
    const isTransmigration = worldState.rules.some(r => r.includes('穿越') || r.includes('时间')) || userSuggestion?.includes('穿越') || (request.isTestMode && request.previousChapter.content.includes('穿越'));

    let obedienceInstruction = `
1. **【绝对服从读者的剧情指导】**：
   - 如果上方有提供【读者的剧情指导】，在此刻，这代表了 ** 不可违抗的命运意志 **。
   - 无论这条指令多么离谱、突兀或导致主角死亡（如"暴毙而亡"），你必须 ** 在这一段立即执行 **！
   - 不要试图用逻辑去修正它，不要试图挽救主角，不要试图平滑过渡。
   - ** 直接写出结果 **。`;

    if (isTransmigration) {
        obedienceInstruction = `
1. **【穿越法则：命运的顽固性与代价】**：
   - 你必须执行读者的【剧情指导】（如"救下某人"），但 ** 结果不能不仅是单纯的成功 **。
   - ** 蝴蝶效应 **：改变过去必须付出代价。如果主角强行救人，可能会导致另一个人死亡，或者未来变得更糟。
   - ** 世界修正 **：命运会试图自我修复。完美的结局极难达成。
   - ** 不完美的强行结局 **：如果读者的干预逻辑不够完美，请给予一个 **【带有遗憾的变动】**，引向一个 ** 不完美的结局 **（而不是直接失败），让读者感受到"改变了，但没全变"的无力感，从而激发探索欲。`;
    }

    return `# 世界规则（绝对约束）
${worldState.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

# 当前世界状态
- 剧情进度：第 ${worldState.currentChapter} 段（${isTestMode ? '全篇共9-13段' : '共约10段'}）
- 主角状态：${worldState.protagonistStatus.alive ? '存活 - ' + worldState.protagonistStatus.occupation : '已退场'}
- 主线状态：${worldState.mainPlotStatus === 'active' ? '进行中' : worldState.mainPlotStatus === 'broken' ? '已断裂' : '已完成'}

# 【关键】上一段剧情（你必须严格基于此内容续写）
"${previousChapter.content}"

${userSuggestion ? `# 读者的剧情指导
"${userSuggestion}"
` : ''}# 任务要求
你是一位擅长极简叙事的AI作家，你的任务是记录"命运"——用简洁有力的文字描述主角经历的事件。

** 最重要的要求（最高优先级）**：
${obedienceInstruction}

2. ** 角色名一致性（自动纠错）**：
   - 必须严格使用上一段剧情中出现的主角名字，严禁更换或创造新角色名！
   - ** 自动纠错 **：如果【读者的剧情指导】中出现的主角名字与前文不一致（如同音字、错别字），请 ** 自动修正为正确的主角名字 ** 继续写作，不要受读者笔误影响。
3. 你生成的每一段都必须是上一段剧情（结合读者指令后）的直接后果或延续！

请生成剩余剧情直到结局（** 最多${remainingChapters} 段，必须在此范围内结束故事 **）。

要求：
1. ** 保持主角名字不变 **：使用上一段中的主角名字，贯穿整个故事
2. ** 因果连贯 **：每一段都必须是上一段的直接延续
3. **简洁有力**：${isTestMode ? '**严格一句话一段！**' : '每段50-80字，像命运记录一样陈述发生的事件'}
4. **逻辑自洽**：推演需符合世界规则
5. **必须收束**：最后一段必须是明确的结局（主角成功 / 失败 / 死亡 / 离开等），不能留悬念
6. **严禁重复**：绝对不要重复输出【上一段剧情】的内容！直接写接下来的发展。
${testModeInstruction}

# 结局强制要求
- ** 严禁无限续写 **：生成的剧情必须在${remainingChapters} 段内完结
- ** 最后一段是结局总结 **：用一句话描述主角的最终结局，必须具有强烈的 ** 文学性 ** 和 ** 故事感 **。
- ** 拒绝平庸 **：不要写成流水账式的"从此过上了平静的生活"。
- ** 极致反转 / 收束 **：结局应当是【欧亨利式】的意料之外情理之中，或者是对开篇愿望的深刻回应（无论是圆满达成还是残酷破碎）。
   - 结局示例1："直到最后他才明白，那把斩断命运的剑，从一开始就握在自己手中。"
   - 结局示例2："他赢得了整个世界，却在加冕的欢呼声中，听见了旧日恋人破碎的叹息。"

# 主角死亡处理
如果剧情导致主角死亡，随机选择：直接结局 / 时间循环回溯 / 穿越附身

# 输出格式
1. 每段直接输出剧情正文，段落之间用空行分隔
2. 最后一段是故事结局
3. ** 最后必须加一行"### COMMENT ###" **：随后用一句话（20 - 30字）对整个故事的主题 / 风格进行文学性点评。
   - 示例："### COMMENT ### 在命运的十字路口，选择本身就是最大的勇气。"

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

    // 智能解包 Code Block (如果被包裹)
    if (cleanedResponse.startsWith('```')) {
        const lines = cleanedResponse.split('\n');
        // 只有当最后一行也是 ``` 且第一行是 ``` 开头才解包
        if (lines.length >= 2 && lines[lines.length - 1].trim().startsWith('```')) {
            lines.shift(); // 移除第一行
            lines.pop();   // 移除最后一行
            cleanedResponse = lines.join('\n').trim();
        }
    }

    // 1. 优先尝试提取明确的 Token 标记
    const tokenMatch = cleanedResponse.match(/### COMMENT ###([\s\S]*)/);
    if (tokenMatch) {
        comment = tokenMatch[1].trim();
        cleanedResponse = cleanedResponse.replace(tokenMatch[0], '').trim();
    } else {
        // 2. Fallback: 尝试提取自然语言标记
        const commentMatch = cleanedResponse.match(/(?:【点评】|点评[:：]|\[点评\]|【\s*点评\s*】)([:：]?\s*)([\s\S]*)/);
        if (commentMatch) {
            comment = commentMatch[2].trim();
            cleanedResponse = cleanedResponse.replace(commentMatch[0], '').trim();
        }
    }

    // 按空行分割，过滤空内容
    const paragraphs = cleanedResponse
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => {
            // 过滤掉标签行、元数据行、空行
            if (!p) return false;
            // 跳过看起来像标题的短行，但保留正文
            // 简单规则：如果行包含"第x章"或"第x段"且很短，可能是标题，过滤掉
            // 但考虑到"极简叙事"，正文可能也很短。所以主要过滤明确的元数据。
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
    } else if (parsed.tags.some(tag => tag.includes('主线完成') || tag.includes('终章') || tag.includes('结局'))) {
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
const POWER_SYSTEMS = ['科技', '魔法', '修真', '克苏鲁', '日常'] as const;
const GENDERS = ['男', '女'] as const;
export const STORY_GENRES = ['校园', '悬疑', '恋爱', '惊悚', '奇幻', '科幻', '都市', '职场', '冒险', '生存', '穿越', '武侠'] as const;



function getRandomItem<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomAge(): number {
    // 随机年龄 8-80 岁
    return Math.floor(Math.random() * 73) + 8;
}

// 智能生成世界设定（根据题材优化权重）
function generateWorldSettings(genre: string) {
    let plane: typeof WORLD_PLANES[number];
    let powerSystem: typeof POWER_SYSTEMS[number];

    const realismGenres = ['校园', '恋爱', '都市', '职场'];
    const mysteryGenres = ['悬疑', '惊悚', '生存'];

    const rand = Math.random();

    if (genre === '穿越') {
        // 穿越题材特殊处理：分为 重生/古穿/异穿
        const subTypeRand = Math.random();
        if (subTypeRand < 0.3) {
            // 30% 重生/弥补遗憾 (平行世界-无魔日常)
            plane = '无魔';
            powerSystem = '日常';
        } else if (subTypeRand < 0.6) {
            // 30% 古穿今/今穿古 (低魔/史诗)
            plane = getRandomItem(['无魔', '低魔']);
            powerSystem = '日常';
        } else {
            // 40% 异界穿越 (完全随机)
            plane = getRandomItem(WORLD_PLANES);
            powerSystem = getRandomItem(POWER_SYSTEMS);
        }
    } else if (realismGenres.includes(genre)) {
        // 现实题材：90% 概率无魔 + 日常（纯现实）
        if (rand < 0.9) {
            plane = '无魔';
            powerSystem = '日常';
        } else {
            // 10% 概率保留都市异能/科技/微魔
            if (rand < 0.95) {
                plane = '低魔';
                powerSystem = getRandomItem(['科技', '克苏鲁', '魔法']);
            } else {
                plane = getRandomItem(WORLD_PLANES);
                powerSystem = getRandomItem(POWER_SYSTEMS);
            }
        }
    } else if (genre === '惊悚') {
        // 惊悚题材：极致的恐怖氛围，严禁高魔
        if (rand < 0.4) {
            // 40% 纯现实恐怖（变态杀手/心理惊悚）
            plane = '无魔';
            powerSystem = '日常';
        } else if (rand < 0.8) {
            // 40% 克苏鲁/不可名状 (低魔，强调未知的恐惧)
            plane = '低魔';
            powerSystem = '克苏鲁';
        } else {
            // 20% 灵异/鬼怪 (低魔)
            plane = '低魔';
            powerSystem = '魔法'; // 这里的魔法指代灵异
        }
    } else if (mysteryGenres.includes(genre)) {
        // 悬疑/生存：倾向于低魔/无魔
        if (rand < 0.6) {
            plane = '无魔';
            powerSystem = '日常';
        } else if (rand < 0.8) {
            plane = '低魔';
            powerSystem = '克苏鲁';
        } else {
            plane = getRandomItem(WORLD_PLANES);
            powerSystem = '科技';
        }
    } else if (genre === '科幻') {
        plane = getRandomItem(['无魔', '低魔', '中魔', '高魔']); // 科幻不一定是高魔，但通常是科技侧
        powerSystem = '科技';
    } else if (genre === '奇幻') {
        plane = getRandomItem(['中魔', '高魔', '超魔']);
        powerSystem = '魔法';
    } else {
        // 其他题材完全随机
        plane = getRandomItem(WORLD_PLANES);
        powerSystem = getRandomItem(POWER_SYSTEMS);
    }

    return { plane, powerSystem };
}

// 构建新故事生成的 Prompt
export function buildNewStoryPrompt(): string {
    const genre = getRandomItem(STORY_GENRES);
    const { plane, powerSystem } = generateWorldSettings(genre);
    const gender = getRandomItem(GENDERS);
    const age = getRandomAge();

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
        '日常': '无特殊力量，完全基于现实逻辑（校园学习、职场技能、人际交往、专业知识等）',
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
        '穿越': '主角穿越时空/平行世界/书中世界，拥有现代知识或预知能力，目标是改变命运、挽回遗憾或利用信息差破局',
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
1. **中文姓名（题材风格命名）**：
   - 必须为主角起一个具体的中文姓名（2-3个字）
   - **禁止使用以下常见名字**：林默、林墨、陈默、李默、王默、张默、沈默、江默（避免"默"字过度使用）
   - **强制多样性**：姓氏从以下随机选择：苏、顾、沈、叶、陆、秦、宁、萧、谢、季、傅、霍、裴、程、江、温、许、方、魏、唐
   - 命名需符合【${genre}】题材的特定风格：
     * 武侠：古风韵味，可用复姓（慕容、独孤、东方等）或单名，体现侠义感（如慕容秋、独孤凌、萧寒）
     * 奇幻/修真：仙侠意境，避免俗名（如云无痕、沈月华、凌霄、叶尘）
     * 校园/恋爱：现代常见姓氏，清新可爱或阳光明媚（如苏念念、顾晚晴、江屿、谢安年）
     * 都市/职场：职场精英感，成熟稳重（如顾江城、沈南风、叶清寒、陆行舟）
     * 科幻：现代化或未来感（如陆启明、韩星河、宁远航、程序）
     * 悬疑/惊悚：普通中带暗示性，不宜花哨（如周凛、方砚、白夜、苏寒）
     * 穿越：根据目标时代（古代用古风如柳如烟、苏瑾言；现代用现代名如秦悦、傅晚）
     * 冒险/生存：硬朗有力（如石磊、齐峰、宁远、霍戈）
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
    "第一段（冲突爆发/异象突起）：100-150字，使用主角名字，设置悬念或危机。直接输出正文，不要带章节标题。",
    "第二段（金手指觉醒/决心确立）：100-150字，使用主角名字，展示主角的非凡之处或破局行动。直接输出正文，不要带章节标题。"
  ]
}

直接输出JSON，不要任何其他内容。`;
}

// 构建新故事测试版 Prompt (一行一章/单句章节/强钩子)
export function buildNewStoryTestPrompt(specifiedGenre?: string): string {
    const genre = specifiedGenre || getRandomItem(STORY_GENRES);
    const { plane, powerSystem } = generateWorldSettings(genre);
    const gender = getRandomItem(GENDERS);
    const age = getRandomAge();

    // 随机结局类型（包含正面、悲怆、温暖、反转等多种变体）
    const TEST_ENDING_ARCHETYPES = [
        // 强冲击/反转/升华
        '至高代价的胜利', '虚假的乌托邦', '屠龙者终成恶龙',
        '唯一的幸存者', '跨越时间的重逢', '无人知晓的牺牲',
        '命运的残酷玩笑', '我在终点等你', '破碎镜中的真实',

        // 正面/圆满/爽文 (保留部分经典)
        '沉冤得雪', '大仇得报', '探究本质', '揭露真相',
        '人生圆满', '表白成功', '挣脱枷锁', '登基皇位',

        // 唯美/治愈
        '温柔的告别', '永恒的承诺', '星空下的誓言'
    ];
    const targetEnding = getRandomItem(TEST_ENDING_ARCHETYPES);

    // 针对不同题材的特殊剧情指令
    let genreInstruction = '';
    if (genre === '惊悚') {
        genreInstruction = `
# 【惊悚题材特殊要求】
1. **当下危机**：故事必须从**当下发生的突发灾难或异常**开始（如被困、遭遇变态、规则怪谈），严禁写成"主角回老家探寻身世"或"找回失落的记忆"！
2. **感官恐怖**：多描写气味（腐烂/血腥）、温度（阴冷/粘腻）、声音（异响/寂静），而不仅仅是视觉。
3. **恐怖谷**：强调"似人非人"、"熟悉环境的异化"、"日常规则的崩坏"。
4. **心理压迫**：重点描写主角的心理崩溃、无力感和对未知的恐惧。
5. **拒绝战斗**：主角面对威胁时应以"逃生/挣扎/绝望"为主，严禁写成丢火球的魔法对波！
`;
    } else if (genre === '悬疑') {
        genreInstruction = `
# 【悬疑题材特殊要求】
1. **拒绝陈年旧案**：故事核心冲突必须是**正在发生**的诡异事件或连环犯罪，不要写"十年前的旧案"或"身世之谜"。
2. **智力博弈**：强调主角与反派/谜题的高智商博弈，而非单纯的灵异吓人。
3. **线索布局**：前两章必须埋下至少2个可疑线索或矛盾点。
`;
    } else if (genre === '穿越') {
        genreInstruction = `
# 【穿越题材特殊要求】
1. **反差感**：重点描写主角现代思维/知识与当前世界的冲突或降维打击。
2. **目的性**：主角的所有行动必须紧扣"改变命运"或"弥补遗憾"这一核心动机。
3. **信息差利用**：展示主角如何利用预知或现代知识破局。
`;
    } else if (genre === '校园') {
        genreInstruction = `
# 【校园题材特殊要求】
1. **青春日常感**：重点描写校园特有的日常场景（教室、操场、社团活动、放学后）和青春期的情感波动。
2. **成长冲突**：核心矛盾应围绕友情、学业压力、初恋、霸凌、梦想选择、师生关系等青春议题。
3. **拒绝悬疑化**：严禁加入悬疑、推理、解谜元素，避免"学校怪谈"、"神秘失踪"、"诡异事件"等情节。
4. **真实校园**：聚焦真实的校园生活，如考试、社团竞赛、运动会、毕业季、青春烦恼等。
`;
    } else if (genre === '恋爱') {
        genreInstruction = `
# 【恋爱题材特殊要求】
1. **情感张力**：前两章必须建立明确的CP关系或情感冲突（暗恋/误会/竞争对手）。
2. **心动时刻**：描写具体的心动瞬间，避免空洞的"他很帅"，要有细节（如阳光下的侧脸、不经意的温柔）。
3. **情感推进**：每章都要有情感关系的进展或波折，拒绝原地踏步。
`;
    } else if (genre === '奇幻') {
        genreInstruction = `
# 【奇幻题材特殊要求】
1. **世界观展示**：前两章必须展现独特的魔法体系、奇幻生物或异世界规则。
2. **冒险感**：主角应主动探索未知领域，而非被动等待。
3. **魔法系统**：如有魔法，需说明其代价或限制，避免无敌设定。
`;
    } else if (genre === '科幻') {
        genreInstruction = `
# 【科幻题材特殊要求】
1. **科技设定**：必须展示具体的科技元素（AI、太空、基因改造、时间旅行等），避免空谈概念。
2. **科技伦理**：探讨科技带来的道德困境或社会问题。
3. **硬核感**：即使是软科幻，也要有基本的科学逻辑，避免纯魔法化。
`;
    } else if (genre === '都市') {
        genreInstruction = `
# 【都市题材特殊要求】
1. **现代都市感**：描写具体的都市场景（写字楼、咖啡厅、地铁、夜店），体现快节奏生活。
2. **现实矛盾**：聚焦现代人的困境（房贷、职场PUA、社交焦虑、阶层固化）。
3. **烟火气**：加入生活化细节，避免悬浮剧情。
`;
    } else if (genre === '职场') {
        genreInstruction = `
# 【职场题材特殊要求】
1. **职场真实性**：展示具体的工作场景和专业术语，避免"开会-恋爱-开会"的套路。
2. **职场斗争**：核心冲突应围绕项目竞争、升职博弈、职场站队等。
3. **专业成长**：主角的成长应体现在专业能力提升上，而非仅靠人脉。
`;
    } else if (genre === '冒险') {
        genreInstruction = `
# 【冒险题材特殊要求】
1. **探索未知**：每章都要有新的地点、新的发现或新的危险。
2. **团队协作**：如有队友，需展示不同角色的作用和配合。
3. **危机升级**：危险程度应逐步升级，避免平铺直叙。
`;
    } else if (genre === '生存') {
        genreInstruction = `
# 【生存题材特殊要求】
1. **资源紧张**：必须体现食物、水、庇护所等资源的稀缺性。
2. **环境压迫**：详细描写恶劣环境对主角身心的摧残。
3. **生存智慧**：展示主角如何利用有限资源求生，而非靠运气。
`;
    } else if (genre === '武侠') {
        genreInstruction = `
# 【武侠题材特殊要求】
1. **江湖气**：展示江湖规矩、门派恩怨、武林大会等武侠特有元素。
2. **武学体系**：说明武功招式和内力修炼，避免空洞的"一掌打出"。
3. **侠义精神**：主角行事应体现侠义或反侠义的价值观冲突。
`;
    }

    return `你是一位擅长极致微小说的先锋作家，擅长用最简练的文字通过"一行一章"的形式构建宏大或感人的故事。
请根据以下预设参数，生成一个全新的故事设定和初始章节。
${genreInstruction}
# 预设参数
- **故事类型**：${genre} · ${plane}位面 · ${powerSystem}
- **主角**：${gender}性，${age}岁
- **目标结局**：${targetEnding}

# 核心风格要求（TEST_MODE）
# 核心风格要求（TEST_MODE）
1. **前两章详细铺垫**：为了让故事更有代入感，前两章需要像正统小说一样详细描写（每章100-150字），交代背景、人物性格和核心冲突。
2. **第三章起极速推进**：从第三章开始，严格执行**一行一章**的极速模式！
3. **强钩子句尾**：每一句的结尾必须有强烈的情绪刺点、悬念、转折或冲击，强力拉动读者看下一句。
4. **画面感浓缩**：单句要有电影镜头般的画面感，信息密度要高。
5. **极简对话**：如果非要有对话，嵌入在描写中，不要单纯的对话流。
6. **短促节奏**：整个故事预计在9–13章内完结。

# 创作要求
1. **中文姓名（题材风格命名）**：
   - 必须为主角起一个具体的中文姓名（2-3个字）
   - **禁止使用以下常见名字**：林默、林墨、陈默、李默、王默、张默、沈默、江默（避免"默"字过度使用）
   - **强制多样性**：姓氏从以下随机选择：苏、顾、沈、叶、陆、秦、宁、萧、谢、季、傅、霍、裴、程、江、温、许、方、魏、唐
   - 命名需符合【${genre}】题材的特定风格：
     * 武侠：古风韵味，可用复姓（慕容、独孤、东方等）或单名，体现侠义感（如慕容秋、独孤凌、萧寒）
     * 奇幻/修真：仙侠意境，避免俗名（如云无痕、沈月华、凌霄、叶尘）
     * 校园/恋爱：现代常见姓氏，清新可爱或阳光明媚（如苏念念、顾晚晴、江屿、谢安年）
     * 都市/职场：职场精英感，成熟稳重（如顾江城、沈南风、叶清寒、陆行舟）
     * 科幻：现代化或未来感（如陆启明、韩星河、宁远航、程序）
     * 悬疑/惊悚：普通中带暗示性，不宜花哨（如周凛、方砚、白夜、苏寒）
     * 穿越：根据目标时代（古代用古风如柳如烟、苏瑾言；现代用现代名如秦悦、傅晚）
     * 冒险/生存：硬朗有力（如石磊、齐峰、宁远、霍戈）
2. **第三人称**：正文中**必须使用主角名字**而非"他/她"。
3. **前两章内容**：
   - 第一章：100-150字，详细描写环境与危机，瞬间将读者拉入冲突现场。
   - 第二章：100-150字，展示主角的具体行动或核心金手指/能力的觉醒。

# 输出格式（严格遵循JSON格式）
{
  "title": "故事标题（极简有力，4-8字）",
  "genre": "${genre} · ${targetEnding}",
  "description": "一句话简介（极简钩子）",
  "worldPlane": "${plane}",
  "powerSystem": "${powerSystem}",
  "worldRules": [
    "核心规则1",
    "核心规则2",
    "核心规则3"
  ],
  "protagonist": {
    "name": "主角姓名",
    "age": ${age},
    "gender": "${gender}",
    "occupation": "身份",
    "powers": ["核心能力"]
  },
  "antagonist": {
    "name": "反派/阻碍",
    "goal": "阻碍动机"
  },
  "initialChapters": [
    "第一章（冲突爆发）：100-150字，详细描写环境与危机，使用主角名字，设置悬念。直接输出正文，不要带章节标题或前缀。",
    "第二章（转折/行动）：100-150字，展示主角的具体行动或超凡能力的觉醒，带来第一个大转折。直接输出正文，不要带章节标题或前缀。"
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

// 构建命运对比 Prompt
export function buildComparisonPrompt(
    originalSummary: string,
    actualSummary: string,
    genre: string,
    protagonistName: string = '主角'
): string {
    return `你是一位深刻的命运观察者。
请对比以下两个不同时间线的故事结局，生成**一句话**的命运对比总结。

**主角**：${protagonistName}
**世界背景**：${genre}

**原定命运（如果未被改变）**：
${originalSummary}

**实际发生的命运（被观察者干涉后）**：
${actualSummary}

**要求**：
1. **精准指代**：
   - 传入的主角名为【${protagonistName}】。
   - **如果名字是"主角"、"未命名主角"等通用词**，请务必从上方的【原定命运/实际命运】文本中提取**真正的主角名字**（如"林晓"、"陈建国"）。
   - **禁止使用第二人称"你"**。必须使用第三人称或名字。
   - **禁止在输出中给名字加【】括号**。
2. **紧贴剧情**：不要臆造"系统/代码/删除/数据"等如果是古风或现实题材中不存在的概念。必须仅基于上方的剧情摘要。
3. **一句话**：严格限制在 30-50 字以内。
4. **对比强烈**：体现出【原定命运】与【实际结局】的巨大反差。
5. **格式规范**：**绝对不要有开头的空格**。直接开始写句子。
6. **拒绝套路**：不要总是用"原本...却..."的句式。可以使用转折、因果、讽刺、感叹等多种句式。
7. **禁用词汇**：绝对不要出现"在命运的干涉下"这几个字。

请直接输出这句话，不要包含任何标签、空格或额外内容。`;
}