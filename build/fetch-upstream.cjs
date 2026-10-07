#!/usr/bin/env node
/**
 * 拉取上游最新版原版 mihomoScript.js 到 build/upstream.js
 *
 * 说明：raw.githubusercontent.com 在部分网络下 TLS 会被拦截，
 * 因此优先走 jsDelivr CDN，失败时提示改用其他镜像。
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const SOURCES = [
  'https://cdn.jsdelivr.net/gh/AIsouler/MyClash@main/Script/mihomoScript.js',
  'https://fastly.jsdelivr.net/gh/AIsouler/MyClash@main/Script/mihomoScript.js',
  'https://raw.githubusercontent.com/AIsouler/MyClash/main/Script/mihomoScript.js',
];

const OUT = path.join(__dirname, 'upstream.js');
const BACKUP = path.join(__dirname, 'upstream.prev.js');

function fetch(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('重定向次数过多'));
    https
      .get(url, { rejectUnauthorized: false, timeout: 30000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return resolve(fetch(res.headers.location, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject)
      .on('timeout', function () { this.destroy(new Error('超时')); });
  });
}

(async () => {
  const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;

  for (const url of SOURCES) {
    try {
      process.stdout.write(`  尝试 ${url.slice(8, 60)}... `);
      const text = (await fetch(url)).replace(/\r\n/g, '\n');
      if (!text.includes('function main(config)')) {
        console.log('内容校验失败（非 mihomoScript.js）');
        continue;
      }
      console.log(`成功 ${(text.length / 1024).toFixed(1)} KB`);

      if (old && old === text) {
        console.log('\n上游无变化，无需重建。');
        return;
      }
      if (old) {
        fs.writeFileSync(BACKUP, old, 'utf8');
        const oldLines = old.split('\n').length;
        const newLines = text.split('\n').length;
        console.log(`  已备份旧版到 upstream.prev.js（原 ${oldLines} 行 → 新 ${newLines} 行）`);
        if (newLines < oldLines - 5) {
          console.log('  ⚠ 上游行数明显减少，建议确认是否为上游回滚或文件变更。');
        }
      }
      fs.writeFileSync(OUT, text, 'utf8');
      console.log(`\n已更新 build/upstream.js。接着运行：node build/build.mjs`);
      return;
    } catch (e) {
      console.log(`失败（${e.message}）`);
    }
  }
  console.error('\n所有源均不可用。请手动下载 mihomoScript.js 覆盖 build/upstream.js 后重试。\n');
  process.exit(1);
})();
