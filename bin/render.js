/**
 * Codex 渲染引擎
 *
 * 把 skills/ 源目录内容渲染为 Codex 兼容版本并写入目标目录:
 *   - .md 文件:应用 FILE_PATCHES + GLOBAL_PATCHES 后写入
 *   - 其他文件(图片、脚本等):原样复制
 *
 * 使用方式:
 *   import { copyAndRenderForCodex } from './render.js';
 *   copyAndRenderForCodex('/path/to/skills', '/path/to/.codex/skills');
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  copyFileSync,
} from 'fs';
import { join, relative, sep } from 'path';

import { GLOBAL_PATCHES, FILE_PATCHES } from './codex-patches.js';

/**
 * 对单个 .md 文件内容应用 Codex patches。
 *
 * @param {string} content — 源文件全文
 * @param {string} relativePath — 相对于 skills/ 根的路径(使用正斜杠)
 * @returns {string} — 渲染后的内容
 */
export function renderForCodex(content, relativePath) {
  let out = content;

  // 1. 先应用文件级 patches(整块替换,优先级最高)
  const filePatches = FILE_PATCHES[relativePath] || [];
  for (const { match, replace } of filePatches) {
    out = out.replace(match, replace);
  }

  // 2. 再应用全局 patches(按数组顺序,长 phrase 在前)
  for (const { match, replace } of GLOBAL_PATCHES) {
    if (match instanceof RegExp) {
      out = out.replace(match, replace);
    } else {
      // String.prototype.replaceAll 是 Node 15+ 才有的,
      // 本项目 engines 声明 Node 14+,所以用 split/join 兜底
      out = out.split(match).join(replace);
    }
  }

  return out;
}

/**
 * 递归把 srcDir 的内容复制到 destDir,.md 文件经过 renderForCodex 渲染。
 *
 * @param {string} srcDir — skills/ 源目录
 * @param {string} destDir — 目标目录(如 .codex/skills)
 */
export function copyAndRenderForCodex(srcDir, destDir) {
  copyAndRenderRecursive(srcDir, destDir, srcDir);
}

/**
 * 内部递归实现。需要保留 rootSrcDir 用来计算相对路径,
 * 这样 FILE_PATCHES 的 key 才能和文件匹配上。
 */
function copyAndRenderRecursive(currentSrcDir, currentDestDir, rootSrcDir) {
  mkdirSync(currentDestDir, { recursive: true });

  for (const entry of readdirSync(currentSrcDir, { withFileTypes: true })) {
    const srcPath = join(currentSrcDir, entry.name);
    const destPath = join(currentDestDir, entry.name);

    if (entry.isDirectory()) {
      copyAndRenderRecursive(srcPath, destPath, rootSrcDir);
    } else if (entry.name.endsWith('.md')) {
      const content = readFileSync(srcPath, 'utf8');
      // FILE_PATCHES 的 key 用正斜杠,因此 Windows 下也要归一化
      const relPath = relative(rootSrcDir, srcPath).split(sep).join('/');
      const rendered = renderForCodex(content, relPath);
      writeFileSync(destPath, rendered, 'utf8');
    } else {
      // 非 .md 文件(图片、脚本、二进制资源等)原样复制
      copyFileSync(srcPath, destPath);
    }
  }
}
