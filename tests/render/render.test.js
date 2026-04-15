/**
 * Codex 渲染器单元测试
 *
 * 运行: node tests/render/render.test.js
 *
 * 使用 Node 内置的 assert,无外部依赖。
 * 覆盖场景:
 *   1. 简单 phrase 替换
 *   2. 长短顺序(长 phrase 优先)
 *   3. 文件级 patch(形态变化)
 *   4. 误伤保护(Task 1 / Skill-Name-With-Hyphens)
 *   5. copyAndRenderForCodex 递归 + 非 .md 原样
 */

import assert from 'assert';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  existsSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, relative, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { renderForCodex, copyAndRenderForCodex } from '../../bin/render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    if (err.expected !== undefined) {
      console.error(`     expected: ${JSON.stringify(err.expected)}`);
      console.error(`     actual:   ${JSON.stringify(err.actual)}`);
    }
    failed++;
  }
}

// ---------------------------------------------------------------------------
// 1. 简单 phrase 替换
// ---------------------------------------------------------------------------
console.log('\n[1] 简单 phrase 替换');

test('"调用 Skill 工具" → "按 skill 提示操作"', () => {
  const input = '首先,调用 Skill 工具加载技能。';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, '首先,按 skill 提示操作加载技能。');
});

test('"使用 Skill 工具" → "按 skill 提示操作"', () => {
  const input = '使用 Skill 工具去查找匹配项。';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, '按 skill 提示操作去查找匹配项。');
});

test('"更新 TodoWrite" → "更新任务追踪"', () => {
  const input = '标记完成时更新 TodoWrite 即可。';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, '标记完成时更新任务追踪即可。');
});

test('"Bash 工具" → "shell 工具"', () => {
  const input = '通过 Bash 工具调用 git 命令。';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, '通过 shell 工具调用 git 命令。');
});

test('"使用 Write 工具" → "使用文件写入工具"', () => {
  const input = '使用 Write 工具把结果保存到磁盘。';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, '使用文件写入工具把结果保存到磁盘。');
});

// ---------------------------------------------------------------------------
// 2. 长短顺序:长 phrase 必须先于短 phrase 替换
// ---------------------------------------------------------------------------
console.log('\n[2] 长短顺序(长 phrase 优先)');

test('"创建 TodoWrite" 先于 "TodoWrite" 替换', () => {
  const input = '步骤 1:创建 TodoWrite 并填入所有任务。';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, '步骤 1:创建任务追踪并填入所有任务。');
  // 关键:out 里应该有"创建任务追踪"而不是"创建 update_plan"
  assert.ok(!out.includes('update_plan'), '不应退化到单词级替换');
});

test('"用所有任务创建 TodoWrite" 完整替换', () => {
  const input = '[用所有任务创建 TodoWrite]';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, '[为所有任务创建任务追踪]');
});

test('孤立的 TodoWrite 退到单词级替换(兜底)', () => {
  const input = '参见下方关于 TodoWrite 工具的描述。';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, '参见下方关于 update_plan 工具的描述。');
});

// ---------------------------------------------------------------------------
// 3. 文件级 patch(形态变化)
// ---------------------------------------------------------------------------
console.log('\n[3] 文件级 patch(形态变化)');

test('dispatching-parallel-agents 的 Task 代码块重写', () => {
  const input = [
    '### 3. 并行分派',
    '',
    '```typescript',
    '// 在 Claude Code / AI 环境中',
    'Task("修复 agent-tool-abort.test.ts 的失败")',
    'Task("修复 batch-completion-behavior.test.ts 的失败")',
    'Task("修复 tool-approval-race-conditions.test.ts 的失败")',
    '// 三个任务并发运行',
    '```',
    '',
  ].join('\n');

  const out = renderForCodex(input, 'dispatching-parallel-agents/SKILL.md');

  assert.ok(out.includes('spawn_agent("修复 agent-tool-abort.test.ts 的失败")'));
  assert.ok(out.includes('spawn_agent("修复 batch-completion-behavior.test.ts 的失败")'));
  assert.ok(out.includes('spawn_agent("修复 tool-approval-race-conditions.test.ts 的失败")'));
  assert.ok(out.includes('wait'));
  assert.ok(!out.includes('Task("'), '不应保留任何 Task("...") 字面量');
  assert.ok(!out.includes('typescript'), '代码块语言标识应被去除');
});

