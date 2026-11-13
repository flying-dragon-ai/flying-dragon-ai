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

六种模式只是这些原语的不同组合：

| 模式 | 风格 | 对应参考 |
| --- | --- | --- |
| `bento` | 网格卡片，信息密度最高（**默认**） | rs readme studio 的 bento 网格 |
| `minimal` | 极简，三段话 + 三张卡 | short-and-sweet |
| `code` | 全部塞进一个 TypeScript 文件 | code-styled |
| `terminal` | 终端会话，所有数字是命令输出 | 终端绿 |
| `dynamic` | 动态模块优先 | dynamic-realtime |
| `game` | 玩家卡 + 成就 + 任务 | 游戏模式 / git city |

切换：`node scripts/render.mjs --mode game`，或 `--all` 一次生成六份到 `out/`。

## 8. 参考清单的去留

| 参考 | 采纳 | 丢弃 |
| --- | --- | --- |
| `abhisheknaiidu/awesome-github-profile-readme` | 分类思路（游戏/代码/动态/极简） | 直接克隆别人的主页 |
| `kautukkundan/Awesome-Profile-README-templates` | short-and-sweet / code-styled / dynamic-realtime 三种模式的骨架 | 静态 Markdown 复制 |
| `rzashakeri/beautify-github-profile` | 效果清单（作为 `docs/widgets.md` 的候选池） | 逐个堆叠徽章 |
| `iuricode/readme-template` | 7 类模板的受众划分 | 与本人仓库无关的通用段落 |
| `rahuldkjain/gh-profile-readme-generator` | 表单式生成的思路 → 这里换成 `voice.json` | 生成器产出的固定排版 |
| `srizzon/git-city` | `game` 模式里的 3D 城市入口 | 嵌入 iframe |
| `jackyzou2510/home`、`quietseek/home` | 打字机、粒子背景、滚动入场 → `site/` | 看板娘、音乐播放器（与定位无关） |
| 统计卡 / 奖杯墙 / 贪吃蛇 | 贪吃蛇（`snake.yml`，自建分支） | 统计卡与奖杯墙（503 / 402） |

## 9. 维护

- `.github/workflows/refresh.yml` —— 每天 03:17 UTC 重新采集、渲染、提交；`taxonomy.json` / `voice.json` / 模板变更也会触发。
- `.github/workflows/snake.yml` —— 生成贪吃蛇到 `output` 分支。`fetch.mjs` 会探测该分支是否存在，存在才在 README 里输出贪吃蛇区块，所以首次部署不会出现破图。
- `.github/workflows/pages.yml` —— 部署 `site/` 到 GitHub Pages。
- `scripts/verify.mjs` —— 本地闸门：本地资源必须存在，远程链接必须 2xx。私有仓库会在这里暴露成 404，`fetch.mjs` 已按 `isPrivate` 过滤。
