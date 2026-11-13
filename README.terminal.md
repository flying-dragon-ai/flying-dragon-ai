<div align="center">

<img src="https://avatars.githubusercontent.com/u/58673960?v=4" width="104" alt="flying-dragon-ai">

# flying~dragon

**终端里长出来的主页**

`open to work` · `flying-dragon-ai` · since 2019

</div>

## 我是谁

agent 基础设施：把模型能力包成能装、能跑、能交付的东西 —— pi 扩展、subagent 工厂、skill 打包、AIGC 流水线。

3D Web：Three.js / WebGL / 单文件离线包，浏览器里跑得动的真 3D。

Windows 内部工具：只读审计、端点对抗、零依赖 PowerShell。

> 当前主线：pi 生态的扩展与 subagent 编排。

```console
$ gh api users/flying-dragon-ai --jq '.name,.public_repos,.followers'
flying~dragon
15
6

$ gh repo list flying-dragon-ai --limit 300 --json name | jq length
67

$ gh api graphql -f query=@contrib.graphql
contributions(12mo)  313
commits              148
pull requests        16
issues               12
active days          70 / 370
peak day             2026-06-21 (24)

$ tokei --sort code
Python 35.8%  JavaScript 19.6%  TypeScript 18.2%  HTML 14.3%

$ ls ~/work
winsec/  agent/  web3d/  product/  community/
```

<div align="center"><picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/lang-bar-openbuild-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="assets/lang-bar-openbuild-light.svg">
  <img src="assets/lang-bar-openbuild-light.svg" alt="language mix by bytes" width="720">
</picture></div>

## 仓库地图

| 方向 | # | 仓库 |
| --- | --- | --- |
| **Windows 内部与安全工具** | 1 | [win-raccoon-lab](https://github.com/flying-dragon-ai/win-raccoon-lab) |
| **Agent 基础设施** | 8 | [super-agentic-diner](https://github.com/flying-dragon-ai/super-agentic-diner) · [knowledge-takeback-skill](https://github.com/flying-dragon-ai/knowledge-takeback-skill) · [seedance-agent](https://github.com/flying-dragon-ai/seedance-agent) · [pi-smart-search](https://github.com/flying-dragon-ai/pi-smart-search) · [smartsearch](https://github.com/flying-dragon-ai/smartsearch) · [pi-subagent-factory](https://github.com/flying-dragon-ai/pi-subagent-factory) · +2 |
| **3D 与交互式 Web** | 3 | [tihuqiche](https://github.com/flying-dragon-ai/tihuqiche) · [pet-world](https://github.com/flying-dragon-ai/pet-world) · [mom_remember](https://github.com/flying-dragon-ai/mom_remember) |
| **小程序与产品 MVP** | 2 | [Pocket_Travel_Companion](https://github.com/flying-dragon-ai/Pocket_Travel_Companion) · [Shibi_Gallery](https://github.com/flying-dragon-ai/Shibi_Gallery) |
| **社区与元信息** | 1 | [openhongguo-community](https://github.com/flying-dragon-ai/openhongguo-community) |

<div align="center">

数据由 gh CLI 拉取后静态渲染，不接受手工维护。

**[flying-dragon-ai](https://github.com/flying-dragon-ai)** · 15 repos · 6 stars · 313 contributions / 12mo

<sub>README 由 `gh` 拉取真实数据后渲染 · 最后更新 2026-11-13</sub>

</div>