test('requesting-code-review 的 Task 句子重写', () => {
  const input =
    '**2. 派遣 code-reviewer 子代理:**\n\n' +
    '使用 Task 工具，指定 superpowers:code-reviewer 类型，填写 `code-reviewer.md` 中的模板\n\n' +
    '**占位符说明:**';

  const out = renderForCodex(input, 'requesting-code-review/SKILL.md');
  assert.ok(out.includes('派遣子代理执行代码审查，参考 `code-reviewer.md` 模板'));
  assert.ok(!out.includes('使用 Task 工具'), '不应保留 Task 工具引用');
  assert.ok(!out.includes('superpowers:code-reviewer'), '不应保留 subagent_type 概念');
});

test('FILE_PATCHES 只在匹配的相对路径上生效', () => {
  // 同样的 Task 代码块,但在一个不相关的文件里
  const input = 'Task("测试") // 不应该被 FILE_PATCH 动,因为路径不匹配';
  const out = renderForCodex(input, 'some-other-skill/SKILL.md');
  // FILE_PATCH 不生效,但 GLOBAL_PATCHES 也没有一条针对裸 Task("...") 的规则,
  // 所以内容应保持原样
  assert.strictEqual(out, input);
});

// ---------------------------------------------------------------------------
// 4. 误伤保护
// ---------------------------------------------------------------------------
console.log('\n[4] 误伤保护');

test('"Task 1"(字面意思"任务 1")不被误伤', () => {
  const input = 'BASE_SHA=$(git log --oneline | grep "Task 1" | head -1)';
  const out = renderForCodex(input, 'requesting-code-review/SKILL.md');
  assert.strictEqual(out, input, '"Task 1" 应当完全不被修改');
});

test('"Skill-Name-With-Hyphens" frontmatter 示例不被误伤', () => {
  const input = [
    '---',
    'name: Skill-Name-With-Hyphens',
    'description: 示例',
    '---',
  ].join('\n');
  const out = renderForCodex(input, 'writing-skills/SKILL.md');
  assert.strictEqual(out, input);
});

test('"任务"(中文字面)不被误伤', () => {
  const input = '任务 1:实现功能。任务 2:写测试。';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, input);
});

test('正常段落不受影响', () => {
  const input = '这是一段普通的中文说明,没有任何工具名引用。';
  const out = renderForCodex(input, 'dummy.md');
  assert.strictEqual(out, input);
});

// ---------------------------------------------------------------------------
// 5. copyAndRenderForCodex:递归 + 非 .md 文件处理
// ---------------------------------------------------------------------------
console.log('\n[5] copyAndRenderForCodex 端到端');

