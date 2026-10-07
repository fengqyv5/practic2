# 定制版

加入更强的广告过滤规则集与移动端省电配置。

## 与上游的差异

在原版基础上做了 6 处改动，全部由 `build/patches.js` 声明：

| 改动 | 内容 |
|---|---|
| 新增开关 | 5 个广告过滤开关 + 1 个省电开关 |
| 规则集 | 追加 anti-AD 官方 mrs、MiHomo-Hagezi 的 HageziPro / ProPlus |
| 过滤逻辑 | 新增 `filterAdProviders()`，关掉的规则集不下载不加载 |
| DNS | 新增可选的 DNS 层拦截（默认关闭） |
| 省电 | `keep-alive-interval` 默认改为 1800 |

## 可调开关

编辑 `build/patches.js` 中第 1 个补丁的默认值，改完提交即可
（推 `patches.js` 会自动触发 Actions 重建）。

| 开关 | 默认 | 说明 |
|---|---|---|
| `保留原广告规则集` | `true` | 原脚本自带的 category-ads 精简集 |
| `启用AntiAD` | `true` | anti-AD 官方 mrs，约 10.8 万条，偏国内域名 |
| `启用HageziPro` | `true` | MiHomo-Hagezi 转换，约 19.9 万条，偏国际广告与安全 |
| `启用HageziProPlus` | `false` | 更强，误杀风险略高 |
| `广告过滤放DNS层` | `false` | rcode 拦截，**确认无误杀后再开** |
| `移动端省电模式` | `true` | `keep-alive-interval` 用 1800 而非 60 |

## 本地开发

```bash
node build/fetch-upstream.cjs   # 拉取上游最新版
node build/build.cjs            # 应用补丁 + 功能自检
```

`build.cjs` 内置 8 项自检，失败会直接报错并指出哪个补丁失效，
不会产出半成品。

## 文件说明

| 文件 | 作用 | 是否手改 |
|---|---|---|
| `build/patches.js` | 定制内容的唯一入口 | ✓ 改这里 |
| `build/upstream.js` | 上游原版基线 | ✗ 自动维护 |
| `build/build.cjs` | 构建 + 自检 | 一般不改 |
| `build/fetch-upstream.cjs` | 拉取上游 | 一般不改 |
| `dist/mihomoScript.js` | 构建产物，订阅指向它 | ✗ 不要手改 |

## 自动同步

`.github/workflows/sync.yml` 每天检查上游，有更新则自动重建并提交。
Actions 页可以手动触发，带 `force=1` 参数则强制重建。

## 免责声明

本仓库仅为个人定制配置，与上游项目及各类规则集来源无隶属关系。
规则数据来自公开渠道，不保证准确性。请自行评估后使用。
