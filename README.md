# 归墟轮回 - 交互式AI小说原型

> **全维度剧情自定义 + 世界自主演进** - 你的选择，重塑世界

## 项目简介

这是一款以 **"接纳所有选择结果，哪怕是剧情崩坏与主角退场"** 为核心理念的交互式AI小说产品原型。

### 核心特性

- ✨ **全维度剧情自定义**：对任意剧情元素（主角命运、道具归属、主线存续、人物生死）提出修改建议
- 🌍 **世界自主演进**：AI基于预设的动态要素（反派计划、中立势力、自然事件）推演真实后果
- 💥 **接纳极端走向**：主角第1章就死亡？主线彻底断裂？反派获得全胜？一切皆可发生
- 📊 **结局对比**：可视化对比原定结局与你自定义后的独特走向

### 技术栈

- **前端框架**：Next.js 16 (App Router) + React 19 + TypeScript
- **样式方案**：Tailwind CSS 4 + Framer Motion
- **AI集成**：OpenAI GPT-4o / Anthropic Claude 3.5 Sonnet
- **状态管理**：Zustand (with localStorage persistence)
- **内容渲染**：React Markdown + remark-gfm

---

## 快速开始

### 1. 安装依赖

```bash
cd /Users/ypp/.gemini/antigravity/scratch/ai-novel-prototype
npm install
```

### 2. 配置AI API

复制环境变量模板并填入你的 API Key：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入至少一个 API Key：

```bash
# 选择其中一个
OPENAI_API_KEY=sk-...
# 或
ANTHROPIC_API_KEY=sk-ant-...
```

> **获取API Key**：
> - OpenAI: https://platform.openai.com/api-keys
> - Anthropic: https://console.anthropic.com/settings/keys

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 开始体验。

---

## 项目结构

```
ai-novel-prototype/
├── seed-content/              # 种子内容（世界设定、初始章节）
│   ├── world-rules.md         # 世界底层规则（14条核心约束）
│   ├── dynamic-elements.json  # 动态要素（反派计划、中立势力等）
│   ├── chapter-01.md          # 第一章：失业者的末日
│   ├── chapter-02.md          # 第二章：环球中心的低语
│   ├── original-ending.md     # 原定结局
│   └── initial-state.json     # 初始世界状态
├── src/
│   ├── app/
│   │   ├── page.tsx           # 首页
│   │   ├── read/[chapterId]/  # 章节阅读页
│   │   ├── compare/           # 结局对比页
│   │   └── api/generate/      # AI生成API路由
│   ├── components/
│   │   ├── ChapterReader.tsx  # 章节内容渲染
│   │   ├── WorldStatePanel.tsx # 世界状态侧边栏
│   │   └── ModifySuggestionForm.tsx # 修改建议表单
│   └── lib/
│       ├── types.ts           # TypeScript类型定义
│       ├── store.ts           # Zustand状态管理
│       └── ai/prompts.ts      # AI Prompt工程
└── .env.example               # 环境变量模板
```

---

## 使用指南

### 阅读与修改剧情

1. **开始阅读**：从首页点击"开始阅读"，进入第1章
2. **沉浸式体验**：阅读章节内容，观察右侧的世界状态面板
3. **提出修改建议**：在最后一章底部，输入你的剧情修改建议（示例：`让主角拒绝公司，选择逃亡`）
4. **AI推演**：系统调用AI生成符合你建议的下一章内容
5. **继续探索**：新章节自动保存，可继续提交建议

### 极端场景示例

#### 主角第1章就死亡
```
建议：让主角在咖啡厅遭遇灵异袭击，当场死亡
→ AI自动切换至林雨视角，继续调查事件
```

#### 主线崩坏
```
建议：让公司轮回计划在第3章就成功，反派大获全胜
→ 世界进入"灵能收割时代"，主线标记为"已断裂"
```

#### 和平结局
```
建议：让所有势力和解，公司公开灵能技术
→ 主线自然消解，转为科技共享发展叙事
```

### 查看结局对比

访问 `/compare` 页面，对比：
- **原定结局**：主角击败公司，灵能被封印，世界回归科技路线
- **你的结局**：基于你所有修改建议后的独特走向
- **关键抉择点**：时间线展示每次修改建议及其影响标签

---

## 世界观速览

### 背景设定
2052年，**电磁时代**盛行，室温超导材料普及。生物公司意外发现**灵魂与灵能**，引发灵异事件与觉醒者。公司暗中推行 **"轮回计划"**——以志愿者为电池抽取灵能。

### 主角历程
28岁失业产品经理，在伏羲大殿梦入神话时代，习得上古灵力。回归后卷入灵异事件，加入公司处理组，逐步揭露真相。

### 核心规则（节选）
1. **灵能消耗有上限**，过度使用导致不可逆灵魂损伤
2. **神话时代的真相**：上古时期灵能为自然现象，非超自然
3. **世界自主演进**：即使主角不存在，反派计划、中立势力仍会自主推进

---

## 开发说明

### 添加新章节种子内容

1. 在 `seed-content/` 目录创建 `chapter-XX.md`
2. 更新 `initial-state.json` 添加章节元数据
3. 修改 `src/lib/store.ts` 的 `getInitialChapters` 函数

### 调整AI Prompt策略

编辑 `src/lib/ai/prompts.ts` 的 `buildGenerationPrompt` 函数：
- 修改system prompt提升AI角色认知
- 调整temperature参数控制创意度（0.6-1.0）
- 优化输出格式要求

### 扩展世界规则

编辑 `seed-content/world-rules.md` 和 `dynamic-elements.json`，注意：
- 规则应约束世界运行逻辑，不绑定特定剧情
- 动态要素需提供自主演进的触发条件

---

## 已知限制（MVP阶段）

- ❌ **无回溯功能**：提交建议后立即生成，无法撤销
- ❌ **无蝴蝶效应可视化**：暂无决策树图表
- ❌ **无社群功能**：无法分享或查看他人剧情线
- ❌ **无移动端优化**：建议在桌面端体验

---

## 后续迭代计划

### Phase 2：完整体验
- 回溯机制（章节快照+积分系统）
- 蝴蝶效应图谱（D3.js可视化）
- 服务端存储（Supabase迁移）

### Phase 3：社交与商业化
- 用户账号系统
- 优质建议认证激励
- 社群共创与作者干预通道

---

## 故事世界

**《归墟轮回》**

**类型**：科幻 / 灵异 / 反乌托邦  
**主题**：科技与灵能的对立,理性与力量的抉择

> *"每一次选择都定义世界终极形态"*

---

## 许可证

本项目为原型演示，仅供学习交流使用。

## 贡献

欢迎提交Issue和Pull Request！

---

**开始你的专属剧情旅程** → [启动项目](#快速开始)
