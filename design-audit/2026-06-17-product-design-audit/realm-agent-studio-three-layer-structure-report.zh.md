# Realm Agent Studio 三层产品结构报告

日期：2026-06-17

## 1. 产品设计结论

Realm Agent Studio 不应该把全部复杂性直接塞进 3D HUD 里。更合理的产品结构是：

1. Spatial Overview：用来表达系统形态、状态和工作流拓扑。
2. Docked Workbench：用来承载高密度、精确、可验证的表单编辑。
3. Review Gate：在任何公开成功声明前，证明 candidate、owner review、admitted write path 和失败边界。

这样既能保留未来感和沉浸感，又不会把复杂的 owner 操作变成不可读的视觉装饰。3D 层不是表单，它是空间化的指挥入口，用来把 owner 路由到真正精确的工作台。

## 2. 产品权威边界与现有表面

Realm Agent Studio 的范围是当前登录用户自己创建并拥有的公开 Realm Agents。它不是通用 Agent 管理后台，不是 LocalAgent runtime 控制台，不是 Forge-imported system curation 工具，也不是 world NPC 后台。

当前 app 路由已经体现出产品表面模型：

| Route | 产品表面 | 结构角色 |
| --- | --- | --- |
| `/portfolio` | Owner portfolio | Spatial Overview 入口与 portfolio 扫描 |
| `/portfolio/create` | Agent 创建 | Docked Workbench + Review Gate |
| `/portfolio/:agentId` | Agent cockpit/detail | 单个 Agent 的 Spatial Overview |
| `/portfolio/:agentId/settings` | Settings 读取/编辑 | Docked Workbench |
| `/portfolio/:agentId/settings/review` | Settings proposal/review | Review Gate |
| `/portfolio/:agentId/assets` | 身份、媒体、voice candidates | Docked Workbench + candidate history |
| `/portfolio/:agentId/posts` | Agent-authored post 草稿/发布 | Docked Workbench + Review Gate |
| `/portfolio/:agentId/posts/schedule` | 单条本地 schedule | Docked Workbench；仅 app-local |
| `/portfolio/:agentId/insights` | Source-backed insights | Spatial Overview 指标表面 |
| `/ai-config` | Runtime AI route 配置 | Capability/control surface |

## 3. 当前字段与能力清单

### 3.1 Portfolio 字段

Portfolio list 当前会归一化这些字段：

| 字段 | 含义 | 来源姿态 | UI 层 |
| --- | --- | --- | --- |
| `id` | Realm Agent/user projection id | Realm source-backed | Overview/detail |
| `displayName` | 公开展示名称 | Realm source-backed | Overview + Workbench |
| `handle` | 公开 handle | Realm source-backed | Overview + Workbench |
| `coverUrl` / `profileCoverUrl` | 公开 cover 读取投影 | 只读投影；cover owner 写入仍阻塞 | Overview/detail |
| `avatarUrl` | Avatar URL 读写选择表面 | owner review 后的 Avatar URL selection 已准入 | Overview + Assets Workbench |
| `ownerScope` | `owner-created` | 必须保持 current-user owner-created | Overview 边界标识 |
| `realmState` | Realm state evidence | 只读 evidence，不是 Studio 生命周期 | Overview 状态 |
| `worldName` / world evidence | World attachment/read evidence | Realm source-backed | Overview + Create Workbench |
| `updatedAt` | 最近更新 evidence | 读取 evidence | Overview 排序 |
| `friendCount` | 第一版指标 | 只有 source-backed 且字段存在时可展示；不可用不是 0 | Overview metric |

Portfolio controls 当前包含 query、filter、sort。`friendCount` filter 支持 available/unavailable 两种状态。这正是 3D 总览层适合发挥作用的地方：它可以展示 portfolio 拓扑和健康状态，但不暴露可编辑字段。

### 3.2 Agent 创建字段

创建草稿当前包含：

| 字段 | 角色 | Realm create 是否必需 | 所属层 |
| --- | --- | --- | --- |
| `handle` | 公开 handle | 是，并需要 handle availability preflight | Workbench + Review Gate |
| `displayName` | 公开身份 | 是 | Workbench + Review Gate |
| `concept` | 创建概念/worldview seed | 是 | Workbench + Graph |
| `description` | 公开 profile 文本 | 创建/更新可选 | Workbench |
| `ruleText` | 可见行为规则 candidate | 创建 rules 可选；不是默认 owner raw editing | Advanced/review only |
| `selectedWorldId` | 必需 Realm world id | 是，必须来自 source-backed world list | Workbench + Review Gate |
| `dnaPrimary` | 必需 archetype | 是 | Workbench |
| `dnaSecondary` | 可选 traits | 可选 | Workbench |
| `referenceImageUrl` | 经过 review 的视觉参考 URL | 可选；不是 public asset truth | Identity candidate lane |
| `originalDescription` | Owner seed text | 仅 client-local；不提交给 Realm | Graph/source evidence |

