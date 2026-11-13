# Autoresearch: README.md → iOS 26 Liquid Glass

## Objective

把 `flying-dragon-ai/flying-dragon-ai` 的 README 渲染效果推到 iOS 26「液态玻璃」：
半透明反光玻璃、光影流动、壁纸透过元素若隐若现、大圆角、磨砂质感、低饱和渐变。

**硬约束（决定了技术路线）**：GitHub 会剥掉 README 里的 `<style>`、`class`、`style=""`、JS。
唯一能承载视觉的载体是 `<img>` 加载的 SVG —— 它支持渐变、滤镜（feGaussianBlur /
feDropShadow / feTurbulence）、SMIL 动画和内部 CSS。所以「液态玻璃」必须画在
`scripts/svg.mjs` 生成的 SVG 里，不是写在 Markdown 里。

## Metrics

- **Primary**: `lgf` (Liquid Glass Fidelity, 0–100, higher is better)
- **Target**: 85（到 85 后继续找结构性改进，不提前停）
- **Secondary**: `translucency` `specular` `refraction` `rim` `depth` `radius` `palette` `motion`
  —— 每个都是 0–100 的分项，用来定位下一步该动哪里

`lgf` 由 `scripts/score.mjs` 从**实际生成的 SVG 源码**算出，权重：

| 分项 | 权重 | 测什么 |
| --- | --- | --- |
| translucency | .20 | alpha < 0.85 的半透明层数量（背景能透出来） |
| specular | .20 | 对角线性渐变里有白色低透明度 stop，且被 overlay rect 引用 |
| refraction | .15 | feGaussianBlur 的 stdDeviation |
| rim | .10 | 卡片描边是浅色低透明度（顶部受光） |
| depth | .12 | feDropShadow 层数 + 渐变 stop 数 |
| radius | .08 | rx / min(w,h)，对标 iOS 26 的 0.12 |
| palette | .10 | 所有 hex 到 Apple 官方色板的平均距离 |
| motion | .05 | 作用于光影的 `<animate>` 数量 |

**这个指标是代理，不是真理。** 它只测「结构上有没有做出玻璃」，测不出「好不好看」。
每轮必须同时看渲染截图：`lgf` 涨了但画面变丑 → 照样 discard。

## How to Run

```bash
bash autoresearch.sh        # render + score，输出 METRIC 行
bash autoresearch.checks.sh # 硬闸门：SVG 合法性 / 数字一致性
```

## Files in Scope

| 文件 | 作用 |
| --- | --- |
| `scripts/svg.mjs` | **主战场**。所有卡片生成器：cardFrame / statCard / langBar / heatmap / typingCard / trophyCard |
| `templates/report.mjs` | 默认 README 的排版结构 |
| `templates/blocks.mjs` | 原语层（pic / hero / 各 block） |
| `site/style.css` | Pages 站点的液态玻璃（这里可以用真的 backdrop-filter） |
| `site/index.html` `site/app.js` | 站点结构 |
| `docs/design.md` | 记录设计依据 |

## Off Limits

- `data/profile.json`（只由 `gh` 写）
- `scripts/fetch.mjs` 的采集逻辑
- `scripts/verify.mjs` 的闸门判定（可以加检查，不能放宽）
- `scripts/score.mjs` 的**权重和判定阈值**（改指标 = 作弊）
- 私有仓库过滤、词边界聚类

## Constraints

- `verify.mjs --offline` 必须 PASS：24 份 SVG 全部合法 XML、数字与 profile.json 一致
- 十种模式（report/bento/minimal/code/terminal/dynamic/game/anime/pixel/swiss）全部可渲染
- 只用 Apple 官方色板，不引入新色相
- 不引入第三方渲染器、不引入运行时依赖
- 不为了刷分加无意义的渐变/滤镜：每个视觉元素都要在截图里看得出来

## What's Been Tried

（每轮追加）

- baseline：`lgf=24.26`。translucency 0 / specular 0 / refraction 0 / rim 0 / motion 0，
  depth 75（有阴影但渐变只有 2 stop），radius 100（0.255 已经很圆），palette 72.6。
  结论：卡片是**不透明渐变 + 单层阴影**，完全没有玻璃的三要素（半透明、高光、折射）。