test('递归复制目录结构,.md 文件被渲染,非 .md 文件原样', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'render-test-'));
  const srcDir = join(tmp, 'src');
  const destDir = join(tmp, 'dest');

  try {
    // 构造 fixture:
    //   src/skill-a/SKILL.md                      (带 TodoWrite,会被渲染)
    //   src/skill-a/assets/logo.png               (非 md,原样复制)
    //   src/skill-b/SKILL.md                      (不含任何工具名)
    //   src/skill-b/nested/prompt.md              (深层嵌套的 md)
    mkdirSync(join(srcDir, 'skill-a', 'assets'), { recursive: true });
    mkdirSync(join(srcDir, 'skill-b', 'nested'), { recursive: true });

    writeFileSync(
      join(srcDir, 'skill-a', 'SKILL.md'),
      '更新 TodoWrite 后继续下一步。',
      'utf8'
    );
    // 用二进制 buffer 模拟图片(0xFF 字节不是合法 UTF-8)
    writeFileSync(join(srcDir, 'skill-a', 'assets', 'logo.png'), Buffer.from([0xff, 0xd8, 0xff]));
    writeFileSync(join(srcDir, 'skill-b', 'SKILL.md'), '无工具名的正常内容。', 'utf8');
    writeFileSync(
      join(srcDir, 'skill-b', 'nested', 'prompt.md'),
      '使用 Bash 工具调用脚本。',
      'utf8'
    );

    copyAndRenderForCodex(srcDir, destDir);

    // 验证 .md 被渲染
    const skillA = readFileSync(join(destDir, 'skill-a', 'SKILL.md'), 'utf8');
    assert.strictEqual(skillA, '更新任务追踪后继续下一步。');

    // 验证非 .md 原样复制(包括二进制)
    const logo = readFileSync(join(destDir, 'skill-a', 'assets', 'logo.png'));
    assert.deepStrictEqual([...logo], [0xff, 0xd8, 0xff]);

    // 验证不含工具名的 .md 不变
    const skillB = readFileSync(join(destDir, 'skill-b', 'SKILL.md'), 'utf8');
    assert.strictEqual(skillB, '无工具名的正常内容。');

    // 验证深层嵌套的 .md 也被渲染
    const nested = readFileSync(join(destDir, 'skill-b', 'nested', 'prompt.md'), 'utf8');
    assert.strictEqual(nested, '使用 shell 工具调用脚本。');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('对真实 skills/ 目录渲染后,结果不含 Claude Code 工具名遗漏', () => {
  const projectRoot = resolve(__dirname, '..', '..');
  const realSkillsDir = join(projectRoot, 'skills');
  if (!existsSync(realSkillsDir)) {
    throw new Error('skills/ 源目录不存在');
  }

  const tmp = mkdtempSync(join(tmpdir(), 'render-real-'));
  const destDir = join(tmp, 'rendered');

  try {
    copyAndRenderForCodex(realSkillsDir, destDir);

    // 读取 6 个关键 skill 渲染后的内容,检查没有遗留的硬编码 phrase
    const dispatching = readFileSync(
      join(destDir, 'dispatching-parallel-agents', 'SKILL.md'),
      'utf8'
    );
    assert.ok(
      !dispatching.includes('Task("修复'),
      'dispatching-parallel-agents 的 Task 代码块应已被改写'
    );
    assert.ok(dispatching.includes('spawn_agent("修复'), '应包含 spawn_agent 调用');
    assert.ok(dispatching.includes('wait'), '应包含 wait 等待指令');

    const using = readFileSync(join(destDir, 'using-superpowers', 'SKILL.md'), 'utf8');
    assert.ok(!using.includes('调用 Skill 工具'), 'using-superpowers 不应保留"调用 Skill 工具"');
    assert.ok(using.includes('按 skill 提示操作'), '应已替换为中立表达');

    const subagent = readFileSync(
      join(destDir, 'subagent-driven-development', 'SKILL.md'),
      'utf8'
    );
    assert.ok(
      !subagent.includes('在 TodoWrite 中'),
      'subagent-driven-development 不应保留"在 TodoWrite 中"'
    );

    const review = readFileSync(
      join(destDir, 'requesting-code-review', 'SKILL.md'),
      'utf8'
    );
    assert.ok(
      !review.includes('使用 Task 工具，指定 superpowers:code-reviewer'),
      'requesting-code-review 的那句话应已被重写'
    );
    // 但 "grep \"Task 1\"" 这种字面量必须保留
    assert.ok(review.includes('grep "Task 1"'), '字面量 "Task 1" 必须保留');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('全目录扫描:渲染产物不含任何 Claude Code 工具名残留', () => {
  const projectRoot = resolve(__dirname, '..', '..');
  const realSkillsDir = join(projectRoot, 'skills');
  if (!existsSync(realSkillsDir)) {
    throw new Error('skills/ 源目录不存在');
  }

  const tmp = mkdtempSync(join(tmpdir(), 'render-audit-'));
  const destDir = join(tmp, 'rendered');

  try {
    copyAndRenderForCodex(realSkillsDir, destDir);

    const mdFiles = collectMdFiles(destDir);
    assert.ok(mdFiles.length > 0, '应至少渲染出一个 .md 文件');

    // 禁止在渲染产物中出现的字符串 phrase
    // (如果出现,说明 codex-patches.js 有遗漏)
    //
    // 注意:全角括号用 Unicode 转义 \uff08 / \uff09,避免
    // 编辑器/输入法把全角标点 normalize 成半角导致断言失效。
    const forbiddenStrings = [
      { pattern: 'Task tool(',              reason: '半角 Task tool' },
      { pattern: 'Task tool\uff08',         reason: '全角 Task tool' },
      { pattern: 'Task("',                  reason: 'Task(...) 代码调用' },
      { pattern: 'Task 工具',               reason: '中文 Task 工具引用' },
      { pattern: 'Skill 工具',              reason: '中文 Skill 工具引用' },
      { pattern: 'Bash 工具',               reason: '中文 Bash 工具引用' },
      { pattern: '~/.agents/skills',        reason: '错误的 Codex 路径' },
    ];

    // 禁止出现的正则(用于需要词边界的场景)
    const forbiddenRegex = [
      { pattern: /\bTodoWrite\b/, reason: '独立单词 TodoWrite' },
    ];

    const violations = [];
    for (const file of mdFiles) {
      const content = readFileSync(file, 'utf8');
      const rel = relative(destDir, file);

      for (const { pattern, reason } of forbiddenStrings) {
        if (content.includes(pattern)) {
          violations.push(`${rel}: ${reason} → 匹配 "${pattern}"`);
        }
      }
      for (const { pattern, reason } of forbiddenRegex) {
        if (pattern.test(content)) {
          violations.push(`${rel}: ${reason} → 匹配 ${pattern}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `发现 ${violations.length} 处 Claude Code 工具名残留:\n    ` +
          violations.join('\n    ')
      );
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// 辅助函数:递归收集目录下所有 .md 文件的绝对路径
function collectMdFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMdFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// 汇总
// ---------------------------------------------------------------------------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