当前 `dnaPrimary` 准入的 primary archetypes 是：`CARING`、`PLAYFUL`、`INTELLECTUAL`、`CONFIDENT`、`MYSTERIOUS`、`ROMANTIC`。

当前 `dnaSecondary` 准入的 secondary traits 是：`HUMOROUS`、`SARCASTIC`、`GENTLE`、`DIRECT`、`OPTIMISTIC`、`REALISTIC`、`DRAMATIC`、`PASSIONATE`、`REBELLIOUS`、`INNOCENT`、`WISE`、`ECCENTRIC`。建议最多选择 3 个。

当 handle、display name、concept、selected world、`dnaPrimary`、source-backed world evidence 或当前 handle availability check 缺失时，创建 readiness 必须 fail closed。

### 3.3 Agent Creation Graph Sections

Agent Creation Graph 是处理“复杂但不混乱”的正确模型。现有 graph sections 包括：

| Graph section | 用途 | 建议 UI 处理 |
| --- | --- | --- |
| `identity` | display name、handle、profile description | Workbench form group |
| `dna` | primary archetype、secondary traits | Workbench selection group |
| `behavior` | 可见 behavior notes/rules candidate | Advanced review group |
| `worldview` | concept anchor | Workbench text group |
| `greeting` | follow-up settings candidate | Deferred lane |
| `communicationVoice` | 推导出的 communication style | Candidate lane |
| `contentVoice` | post-studio voice | Candidate lane |
| `visualBrief` | avatar/profile cover visual brief | Identity Studio lane |
| `voiceBrief` | voice demo brief | Identity Studio lane |
| `postBrief` | first post ideas | Content/Post Studio lane |
| `sourceProvenance` | owner description/manual/card/remix evidence | Source drawer |
| `missingDecisions` | 未解决的产品决策 | Review Gate checklist |
| `riskNotes` | forbidden/private/unadmitted fields | Review Gate warning rail |
| `writePlan` | admitted create/update/candidate/deferred actions | Review Gate payload map |

这个 graph 不应该被渲染成一个塞满输入框的巨大可编辑图。它应该作为结构化导航和审阅索引存在。详细编辑应该进入 docked workbench。

### 3.4 Owner Settings 字段

Owner settings draft 当前包含：

| 分组 | 字段 |
| --- | --- |
| Identity | `displayName`、`description`、`greeting`、`publicRole`、`worldview` |
| Natural language | `naturalLanguageIntent` |
| Personality | `personalitySummary`、`relationshipMode`、`interestsText`、`goalsText` |
| Communication | `contentStyle`、`formality`、`responseLength`、`sentiment` |
| Boundaries | `allowedThemesText`、`disallowedThemesText` |
| Positioning | `targetAudience`、`positioning` |
| Expert/review only | `rawRuleTextCandidate` |

Settings update input 会把这些字段映射到：

- 顶层 `displayName`、`description`、`greeting`、`naturalLanguageIntent`；
- `identity.publicRole`、`identity.worldview`；
- `personality.summary`、`personality.relationshipMode`、`personality.interests`、`personality.goals`；
- `communication.contentStyle`、`communication.formality`、`communication.responseLength`、`communication.sentiment`；
- `boundaries.allowedThemes`、`boundaries.disallowedThemes`；
- `positioning.targetAudience`、`positioning.positioning`。

Owner settings 禁止字段包括：`handle`、`worldId`、`avatarUrl`、`profileCoverUrl`、`provider`、`model`、`localAgent`、`lifecycle`、`state`、`dna`、`agentRule`、`agentRules`、`ruleText`。

这个字段数量说明了为什么 3D HUD 不能成为编辑表面。Settings 必须进入一个高密度但稳定的工作台：左侧 section index，中间编辑区，右侧 proposal/diff/validation rail。

### 3.5 Identity、Media、Voice Candidate 字段

Identity pack 可以从当前 Agent 的 source-backed 字段生成候选 prompts：

| Candidate | 当前状态 | 公开写入姿态 |
| --- | --- | --- |
| `avatar` | candidate-only | owner URL review 后 Avatar URL selection 已准入 |
| `profile-cover` | candidate-only | owner-scoped profile cover 写入阻塞 |
| `portrait-reference` | candidate-only | Resource-to-Agent Binding 阻塞 |
| `post-image-style` | candidate-only | 仅 post attachment candidate |
| `voice-demo` | candidate-only | voice publication 阻塞 |

