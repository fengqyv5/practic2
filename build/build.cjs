#!/usr/bin/env node
/**
 * 构建脚本：读取 build/upstream.js（上游原版）+ build/patches.js（自定义补丁）
 *   → 生成 dist/mihomoScript.js（可直接作为 Bettbox 订阅链接使用）
 *
 * 上游更新流程：
 *   1. node build/fetch-upstream.mjs        # 拉取最新版原版到 build/upstream.js
 *   2. node build/build.mjs                 # 重新应用补丁 + 自检
 *   3. 把 dist/mihomoScript.js 传到你的托管地址
 *
 * 补丁失效时 build.mjs 会直接报错并指出失败的补丁名，不会产出半成品。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const UPSTREAM = path.join(ROOT, 'upstream.js');
const PATCHES = path.join(ROOT, 'patches.js');
const OUT_DIR = path.join(ROOT, '..', 'dist');
const OUT_FILE = path.join(OUT_DIR, 'mihomoScript.js');

function fail(msg) {
  console.error(`\n[构建失败] ${msg}\n`);
  process.exit(1);
}

// 1. 读取上游
if (!fs.existsSync(UPSTREAM)) fail(`缺少上游文件：${UPSTREAM}`);
let src = fs.readFileSync(UPSTREAM, 'utf8');
// 统一为 LF，避免 Windows 上 CRLF 导致锚点匹配失败
if (src.includes('\r\n')) {
  src = src.replace(/\r\n/g, '\n');
  console.log('[1/5] 读取上游原版（已归一化换行符为 LF）');
} else {
  console.log(`[1/5] 读取上游原版 ${src.split('\n').length} 行`);
}

// 2. 应用补丁
const patches = require(PATCHES);
console.log(`[2/5] 应用 ${patches.length} 个补丁`);
patches.forEach((p, i) => {
  const hits = src.split(p.anchor).length - 1;
  if (hits === 0) {
    fail(`补丁「${p.name}」(#${i + 1}) 锚点在上游原版中找不到。\n` +
         `       上游可能改动了这段结构，请查看 build/patches.js 中该补丁的 anchor，\n` +
         `       对照新版 mihomoScript.js 更新锚点文本。`);
  }
  if (hits > 1) {
    fail(`补丁「${p.name}」(#${i + 1}) 锚点在上游原版中出现 ${hits} 次（应为 1 次）。\n` +
         `       请让 anchor 更精确，避免误替换。`);
  }
  src = src.replace(p.anchor, p.replacement);
  console.log(`      ✓ ${p.name}`);
});

// 3. 语法检查
try {
  new vm.Script(src, { filename: 'mihomoScript.js' });
} catch (e) {
  fail(`补丁应用后语法错误：${e.message}`);
}
console.log('[3/5] 语法检查通过');

// 4. 功能自检
const ctx = { console };
vm.createContext(ctx);
try {
  vm.runInContext(src + '\n;globalThis.__main = main;', ctx);
} catch (e) {
  fail(`补丁应用后执行错误：${e.message}`);
}

const sample = {
  proxies: [
    { name: '🇭🇰 香港 01', type: 'ss', server: 'hk.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x' },
    { name: '🇯🇵 日本 01', type: 'ss', server: 'jp.example.com', port: 443, cipher: 'aes-128-gcm', password: 'x' },
  ],
  dns: {},
};
let out;
try {
  out = ctx.__main(sample);
} catch (e) {
  fail(`main() 执行出错：${e.message}`);
}

const checks = [
  ['rule-providers 含 anti-ad', () => !!out['rule-providers']['anti-ad']],
  ['rule-providers 含 hagezi', () => !!out['rule-providers'].hagezi],
  ['rules 含 anti-ad→AdBlock', () => out.rules.includes('RULE-SET,anti-ad,AdBlock')],
  ['rules 含 hagezi→AdBlock', () => out.rules.includes('RULE-SET,hagezi,AdBlock')],
  ['ProPlus 默认未加载', () => !out.rules.some((r) => r.includes('hageziProPlus'))],
  ['AdBlock 组存在', () => out['proxy-groups'].some((g) => g.name === 'AdBlock')],
  ['keep-alive = 1800', () => out['keep-alive-interval'] === 1800],
  ['DNS 层默认未启用', () => !Object.keys(out.dns['nameserver-policy']).some((k) => /anti-ad|hagezi/.test(k))],
];
let failed = 0;
for (const [desc, fn] of checks) {
  const ok = fn();
  if (!ok) failed++;
  console.log(`      ${ok ? '✓' : '✗'} ${desc}`);
}
if (failed) fail(`功能自检 ${failed} 项未通过`);

// 5. 输出
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, src, 'utf8');
console.log(`[4/5] 功能自检全部通过`);
console.log(`[5/5] 已生成 ${path.relative(path.join(ROOT, '..'), OUT_FILE)}  (${(src.length / 1024).toFixed(1)} KB)`);
console.log(`\n完成。把 dist/mihomoScript.js 传到你的托管地址，订阅链接指向它即可。\n`);
