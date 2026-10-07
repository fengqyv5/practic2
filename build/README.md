# mihomoScript.js 定制维护方案

把「上游原版」和「我的定制」彻底分开，上游更新时不需要手动合并。

## 目录结构

```
build/
  upstream.js          上游原版（自动拉取，勿手改）
  upstream.prev.js     上一次版本（自动备份，便于对比）
  patches.js           ★ 我的定制，改这里
  build.cjs            构建脚本
  fetch-upstream.cjs   拉取上游
dist/
  mihomoScript.js      构建产物 —— 订阅链接指向这个
```

## 日常更新流程

```bash
node build/fetch-upstream.cjs   # 1. 拉取上游新版
node build/build.cjs            # 2. 应用补丁 + 自检
```

两条命令跑完，把 `dist/mihomoScript.js` 传到你的托管地址即可。
构建脚本内置 8 项功能自检（规则集是否加载、ProPlus 是否按需关闭、keep-alive 值等），
**自检不通过会直接报错并退出，不会产出半成品**。

## 改定制内容

只改 `build/patches.js`，每个补丁是这个结构：

```js
{
  name: '补丁说明（报错时会显示这个名字）',
  anchor: `在上游原版中必须唯一存在的文本`,
  replacement: `替换成的新文本`,
}
```

改完直接 `node build/build.cjs` 生效，不用碰 `dist/`。

## 常用开关（改 patches.js 里补丁 #1 的默认值）

| 开关 | 默认 | 说明 |
|---|---|---|
| `保留原广告规则集` | true | 原脚本自带的 category-ads 精简集 |
| `启用AntiAD` | true | anti-AD 官方 mrs，约 10.8 万条，偏国内 |
| `启用HageziPro` | true | MiHomo-Hagezi 转换，约 19.9 万条，偏国际 |
| `启用HageziProPlus` | false | 更强，误杀风险略高 |
| `广告过滤放DNS层` | false | rcode 拦截，**确认无误杀后再开** |
| `移动端省电模式` | true | keep-alive 用 1800 而非 60 |

## 上游改动导致构建失败怎么办

报错信息会明确指出哪个补丁的锚点失效。处理步骤：

1. 打开新版 `build/upstream.js`，找到报错提示的那段结构
2. 复制它，替换 `patches.js` 里对应补丁的 `anchor`
3. 重新 `node build/build.cjs`

常见情况：
- 锚点完全找不到 → 上游重构了那段代码，结构变了
- 锚点出现多次 → 上游复制了相似代码，需要把 anchor 写得更长更精确

## 注意

- **构建脚本用 `.cjs` 后缀**（不是 `.mjs`），因为用了 CommonJS 的 `require`
- `fetch-upstream.cjs` 优先走 jsDelivr CDN，因为 raw.githubusercontent.com
  在部分网络下 TLS 握手会被拦截（curl error 35）
- `dist/mihomoScript.js` 是生成物，不要直接手改，下次构建会被覆盖
