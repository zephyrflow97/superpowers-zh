/**
 * Codex 渲染替换规则
 *
 * 源 skill 文件按 Claude Code 工具名(Task / TodoWrite / Skill / Bash / Write)写就。
 * 本文件定义了把这些 Claude Code 专有措辞转换为 Codex/中立表达的替换规则。
 *
 * 两层替换,按优先级从高到低:
 *   1. FILE_PATCHES  — 针对特定文件的整块替换(处理形态变化:1 行 → N 行)
 *   2. GLOBAL_PATCHES — 全局字符串/正则替换(处理 phrase-level 替换)
 *
 * ⚠️ GLOBAL_PATCHES 的顺序非常重要:长 phrase 必须排在短 phrase 之前,
 *    否则短 phrase 会吞掉长 phrase 的匹配。例如:必须先替换 "创建 TodoWrite",
 *    再替换独立的 "TodoWrite",不能反过来。
 *
 * 两个常见陷阱和应对:
 *   - **尾部空格**:原文 "更新 TodoWrite 后",match "更新 TodoWrite" 被替换后会
 *     留下一个孤立空格 → "更新任务追踪 后"。应对:相关 patch 用正则并加 ` ?` 吸收。
 *   - **子串碰撞**:"Write 工具" 会吃掉 "TodoWrite" 里的 "Write 工具" 子串。
 *     应对:用 `\bWrite` 词边界,防止匹配到 "oWrite"。
 */

// ---------------------------------------------------------------------------
// 全局 phrase-level 替换规则(按长→短顺序排列)
// ---------------------------------------------------------------------------
export const GLOBAL_PATCHES = [
  // === 长词组(带上下文的完整短语,安全性最高) ===
  // 注意:这些 phrase 的结束字符是中文(如"完成""待办")或符号(如 ]、"),
  // 不会有尾部空格问题,用字符串即可。
  { match: '用所有任务创建 TodoWrite', replace: '为所有任务创建任务追踪' },
  { match: '使用 TodoWrite 为下面的每个清单项创建待办', replace: '为下面的每个清单项创建任务追踪' },
  { match: '为每个条目创建 TodoWrite 待办', replace: '为每个条目创建任务追踪' },
  { match: '在 TodoWrite 中标记任务完成', replace: '在任务追踪中标记任务完成' },
  { match: '记录上下文,创建 TodoWrite', replace: '记录上下文,创建任务追踪' },

  // === Skill 工具 —— Codex 没有 "Skill 工具" 这个概念,用中立表达 ===
  { match: '调用 Skill 工具', replace: '按 skill 提示操作' },
  { match: '使用 Skill 工具', replace: '按 skill 提示操作' },

  // === Task tool prompt 头部(子代理提示词文件里的工具指定行) ===
  //
  // 注意:全角括号用 Unicode 转义 \uff08 / \uff09,避免编辑器/输入法
  // 把全角标点自动 normalize 成半角导致 match 失效。真实源文件里
  // brainstorming/spec-document-reviewer-prompt.md:10 和
  // writing-plans/plan-document-reviewer-prompt.md:10 用的就是全角括号。
  { match: 'Task tool (general-purpose):',          replace: 'spawn_agent (general-purpose):' },
  { match: 'Task tool (superpowers:code-reviewer):', replace: 'spawn_agent (code-reviewer):' },
  { match: 'Task tool\uff08通用\uff09:',             replace: 'spawn_agent\uff08通用\uff09:' },

  // === Bash 工具 phrase ===
  { match: '在 Bash 工具调用上设置', replace: '在 shell 工具调用上设置' },
  { match: '通过 Bash 工具调用', replace: '通过 shell 工具调用' },

  // === Write 工具 phrase(用 \b 防 TodoWrite 误伤) ===
  { match: /使用 Write 工具/g, replace: '使用文件写入工具' },

  // === 中等词组(带 ` ?` 吸收尾部空格) ===
  // "创建 TodoWrite X" → 吃掉尾部空格,避免替换后留下 "创建任务追踪 X"
  { match: /创建 TodoWrite ?/g, replace: '创建任务追踪' },
  { match: /更新 TodoWrite ?/g, replace: '更新任务追踪' },
  { match: 'TodoWrite 清单', replace: '任务追踪清单' },
  { match: 'TodoWrite 待办', replace: '任务追踪待办' },
  { match: 'Bash 工具', replace: 'shell 工具' },
  // \b 词边界确保不匹配 "TodoWrite 工具" 里的 "Write 工具"
  { match: /\bWrite 工具/g, replace: '文件写入工具' },

  // === 单词级兜底(风险最高,必须放最后) ===
  // 独立的 TodoWrite 引用(前面所有组合都没覆盖的孤立出现)
  { match: /\bTodoWrite\b/g, replace: 'update_plan' },

  // === 路径修正 ===
  // 上游 writing-skills/SKILL.md:12 里写的是 ~/.agents/skills/(OpenAI Agents SDK
  // 标准),不是 Codex CLI 的实际路径。Codex CLI 启动时扫描的是 ~/.codex/skills。
  // 参见 openai/codex issue #10424 和 #9696。
  { match: '~/.agents/skills', replace: '~/.codex/skills' },
];

// ---------------------------------------------------------------------------
// 文件级整块替换(优先级高于 GLOBAL_PATCHES)
// key 是相对于 skills/ 根的路径(正斜杠,跨平台)
// ---------------------------------------------------------------------------
export const FILE_PATCHES = {
  // dispatching-parallel-agents: 把 Task("X")\nTask("Y")\nTask("Z") 代码块
  // 改写成 spawn_agent("X") + spawn_agent("Y") + spawn_agent("Z") + wait
  'dispatching-parallel-agents/SKILL.md': [
    {
      match: /```typescript\n\/\/ 在 Claude Code \/ AI 环境中\nTask\("([^"]+)"\)\nTask\("([^"]+)"\)\nTask\("([^"]+)"\)\n\/\/ 三个任务并发运行\n```/,
      replace:
        '```\n# 派遣多个子代理并行执行\nspawn_agent("$1")\nspawn_agent("$2")\nspawn_agent("$3")\nwait  # 等待全部完成\n```',
    },
  ],

  // requesting-code-review: "使用 Task 工具,指定 superpowers:code-reviewer 类型"
  // 这句需要重写,因为 Codex 没有 "subagent type" 概念
  'requesting-code-review/SKILL.md': [
    {
      match: '使用 Task 工具，指定 superpowers:code-reviewer 类型，填写 `code-reviewer.md` 中的模板',
      replace: '派遣子代理执行代码审查，参考 `code-reviewer.md` 模板',
    },
  ],
};
