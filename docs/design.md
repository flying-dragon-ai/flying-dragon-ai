# 设计说明：第一性原理重构 GitHub 个人主页

## 1. 先拆问题，再挑模板

个人主页不是一张图片，它要同时完成四件事：

| 目标 | 问题 | 本仓库的答案 |
| --- | --- | --- |
| 身份 | 访客 3 秒内知道你是谁、做什么 | `data/voice.json` 里的一句话定位 + 两段自述 |
| 证据 | 凭什么信 | 全部数字来自 `gh`，仓库按真实主题聚类 |
| 下一步 | 点哪里 | 精选仓库表 + 仓库地图 + 3D 城市入口 |
| 不腐烂 | 半年后还准不准 | `gh` 拉数据 → 模板渲染 → CI 每日刷新 |

模板只能解决第 3 项的一部分。所以这里不复制模板，而是把模板拆成**数据 + 设计系统 + 渲染器**三层。

## 2. 数据流

```
gh CLI  ──►  data/profile.json  ──┐
                                  ├──►  templates/*.mjs  ──►  README.md
data/voice.json ──────────────────┘                     ├──►  assets/*.svg
                                                        └──►  site/data.json ──► site/
```

四个阶段，各自可单独运行：

| 阶段 | 命令 | 输入 | 输出 | 是否联网 |
| --- | --- | --- | --- | --- |
| 采集 | `node scripts/fetch.mjs` | GitHub API | `data/profile.json` | 是 |
| 渲染 | `node scripts/render.mjs` | `profile.json` + `voice.json` | `README.md`、`out/README.<mode>.md` | 否 |
| 站点 | `node scripts/site.mjs` | 同上 | `site/data.json` | 否 |
| 校验 | `node scripts/verify.mjs` | `README.md` | 退出码 | 是 |

渲染阶段不联网，所以同一份 `profile.json` 永远渲染出同一份 README。这让 diff 有意义：README 变了，要么数据变了，要么模板变了。

## 3. 事实与声音分离

- `data/profile.json` —— **只由 `gh` 写入**，不手改。仓库数、star、语言字节、贡献日历、聚类结果都在这里。
- `data/voice.json` —— **只由人写入**。定位句、自述、页脚。这是唯一允许出现主观表达的地方。
- `data/taxonomy.json` —— 聚类规则。关键词表 + 覆盖表 + 排除表，声明式，改这里不改渲染器。

三者分开的好处：数据刷新不会覆盖你写的文案；改文案不需要重新联网。

## 4. 聚类是算出来的，不是手贴的

`scripts/fetch.mjs` 把每个仓库的 `name + description + topics` 拼成小写字符串，按 `taxonomy.json` 的关键词表**首次命中**归类，`overrides` 处理例外，`exclude` 剔除占位仓库。

当前结果（15 个公开自有仓库）：

| 方向 | 数量 |
| --- | --- |
| Agent 基础设施 | 8 |
| 3D 与交互式 Web | 3 |
| 小程序与产品 MVP | 2 |
| Windows 内部与安全工具 | 1 |
| 社区与元信息 | 1 |

新增仓库会自动落进对应桶里，不需要改 README。

## 5. 语言占比按字节，不按 primaryLanguage

`primaryLanguage` 是 GitHub 猜的主语言。这里对每个仓库调用 `GET /repos/{owner}/{repo}/languages`，把字节数累加后再算百分比。结果更接近真实工作量分布：

```
TypeScript 28.5% · Python 28.4% · JavaScript 21.1% · HTML 11.5% · C# 2.5% · Swift 2.3% ...
```

## 6. 为什么不用第三方卡片

2026-11-13 实测（见 `docs/widgets.md`）：

- `github-readme-stats.vercel.app` → **503**
- `github-profile-trophy.vercel.app` → **402**

照抄模板的 README 会直接挂两张破图。所以统计卡、贡献热力图、语言条、打字动画、连续天数卡全部由 `scripts/svg.mjs` 自己生成，提交进 `assets/`，README 用相对路径引用。

结果：README 里**零个第三方渲染器**。唯一的外部图片是头像。

## 7. 设计系统

