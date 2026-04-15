#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, copyFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { copyAndRenderForCodex } from './render.js';

// Node 14/16 兼容:cpSync 在 Node 16.7+ 才可用
function copyDirSync(src, dest) {
  if (typeof cpSync === 'function') {
    cpSync(src, dest, { recursive: true });
    return;
  }
  // 手动递归复制(兼容 Node 14+)
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
const SKILLS_SRC = resolve(__dirname, '..', 'skills');
const AGENTS_SRC = resolve(__dirname, '..', 'agents');
const PROJECT_DIR = process.cwd();

// 只支持 Claude Code 和 Codex CLI 两个平台
//
// Claude Code:
//   - 项目级目录: .claude/skills
//   - 原样复制源文件
//
// Codex CLI:
//   - 项目级目录: .codex/skills (Codex CLI 启动时扫描此路径)
//   - 用户级目录: ~/.codex/skills
//   - 检测: .codex 目录 或 AGENTS.md 元数据文件
//   - 源文件通过 copyAndRenderForCodex 做工具名渲染
//
// 注意:OpenAI Developers 门户文档里提到的 .agents/skills 是另一个 Skills
// 标准(跨 agent 通用规范),不是 Codex CLI 本身的行为。参见 openai/codex
// issue #10424 和 #9696 确认 Codex CLI 实际使用 .codex/skills。
const TARGETS = [
  { name: 'Claude Code', dir: '.claude/skills', detect: '.claude' },
  { name: 'Codex CLI',   dir: '.codex/skills',  detect: ['.codex', 'AGENTS.md'] },
];

function countDirs(dir) {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).length;
}

// 工具名称别名映射(用户输入 -> TARGETS.name)
const TOOL_ALIASES = {
  'claude':       'Claude Code',
  'claude-code':  'Claude Code',
  'claudecode':   'Claude Code',
  'codex':        'Codex CLI',
  'codex-cli':    'Codex CLI',
};

function showHelp() {
  console.log(`
  superpowers-zh v${PKG.version} — AI 编程超能力中文版

  用法:
    npx superpowers-zh                   自动检测工具并安装
    npx superpowers-zh --tool claude     指定 Claude Code
    npx superpowers-zh --tool codex      指定 Codex CLI
    npx superpowers-zh --help            显示帮助
    npx superpowers-zh --version         显示版本

  支持的工具名:
    ${Object.keys(TOOL_ALIASES).join(', ')}

  说明:
    自动检测当前项目使用的 AI 编程工具,将 ${countDirs(SKILLS_SRC)} 个 skills 安装到对应目录。
    - Claude Code → .claude/skills (原样复制)
    - Codex CLI   → .codex/skills (经过 Codex 渲染:工具名转换等)

  项目: https://github.com/jnMetaCode/superpowers-zh
`);
}

function installForTarget(target) {
  const dest = resolve(PROJECT_DIR, target.dir);
  mkdirSync(dest, { recursive: true });

  if (target.name === 'Claude Code') {
    copyDirSync(SKILLS_SRC, dest);
  } else if (target.name === 'Codex CLI') {
    copyAndRenderForCodex(SKILLS_SRC, dest);
  }

  const count = countDirs(dest);
  console.log(`  ✅ ${target.name}: ${count} 个 skills -> ${dest}`);

  // agents/ 只复制给 Claude Code(Codex 没有这个概念)
  if (target.name === 'Claude Code' && existsSync(AGENTS_SRC)) {
    const agentsDest = resolve(PROJECT_DIR, '.claude', 'agents');
    mkdirSync(agentsDest, { recursive: true });
    copyDirSync(AGENTS_SRC, agentsDest);
  }
}

function install(forceToolName) {
 try {
  console.log(`\n  superpowers-zh v${PKG.version} — AI 编程超能力中文版\n`);

  if (!existsSync(SKILLS_SRC)) {
    console.error('  ❌ 错误:skills 源目录不存在,请重新安装 superpowers-zh。');
    process.exit(1);
  }

  console.log(`  源: ${countDirs(SKILLS_SRC)} 个 skills`);
  console.log(`  目标项目: ${PROJECT_DIR}\n`);

  // --tool 指定安装
  if (forceToolName) {
    const target = TARGETS.find(t => t.name === forceToolName);
    if (!target) {
      console.error(`  ❌ 未知工具: ${forceToolName}`);
      process.exit(1);
    }
    installForTarget(target);
    console.log('\n  安装完成!重启你的 AI 编程工具即可生效。\n');
    return;
  }

  // 自动检测
  let installed = 0;

  for (const target of TARGETS) {
    const detects = Array.isArray(target.detect) ? target.detect : [target.detect];
    const found = detects.some(d => existsSync(resolve(PROJECT_DIR, d)));
    if (found) {
      installForTarget(target);
      installed++;
    }
  }

  if (installed === 0) {
    console.log('  ⚠️  未检测到 Claude Code 或 Codex CLI 的项目标识。\n');
    console.log('  请用 --tool 明确指定:');
    console.log('    npx superpowers-zh --tool claude');
    console.log('    npx superpowers-zh --tool codex\n');
    console.log('  现在将默认安装 Claude Code 版本到 .claude/skills/\n');

    installForTarget(TARGETS[0]); // 默认 Claude Code
  }

  console.log('\n  安装完成!重启你的 AI 编程工具即可生效。\n');
 } catch (err) {
    console.error(`  ❌ 安装失败: ${err.message}`);
    process.exit(1);
 }
}

const args = process.argv.slice(2);
const helpIdx = args.findIndex(a => a === '--help' || a === '-h');
const versionIdx = args.findIndex(a => a === '--version' || a === '-v');
const toolIdx = args.findIndex(a => a === '--tool' || a === '-t');

if (helpIdx !== -1) {
  showHelp();
} else if (versionIdx !== -1) {
  console.log(PKG.version);
} else if (toolIdx !== -1) {
  const toolArg = args[toolIdx + 1];
  if (!toolArg) {
    console.error('  ❌ --tool 需要指定工具名,例如: --tool claude\n');
    showHelp();
    process.exit(1);
  }
  const toolName = TOOL_ALIASES[toolArg.toLowerCase()];
  if (!toolName) {
    console.error(`  ❌ 未知工具: ${toolArg}`);
    console.error(`  支持的工具: ${Object.keys(TOOL_ALIASES).join(', ')}\n`);
    process.exit(1);
  }
  install(toolName);
} else if (args.length > 0 && args[0].startsWith('-')) {
  console.warn(`  未知参数: ${args[0]}\n`);
  showHelp();
  process.exit(1);
} else {
  install();
}