Media candidate inputs：

| Candidate 类型 | 字段 |
| --- | --- |
| Visual image | `resourceType`、`bindingPoint`、`prompt`、`notes`、`aspectRatio` |
| Avatar package | visual image 字段 + `packageTarget`、`motionNotes`、`interactionNotes` |
| Voice demo | `scriptText` |

已准入的 candidate 常量：

- Resource types：`IMAGE`、`VIDEO`、`AUDIO`；当前 visual generation 会归一到 `IMAGE`。
- Binding points：`AGENT_AVATAR`、`AGENT_PORTRAIT`、`AGENT_CANDIDATE`、`AGENT_VOICE_SAMPLE`。
- Avatar package targets：`SPRITE2D`、`LIVE2D`、`VRM`。

UI 应该把这部分当成 Identity Studio：source context、generation request、candidate output、publication boundary 四个状态必须分开。不能因为 Runtime 生成了图片或音频，就暗示它已经是 public asset truth。

### 3.6 Post 与 Schedule 字段

Local post draft 字段：

| 字段 | 用途 | 边界 |
| --- | --- | --- |
| `caption` | Realm post caption | publishable draft 必需 |
| `tagsText` | 逗号分隔 tags | publish 前仍是 candidate |
| `humanReviewed` | owner review 确认 | publish/schedule 前必需 |
| `attachmentEnabled` | attachment 开关 | candidate |
| `attachmentTargetType` | `RESOURCE`、`ASSET` 或 `BUNDLE` | 必须是 canonical envelope type |
| `attachmentTargetId` | target id | attachment 启用时必需 |

Post candidate payload 包含：

- `candidate: true`；
- source `realm-agent-studio.local-post-draft`；
- 来自 canonical owner detail 的 agent reference；
- `realmCreatePost.attachments`；
- optional `caption`；
- optional `tags`；
- `review.humanReviewed: true`。

Forbidden post payload keys 包括：`worldId`、`id`、`authorId`、`scheduledAt`、`scheduleId`、`queue`、`campaign`、`recurrence`、`publicSuccess`、`publishSuccess`、`moderationSuccess`、`provider`、`modelResolved` 和 LocalAgent 字段。

Local schedule 字段：

| 字段 | 用途 | 边界 |
| --- | --- | --- |
| `localDate` | 本地日期 | app-local |
| `localTime` | 本地时间 | app-local |
| `localRunAt` | 归一化本地执行时间 | app-local |
| `appLocalOnly` | 显式边界 | 必须保持 true |
| `execution.mode` | foreground when due | 不是 Realm queue |
| `realmPublish` | pending owner app open | 不是 publish success |

这部分应该属于 Post Studio workbench，而不是 3D orbit panel。空间层可以展示“存在一条本地 schedule”或“post publish gate blocked”，但 caption/tags/attachments 的编辑必须回到 2D。

## 4. 建议的三层产品结构

### 4.1 Layer 1：Spatial Overview

目的：让用户在系统级理解产品。

这一层应该展示：

- portfolio constellation：每个 owner-created public Realm Agent 是一个节点；
- 当前 Agent identity core；
- graph completeness rings：identity、DNA、worldview、media、voice、post；
- review status：candidate、reviewed、write-ready、blocked、deferred；
- 只展示已准入的高层指标：`friendCount` available/unavailable；
- failure states 作为一等产品状态：Realm unavailable、permission missing、route unbound、source unavailable。

这一层不应该展示：

- 长文本输入；
- raw JSON payload；
- 完整 settings fields；
- attachment IDs；
- raw rule content；
- LocalAgent runtime state；
- provider/model routing details，除非是在 AI config context。

推荐视觉组件：

- Agent identity core。
- Orbiting module rails：Portfolio、Creation Graph、Settings、Identity Studio、Post Studio、Metrics。
- Status ribbons：`source-backed`、`candidate-only`、`owner-review-required`、`Realm-write-required`、`blocked`。
- 进入 workbench sections 的 spatial breadcrumbs。

### 4.2 Layer 2：Docked Workbench

目的：在不丢失上下文的情况下，支持精确的高密度编辑。

Workbench 应该是稳定的 2D 产品表面。它可以漂浮在 3D 场景里，但可编辑控件必须像严肃软件一样稳定、可聚焦、可键盘操作、可验证。

推荐布局：