`templates/blocks.mjs` 是唯一的原语层：`hero` / `introBlock` / `statsBlock` / `langBlock` / `heatBlock` / `featuredBlock` / `clustersBlock` / `dynamicBlock` / `footerBlock`，外加 CJK 宽度正确的 `box` / `pad`。

十种模式只是这些原语的不同组合，全部读同一份 `profile.json`：

| 模式 | 风格 | 对应参考 |
| --- | --- | --- |
| `report` | 字节跳动汇报体：结论先行 → 概览 → OKR → 重点项目 → 能力分布 → 交付节奏 → 下一步（**默认**） | 内部汇报 / OKR 复盘 |
| `bento` | 网格卡片，信息密度最高 | rs readme studio 的 bento 网格 |
| `minimal` | 极简，三段话 + 三张卡 | short-and-sweet / 极简风 |
| `code` | 全部塞进一个 TypeScript 文件 | code-styled / 代码风格型 |
| `terminal` | 终端会话，所有数字是命令输出 | 终端绿 |
| `dynamic` | 动态模块优先 | dynamic-realtime / 动态实时 |
| `game` | 玩家卡 + 成就 + 任务 | 游戏模式 / git city |
| `anime` | 角色卡 + 技能树 + 图鉴，樱色配色 | 动漫 / 角色卡 |
| `pixel` | 8-bit HUD + 方块进度条 | 复古像素 8-bit |
| `swiss` | 编号分节、大写标签、严格网格 | 瑞士国际主义 |

配色也是参数：`scripts/svg.mjs` 的 `PALETTES` 提供 `openbuild`（默认）与 `lavender`（`anime` 模式使用），每种主题各生成深浅两套 SVG。

切换：`node scripts/render.mjs --mode game`，或 `--all` 一次生成十份到 `out/`。

## 8. 参考清单的去留

逐条对照，采纳什么、丢弃什么、为什么。

| 参考 | 采纳 | 丢弃 |
| --- | --- | --- |
| `abhisheknaiidu/awesome-github-profile-readme` | 分类思路（游戏 / 代码 / 动态 / 极简） | 直接克隆别人的主页 |
| `kautukkundan/Awesome-Profile-README-templates` | short-and-sweet、code-styled、dynamic-realtime、elaborate 的骨架 | 静态 Markdown 复制 |
| `rzashakeri/beautify-github-profile` | 效果清单，作为 `docs/widgets.md` 的候选池 | 逐个堆叠徽章 |
| `iuricode/readme-template` | 7 类模板的受众划分 → 基础信息（`minimal`）、代码风格（`code`）、数据统计（`bento` / `swiss`）、综合展示（`bento`） | 与本人仓库无关的通用段落；职业经历 / 技能图标 / 数据分析三类没有对应素材，未强行凑 |
| 精美 GitHub 个人主页模板大全（100+ 社区合集） | 风格谱系（简约 / 创意 / 技术感）作为模式划分依据 | 逐个收录 |
| `rs` readme studio | 极简风、暗黑霓虹（`site/` 深色科技主题）、bento 网格、终端绿、复古像素 8-bit、瑞士国际主义 | 编辑杂志（无排版素材）；星系图谱（无数据支撑） |
| `rahuldkjain/gh-profile-readme-generator` | 表单式生成的思路 → 换成 `data/voice.json` | 生成器产出的固定排版 |
| `jackyzou2510/home` | 打字机、随机图片位（头像）、一言（`voice.json` 的 `quotes`） | 看板娘、音乐播放器（与定位无关，且引入第三方资源） |
| `quietseek/home` | Vue 3 深色科技主题 → 零依赖等价实现、粒子动画背景、霓虹光效、滚动入场、打字机、响应式 | Vue 运行时（静态站不需要） |
| `srizzon/git-city` | `game` 模式里的 3D 城市入口 | 嵌入 iframe |
| 动态打字特效 | 自绘 `assets/typing-*.svg`（SMIL 在 `<img>` 内可运行） | `readme-typing-svg` 第三方端点 |
| GitHub 统计卡片 | 自绘 `assets/stats-*.svg` | `github-readme-stats`（实测 503） |
| 奖杯墙 | 自绘 `assets/trophy-*.svg`：六项指标按绝对阈值分 A→SSS 六档 | `github-profile-trophy`（实测 402） |
| 贪吃蛇贡献图 | `snake.yml` 生成到 `output` 分支，`fetch.mjs` 探测后自动接入 | — |

