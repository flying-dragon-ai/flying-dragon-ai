# 第三方组件实测清单

测量时间：2026-11-13。方法：`curl -o /dev/null -w "%{http_code}"`，经 `127.0.0.1:10808` 代理。

## 结论

| 组件 | 端点 | 状态 | 处置 |
| --- | --- | --- | --- |
| GitHub 统计卡 | `github-readme-stats.vercel.app/api` | **503** | 弃用，改自绘 `assets/stats-*.svg` |
| 奖杯墙 | `github-profile-trophy.vercel.app` | **402** | 弃用，改自绘 `assets/trophy-*.svg` |
| 连续天数卡 | `github-readme-streak-stats.herokuapp.com` | 200 | 弃用，改自绘 `assets/streak-*.svg`（端点可用但依赖第三方可用性） |
| 打字动画 | `readme-typing-svg.demolab.com` | 200 | 弃用，改自绘 `assets/typing-*.svg`（SMIL 动画在 `<img>` 内可运行） |
| Star 历史 | `api.star-history.com/svg` | 200 | 保留为可选（按仓库，非按用户） |
| 贡献者墙 | `contrib.rocks/image` | 200 | 保留为可选（按仓库，非按用户） |
| 贪吃蛇 | `Platane/snk` Action → `output` 分支 | 自建 | 保留，`fetch.mjs` 探测分支存在才输出 |

## 为什么自绘

1. **可用性**：503 / 402 是真实发生的，不是理论风险。照抄模板的 README 会挂图。
2. **可控性**：配色、字号、CJK 宽度、深浅色主题都由 `scripts/svg.mjs` 决定。
3. **可审计**：SVG 是提交进仓库的文本，diff 里能看到数字变化。
4. **无速率限制**：不依赖任何第三方实例的配额。

## 自绘组件

| 文件 | 生成函数 | 数据来源 |
| --- | --- | --- |
| `assets/stats-{theme}-{dark,light}.svg` | `statCard()` | `stats.ownRepos`、`stats.totalStars`、`contributions.*` |
| `assets/heatmap-{theme}-{dark,light}.svg` | `heatmap()` | `contributions.calendar`（370 天） |
| `assets/lang-bar-{theme}-{dark,light}.svg` | `langBar()` | `stats.languages`（按字节） |
| `assets/streak-{theme}-{dark,light}.svg` | `streakCard()` | `contributions.calendar` |
| `assets/typing-{theme}-{dark,light}.svg` | `typingCard()` | `voice.tagline`、`stats.*` |
| `assets/trophy-{theme}-{dark,light}.svg` | `trophyCard()` | `stats.*`、`contributions.*`，六项指标分 A→SSS |

深浅色通过 `<picture>` + `prefers-color-scheme` 切换，GitHub 原生支持。`{theme}` 为 `openbuild`（默认）或 `lavender`（`anime` 模式），色值见 `docs/design.md` §9。

## 可选组件接入方式

Star 历史（按仓库）：

```markdown
[![Star History](https://api.star-history.com/svg?repos=OWNER/REPO&type=Date)](https://star-history.com/#OWNER/REPO&Date)
```

贡献者墙（按仓库）：

```markdown
[![Contributors](https://contrib.rocks/image?repo=OWNER/REPO)](https://github.com/OWNER/REPO/graphs/contributors)
```

贪吃蛇：由 `.github/workflows/snake.yml` 生成到 `output` 分支，`scripts/fetch.mjs` 探测到分支后自动在 README 输出。