| 区域 | 角色 |
| --- | --- |
| Left rail | Graph/field group navigation 和 completion state |
| Center canvas | 真正的表单字段、inputs、selects、uploads、textareas |
| Right rail | AI proposal、validation、source evidence、write plan preview |
| Bottom/action rail | Save draft、generate candidate、review、submit to Realm |

Workbench modules：

1. Create Workbench
   - Identity：handle、display name、description。
   - Concept/worldview：concept、original description。
   - World：source-backed list、OASIS default、selected-world preview。
   - DNA：primary archetype、secondary traits。
   - Behavior：visible behavior notes/rule lines，作为 advanced candidate。
   - Visual reference：reference image URL 和 generation prompt。

2. Settings Workbench
   - Natural-language intent。
   - Identity/public role/worldview。
   - Personality/interests/goals。
   - Communication style/formality/length/sentiment。
   - Boundaries allowed/disallowed themes。
   - Target audience/positioning。
   - Raw rule candidate 只能作为 deferred expert review。

3. Identity Studio Workbench
   - 从 source-backed fields 构建 identity pack。
   - 生成 visual image candidates。
   - 生成 avatar package design sheet。
   - 上传 reviewed identity image Resource。
   - 选择 reviewed avatar URL。
   - 合成 voice demo。
   - 维护 `publicTruth: false` 的 local creative history。

4. Post Studio Workbench
   - 编写 caption 和 tags。
   - 可选 attachment envelope target。
   - Runtime post copy proposal。
   - Human review checkbox。
   - 通过 Realm create post 发布。
   - 单条 app-local schedule candidate。

5. Insights Workbench
   - `friendCount` 仅在 source-backed 时展示。
   - source unavailable 必须展示为不可用状态，而不是 0。
   - 不展示 trend、post performance、profile views、reactions、revenue 或 health score。

### 4.3 Layer 3：Review Gate

目的：防止 false success，并让 truth boundary 可见。

每个关键工作流都需要在公开声明前经过 Review Gate：

| Workflow | Candidate state | Review requirement | Public success condition |
| --- | --- | --- | --- |
| Create Agent | draft + graph | owner 接受 required graph sections | Realm create 返回带 `id` 的 canonical object |
| Settings update | draft/proposal | owner-reviewed changed fields | owner settings update 通过 admitted path 成功 |
| Avatar URL | URL draft | owner-reviewed valid URL | avatar select call 确认成功 |
| Visual image | Runtime image artifact | owner review | 除非有 admitted write path，否则没有 public profile truth |
| Avatar package | design sheet/rigging brief | owner review | 未发布；未来仍需要 artifacts |
| Voice demo | Runtime audio artifact | owner review | 除非有 admitted path，否则不是 public voice truth |
| Post | local post draft | human reviewed | Realm `PostsService.createPost` 返回 canonical post id |
| Schedule | reviewed local post candidate | local date/time future | 只创建 app-local schedule；不是 Realm publish |
| Metric | read projection | source present | 有值才展示；缺失就是 source unavailable |

Review Gate UI 应包含：

- `What will be written`：精确的 admitted target。
- `What will remain local`：candidates、drafts、local history。
- `What is blocked`：owner binding、profile cover write、raw rule review、unready attachment。
- `What source backs this`：Realm service、Runtime capability、local-only store。
- `Forbidden fields detected`：lifecycle、provider/model、LocalAgent、post worldId 等。
- `Failure recovery`：保留 draft/candidate，并明确失败 source。

## 5. 如何解决“3D 网站里字段很多”的问题

错误做法是让 3D hero 承载表单。这会带来视觉噪音、可访问性差、键盘行为差、生成文字不可读，以及玩具感很强的控制界面。

产品级解法是 progressive density：

1. 3D 层展示形态和状态。
2. 用户选择一个模块。
3. 模块打开 docked workbench，使用真实控件。
4. AI 辅助填充 candidate fields，但不能隐藏来源。
5. Review Gate 解释什么会成为 Realm truth，什么仍是 candidate/local。
6. canonical result 返回后，Spatial Overview 再更新状态。

这样网站可以保持视觉冲击力，同时核心工作仍然精确。

## 6. 网站 / Demo 的推荐信息架构

如果要把它做成宣传站或概念 demo，第一段滚动体验建议是：

### Section A：Spatial Command Entry

- Headline：`Realm Agent Studio`。
- Subline：`Operate public Realm Agents as durable Agent IP`。
- 3D identity core，周围有六个 orbit modules。
- Minimal chips：`Owner-created`、`Candidate-first`、`Realm truth`、`Fail-closed`。

### Section B：From Overview To Workbench

展示从 3D module 进入 docked workbench 的过渡。建议先用 Creation Graph 做例子，因为它最能解释整个产品结构。