## 9. 配色：从 openbuild.xyz 实测

2026-11-13 抓取 `https://openbuild.xyz/` 的两份 CSS（`_next/static/css/*.css`，共 612 KB）并用 Playwright 读取渲染后的计算样式，取到的是**实际生效**的色值，不是主题变量里的默认值。

站点锁定 `data-theme="light"`，不跟随 `prefers-color-scheme`，所以主视觉是浅色。

| 角色 | 色值 | 来源 |
| --- | --- | --- |
| 页面底色 | `#F8F8F8` | 计算样式 `backgroundColor` |
| 卡片 | `#FFFFFF` | 同上 |
| 主文字 / 主按钮 | `#1A1A1A` | 同上，出现 992 次 |
| 近黑卡片 | `#0A0A0A` | 同上 |
| **薄荷绿（签名色）** | `#01DB83` | 同上，作为色块背景出现 48 次 |
| 薰衣草紫 | `#CB9BFA` | 同上 |
| 奶油黄 | `#F8FD91` | 同上 |
| 卡片圆角 | `16px` | 同上 |

设计语言：**黑白单色底 + 高饱和色块 + 16px 圆角 + 粗字重 + 大数字**。薄荷绿在浅色下是**填充色**（黑字压在上面），在深色下才是**文字色**——这条规则直接写进了 `PALETTES`：

```js
openbuild.light = { accent: '#1A1A1A', cardBg: '#01DB83', cardText: '#1A1A1A', ... }
openbuild.dark  = { accent: '#01DB83', cardBg: '#1A1A1A', cardText: '#01DB83', ... }
```

`statCard()` 因此渲染成真正的色块，而不是白底彩字。`PALETTES` 里缺 `cardBg` 时会回退到面板色，避免出现黑底黑字的隐形卡片。

语言条改用 `categorical` 色板（薄荷 / 薰衣草 / 奶油 / 墨黑），直接来自参考站的四张色块卡片。

## 10. 汇报体：结论先行

默认模式从 `bento` 换成 `report`，骨架是内部汇报的固定结构：

| 段 | 作用 |
| --- | --- |
| 首屏 | 一句话结论：仓库数 + 产品线 + 贡献量 |
| 结论块 | 色块承载，先说结论再说细节 |
| 一、概览 | 指标 / 数值 / 口径三列，每个数字带口径 |
| 二、目标与关键结果 | O + KR + 数据 + 状态，状态由数据算出 |
| 三、重点项目 | 做了什么 / 结果 / 栈，结果列写量化产出 |
| 四、能力分布 | 语言字节占比 + 仓库地图 |
| 五、交付节奏 | 热力图 + 等宽数字块 |
| 六、下一步 | 三条，全部由当前数据推出 |

**数字不手写。** `voice.json` 里只有带 `{slot}` 的句子，`render.mjs` 用 `slots(profile)` 把 `{ownRepos}`、`{contributions}`、`{agentCount}` 等替换成 `profile.json` 的真实值。写错一个数字的唯一方式是把字面量写进 voice.json，而 `verify.mjs` 的 SVG 一致性检查会拦住渲染层的漂移。

## 11. 维护

- `.github/workflows/refresh.yml` —— 每天 03:17 UTC 重新采集、渲染、提交；`taxonomy.json` / `voice.json` / 模板变更也会触发。
- `.github/workflows/snake.yml` —— 生成贪吃蛇到 `output` 分支。`fetch.mjs` 会探测该分支是否存在，存在才在 README 里输出贪吃蛇区块，所以首次部署不会出现破图。
- `.github/workflows/pages.yml` —— 部署 `site/` 到 GitHub Pages。
- `scripts/verify.mjs` —— 本地闸门：本地资源必须存在，远程链接必须 2xx。私有仓库会在这里暴露成 404，`fetch.mjs` 已按 `isPrivate` 过滤。
