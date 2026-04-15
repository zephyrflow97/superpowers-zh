# superpowers-zh(AI 编程超能力 · 中文增强版)

🌐 **简体中文** | [English (upstream)](https://github.com/obra/superpowers)

> 🦸 **superpowers(116k+ ⭐)完整汉化** — 让 Claude Code 和 Codex CLI 真正会干活。从头脑风暴到代码审查,从 TDD 到调试,每个 skill 都是经过实战验证的工作方法论。

Chinese community edition of [superpowers](https://github.com/obra/superpowers) — 14 translated skills for Claude Code and Codex CLI.

<!-- 效果对比 -->
<table>
<tr><td>

**没装 superpowers-zh:**
```
你:给用户模块加个批量导出功能
AI:好的,我来实现...(直接开始写代码)
    export async function exportUsers() { ... }
你:等等,格式不对,没分页,大数据量会 OOM...
```

</td><td>

**装了 superpowers-zh:**
```
你:给用户模块加个批量导出功能
AI:在开始实现之前,我需要了解几个关键问题:
    1. 导出格式是 CSV 还是 Excel?
    2. 预计数据量多大?需要异步处理吗?
    3. 有权限要求吗?
    → 给出 2-3 个方案,确认后再动手
```

</td></tr>
</table>

[![GitHub stars](https://img.shields.io/github/stars/jnMetaCode/superpowers-zh?style=social)](https://github.com/jnMetaCode/superpowers-zh)
[![npm version](https://img.shields.io/npm/v/superpowers-zh)](https://www.npmjs.com/package/superpowers-zh)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://makeapullrequest.com)


### 📊 项目规模

| 📦 翻译 Skills | 🤖 支持工具 |
|:---:|:---:|
| **14** | **Claude Code / Codex CLI** |

---

## 这是什么?

[superpowers](https://github.com/obra/superpowers) 是目前最火的 AI 编程 skills 框架(116k+ stars),为 AI 编程工具提供**系统化的工作方法论**。

**superpowers-zh** 提供 superpowers 的完整中文翻译版本,专注 Claude Code 和 Codex CLI 两个平台。

### 🤖 支持的 AI 编程工具

| 工具 | 类型 | 一键安装 | 安装目录 |
|------|------|:---:|:---:|
| [Claude Code](https://claude.ai/code) | CLI | `npx superpowers-zh --tool claude` | `.claude/skills/` |
| [Codex CLI](https://github.com/openai/codex) | CLI | `npx superpowers-zh --tool codex` | `.codex/skills/` |

> 运行 `npx superpowers-zh` 会自动检测你项目中使用的工具,将 14 个 skills 安装到正确位置。
>
> **Codex 版本会自动做"工具名渲染"**:源 skill 文件里的 Claude Code 专有工具名(Task / TodoWrite / Skill / Bash / Write)会被转换为 Codex 等价或工具中立的表达(spawn_agent / update_plan / shell 工具等),让 Codex agent 读起来毫无歧义。

### 翻译的 Skills(14 个)

| Skill | 用途 |
|-------|------|
| **头脑风暴** (brainstorming) | 需求分析 → 设计规格,不写代码先想清楚 |
| **编写计划** (writing-plans) | 把规格拆成可执行的实施步骤 |
| **执行计划** (executing-plans) | 按计划逐步实施,每步验证 |
| **测试驱动开发** (test-driven-development) | 严格 TDD:先写测试,再写代码 |
| **系统化调试** (systematic-debugging) | 四阶段调试法:定位→分析→假设→修复 |
| **请求代码审查** (requesting-code-review) | 派遣审查 agent 检查代码质量 |
| **接收代码审查** (receiving-code-review) | 技术严谨地处理审查反馈,拒绝敷衍 |
| **完成前验证** (verification-before-completion) | 证据先行——声称完成前必须跑验证 |
| **派遣并行 Agent** (dispatching-parallel-agents) | 多任务并发执行 |
| **子 Agent 驱动开发** (subagent-driven-development) | 每个任务一个 agent,两轮审查 |
| **Git Worktree 使用** (using-git-worktrees) | 隔离式特性开发 |
| **完成开发分支** (finishing-a-development-branch) | 合并/PR/保留/丢弃四选一 |
| **编写 Skills** (writing-skills) | 创建新 skill 的方法论 |
| **使用 Superpowers** (using-superpowers) | 元技能:如何调用和优先使用 skills |

---

## 快速开始

### 方式一:npm 安装(推荐)

```bash
cd /your/project
npx superpowers-zh
```

自动检测当前项目并安装对应版本。也可以显式指定工具:

```bash
npx superpowers-zh --tool claude   # Claude Code → .claude/skills/
npx superpowers-zh --tool codex    # Codex CLI   → .codex/skills/(经过 Codex 渲染)
```

### 方式二:手动安装

```bash
git clone https://github.com/jnMetaCode/superpowers-zh.git

# Claude Code (原样复制)
cp -r superpowers-zh/skills /your/project/.claude/skills

# Codex CLI (建议走 npx 方式,以便自动做工具名渲染)
cd /your/project && npx superpowers-zh --tool codex
```

详细的 Codex 安装说明见 [docs/README.codex.md](docs/README.codex.md)。

---

## Codex 渲染说明

`superpowers-zh` 的 skill 源文件按 Claude Code 的工具名(`Task` / `TodoWrite` / `Skill` / `Bash` / `Write`)编写。安装到 Codex CLI 时,bootstrap 脚本会自动把这些工具名替换成 Codex 等价或工具中立的表达:

| Claude Code 写法 | Codex 渲染后 |
|---|---|
| `调用 Skill 工具` | `按 skill 提示操作` |
| `更新 TodoWrite` | `更新任务追踪` |
| `Task("修复 X")`(代码块) | `spawn_agent("修复 X")` + `wait` |
| `使用 Task 工具,指定 superpowers:code-reviewer 类型` | `派遣子代理执行代码审查` |
| `Bash 工具` | `shell 工具` |
| `Write 工具` | `文件写入工具` |

渲染规则定义在 [bin/codex-patches.js](bin/codex-patches.js),渲染引擎在 [bin/render.js](bin/render.js)。单元测试在 [tests/render/render.test.js](tests/render/render.test.js),运行:

```bash
node tests/render/render.test.js
```

源文件(`skills/*/SKILL.md`)**完全不变**,所有 Codex 适配都在安装阶段完成。

---

## 对比上游

| 特性 | superpowers (英文) | superpowers-zh (中文) |
|------|-------------------|----------------------|
| Skills 数量 | 14 | 14(完整翻译) |
| 语言 | 英文 | 中文(技术术语保留英文) |
| 支持平台 | 多平台 | 聚焦 Claude Code + Codex CLI |
| Codex 工具名渲染 | ❌ | ✅ |
| 社区 | Discord | 微信公众号 + 微信群 |

---

## 贡献

欢迎参与!翻译改进、新增 skills、Bug 修复都可以。

### 贡献方向

我们只接收符合 superpowers 定位的 skill——**AI 编程工作流方法论**。好的 skill 应该:

- 教 AI 助手**怎么干活**,而不是某个框架/语言的教程
- 解决上游英文版不覆盖的**中国开发者痛点**
- 有明确的步骤、检查清单、示例,AI 加载后能直接执行

欢迎提 Issue 讨论你的想法!

---

## 交流 · Community

微信公众号 **「AI不止语」**(微信搜索 `AI_BuZhiYu`)— 技术问答 · 项目更新 · 实战文章

| 渠道 | 加入方式 |
|------|---------|
| QQ 群 | [点击加入](https://qm.qq.com/q/EeNQA9xCxy)(群号 1071280067) |
| 微信群 | 关注公众号后回复「群」获取入群方式 |

---

## 致谢

- 原始英文版:[obra/superpowers](https://github.com/obra/superpowers)(MIT 协议)
- 感谢 [@obra](https://github.com/obra) 创建了这个优秀的项目
- 姊妹项目:
  - [ai-coding-guide](https://github.com/jnMetaCode/ai-coding-guide) — AI 编程工具实战指南 — 66 个 Claude Code 技巧 + 9 款工具最佳实践 + 可复制配置模板
  - [agency-agents-zh](https://github.com/jnMetaCode/agency-agents-zh) — 187 个专业角色,让 AI 变成安全工程师、DBA、产品经理等
  - [agency-orchestrator](https://github.com/jnMetaCode/agency-orchestrator) — 多智能体编排引擎 — 用 YAML 编排 187 个角色协作,支持 DeepSeek/Claude/OpenAI/Ollama,零代码
  - [shellward](https://github.com/jnMetaCode/shellward) — AI 智能体安全中间件 — 注入检测、数据防泄露、命令安全、零依赖、MCP Server

---

## 许可证

MIT License — 自由使用,商业或个人均可。

---

<div align="center">

**🦸 AI 编程超能力:让 Claude Code 和 Codex CLI 真正会干活**

[Star 本项目](https://github.com/jnMetaCode/superpowers-zh) · [提交 Issue](https://github.com/jnMetaCode/superpowers-zh/issues) · [贡献代码](https://github.com/jnMetaCode/superpowers-zh/pulls)

</div>