### Section C：Create Workbench

展示真实的高密度字段分组：

- Identity。
- World。
- DNA。
- Behavior。
- Visual reference。
- Write plan。

重点是证明产品可以处理真实表单复杂性，而不是只有炫酷首屏。

### Section D：Owner Settings Review

把 AI proposal 展示成 candidate patch：

- current field；
- proposed value；
- changed key；
- owner accept/reject；
- forbidden field warning；
- raw rule review deferred。

### Section E：Identity Studio

展示 candidate generation 和 blocked publication truth：

- avatar candidate；
- profile cover candidate blocked；
- portrait/reference candidate blocked；
- voice demo candidate；
- local history `publicTruth: false`。

### Section F：Post Studio And Schedule

展示：

- caption/tags/attachment envelope；
- human review required；
- Realm publish result required；
- single local schedule as foreground-only local candidate。

### Section G：Source-Backed Metrics

展示：

- `friendCount` if present；
- source unavailable if absent；
- 不发明 zero、trend、performance 或 health score。

## 7. 组件级建议

### Spatial Overview Components

- Agent Node：avatar/initial、display name、handle、source state。
- Completeness Ring：graph sections ready/needs decision/blocked。
- Truth Path：candidate -> owner review -> admitted write -> Realm confirmation。
- Source Badge：Realm、Runtime、app-local。
- Failure Beacon：typed failure state。

### Workbench Components

- Section Navigator with counts：required、optional、candidate、blocked。
- Field Row with source posture：editable、source-backed read-only、deferred、blocked。
- Proposal Diff：current/proposed/changed keys/rationale。
- Evidence Drawer：service source、payload preview、rule ids。
- JSON Technical Preview 放在 disclosure 后面，不能作为主界面。
- Sticky Action Rail：Save Draft、Generate Candidate、Review、Submit。

### Review Gate Components

- Submit Target Card：`POST /api/agent`、`PATCH /api/me/agents/{agentId}/settings`、`PostsService.createPost` 等。
- Candidate Ledger：local draft、Runtime artifact、local history、app-local schedule。
- Blocked Writes Ledger：profile cover owner write、Resource-to-Agent Binding、voice publication、raw rule read。
- Forbidden Field Detector：用精确字段名展示。
- Success Contract：必须有 canonical object/id。

## 8. 3D 方向的设计规则

1. 不要把完整表单渲染成漂浮 HUD 碎片。
2. 3D 用于导航、拓扑、状态和转场。
3. 2D 用于文字输入、校验、payload review、upload 和 decision。
4. Spatial panels 在未选中前保持抽象。
5. 所有长文本编辑都放进稳定的 workbench panels。
6. source unavailable 要作为可见状态，而不是隐藏 fallback。
7. blocked/deferred states 要成为一等视觉状态。
8. candidate 和 public truth 必须视觉区分。
9. 不暴露 LocalAgent private runtime、private memory 或 chat transcript。
10. 除非 admitted Realm operation 成功，否则不能暗示 Realm publication。

## 9. 建议的下一份设计稿

下一步最有价值的 artifact 不是再做一张纯 hero render，而是一张 composite screen：

- 左侧 35%：浅色 3D Spatial Overview，展示当前 Agent 和 module map；
- 右侧 65%：Docked Create Workbench，展示真实分组字段；
- 底部或右侧 rail：Review Gate summary，展示 write plan、blocked/deferred lanes。

这张图能证明真正解决表单密度问题的设计答案：沉浸式环境 + 精确的工业级编辑。

## 10. 实现含义

如果后续做 coded prototype：

- 3D scene 应该是包裹真实 React controls 的 shell，而不是 controls 的替代品。
- Workbench panels 应使用现有 `@nimiplatform/kit` interaction system。
- Three.js 负责 spatial background、module nodes 和 transitions。
- React 负责所有字段、form state、diff、validation 和 review action。
- Runtime-generated images 应作为真实资产使用，不能用 CSS/SVG stand-ins 伪装。
- 生成 hero 图里的文字必须由真实 DOM text 替代。
- Keyboard/focus behavior 属于 2D workbench layer。
- Review gate 应以结构化数据编码，不能只是视觉 copy。

## 11. 总结

Realm Agent Studio 可以做到视觉沉浸，同时不牺牲产品严谨性，前提是结构要明确：

- Spatial Overview：展示产品拓扑和 source-backed state。
- Docked Workbench：精确编辑复杂字段。
- Review Gate：证明 owner review、admitted write path 和 truth boundary。

这是让 Realm Agent Studio 成为未来工业级产品，而不是装饰性 3D dashboard 的结构。
