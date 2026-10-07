/**
 * 自定义补丁集 —— 与上游解耦
 *
 * 用法：上游 mihomoScript.js 更新后，只需重新运行 build.mjs 即可重新生成定制版。
 * 每个补丁用「锚点 → 替换」的形式声明，锚点在上游原版中必须唯一存在。
 *
 * 新增补丁时照抄现有结构即可；若上游改动导致锚点失效，
 * build.mjs 会报错并指出是哪个补丁失败，不会产出半成品。
 */

const ANTI_AD_URL =
  'https://cdn.jsdelivr.net/gh/privacy-protection-tools/anti-ad.github.io@master/docs/mihomo.mrs';
const HAGEZI_BASE = 'https://cdn.jsdelivr.net/gh/MiHomoer/MiHomo-Hagezi@release/';

module.exports = [
  // ---------------------------------------------------------------- 1. 新增开关
  {
    name: '新增广告过滤与省电开关',
    anchor: `  链式代理: false, // 是否启用链式代理（自定义节点作为落地节点，经“链式中转”策略组中转）
};`,
    replacement: `  链式代理: false, // 是否启用链式代理（自定义节点作为落地节点，经“链式中转”策略组中转）

  // --- 广告过滤增强选项 ---
  保留原广告规则集: true, // 是否保留脚本自带的 category-ads 精简规则集（作为兜底）
  启用AntiAD: true, // 是否启用 anti-AD 官方 mihomo 规则集（约 10.8 万条，偏重国内域名）
  启用HageziPro: true, // 是否启用 MiHomo-Hagezi 转换的 HageziPro（约 19.9 万条，偏重国际广告与安全）
  启用HageziProPlus: false, // 是否启用 HageziProPlus（更强，误杀风险略高，体积略大于 Pro）
  广告过滤放DNS层: false, // 是否额外在 DNS 层用 rcode 拦截（命中即不解析；开启前请先观察日志确认无误杀）

  // --- 移动端省电选项 ---
  移动端省电模式: true, // true = keep-alive-interval 用 1800（减少射频唤醒，移动端推荐）
  //  false = 用原值 60（频繁保活探测，连接恢复更快但更耗电）
};`,
  },

  // ------------------------------------------------- 2. 规则集地址 + 开关映射（模块级）
  {
    name: '新增规则集地址常量与开关映射',
    anchor: `// 规则集 URL 公共前缀
const ruleSetBaseUrl = 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/';`,
    replacement: `// 规则集 URL 公共前缀
const ruleSetBaseUrl = 'https://fastly.jsdelivr.net/gh/appshubcc/bett-rules@meta/geo/';

// --- 广告过滤规则集地址（均为 mrs 二进制格式，behavior: domain，走 trie 匹配）---

// anti-AD 官方发布的 mihomo 专用版本，需 mihomo >= 1.18.7
const antiAdRuleSetUrl = '${ANTI_AD_URL}';

// MiHomo-Hagezi 将 HaGeZi 明文规则转换为 mrs 的第三方转换仓库（非 HaGeZi 官方）
const hageziRuleSetBaseUrl = '${HAGEZI_BASE}';

// 广告规则集开关映射：未启用的规则集既不下载也不加载，避免无谓的内存与解析开销。
// 必须定义在模块级——buildFunctionalGroups 与 buildDnsAndHostsConfig 都要用到。
const adProviderSwitches = {
  'category-ads': ruleOptionsEnable.保留原广告规则集,
  'anti-ad': ruleOptionsEnable.启用AntiAD,
  hagezi: ruleOptionsEnable.启用HageziPro,
  hageziProPlus: ruleOptionsEnable.启用HageziProPlus,
};`,
  },

  // ------------------------------------------------------- 3. AdBlock 追加三个规则集
  {
    name: 'AdBlock 追加 anti-AD / HageZi 规则集',
    anchor: `      'category-ads': {
        ...ruleProviderCommonDomain,
        url: \`\${ruleSetBaseUrl}geosite/category-ads.mrs\`,
        path: './ruleset/category-ads.mrs',
        'path-in-bundle': 'geo/geosite/category-ads.mrs',
      },
    },
    icon: \`\${iconBaseUrl}AdBlock.svg\`,
    rules: ['RULE-SET,category-ads,AdBlock'],`,
    replacement: `      // 脚本自带精简集，作为兜底保留
      'category-ads': {
        ...ruleProviderCommonDomain,
        url: \`\${ruleSetBaseUrl}geosite/category-ads.mrs\`,
        path: './ruleset/category-ads.mrs',
        'path-in-bundle': 'geo/geosite/category-ads.mrs',
      },
      // anti-AD 官方 mrs：约 10.8 万条，国内 .cn 域名与 App 内置广告覆盖更好
      'anti-ad': {
        ...ruleProviderCommonDomain,
        url: antiAdRuleSetUrl,
        path: './ruleset/anti-ad.mrs',
      },
      // MiHomo-Hagezi 转换的 HageziPro：约 19.9 万条，国际广告、钓鱼、挖矿、诈骗
      hagezi: {
        ...ruleProviderCommonDomain,
        url: \`\${hageziRuleSetBaseUrl}HageziPro.mrs\`,
        path: './ruleset/HageziPro.mrs',
      },
      hageziProPlus: {
        ...ruleProviderCommonDomain,
        url: \`\${hageziRuleSetBaseUrl}HageziProPlus.mrs\`,
        path: './ruleset/HageziProPlus.mrs',
      },
    },
    icon: \`\${iconBaseUrl}AdBlock.svg\`,
    rules: [
      'RULE-SET,category-ads,AdBlock',
      'RULE-SET,anti-ad,AdBlock',
      'RULE-SET,hagezi,AdBlock',
      'RULE-SET,hageziProPlus,AdBlock',
    ],`,
  },

  // --------------------------------------- 4. 按开关过滤 providers 与 rules（避免空载）
  {
    name: '按开关过滤广告规则集',
    anchor: `  for (const svc of orderedServiceConfigs) {
    if (!ruleOptionsEnable[svc.name]) continue;

    functionalRules.push(...(svc.rules || []));
    Object.assign(finalRuleProviders, svc.providers || {});
  }`,
    replacement: `  // 广告规则集按开关过滤：未启用的既不下载也不加载，避免无谓的内存与解析开销
  const filterAdProviders = (svc) => {
    if (svc.name !== 'AdBlock') return svc;

    const providers = Object.fromEntries(
      Object.entries(svc.providers || {}).filter(([key]) => adProviderSwitches[key] !== false),
    );
    const rules = (svc.rules || []).filter((rule) => {
      const match = rule.match(/^RULE-SET,([^,]+),/);
      return match ? adProviderSwitches[match[1]] !== false : true;
    });

    return { ...svc, providers, rules };
  };

  for (const svc of orderedServiceConfigs.map(filterAdProviders)) {
    if (!ruleOptionsEnable[svc.name]) continue;

    functionalRules.push(...(svc.rules || []));
    Object.assign(finalRuleProviders, svc.providers || {});
  }`,
  },

  // --------------------------------------------------- 5. 可选的 DNS 层拦截（默认关）
  {
    name: '新增 DNS 层广告拦截选项',
    anchor: `      'rule-set:cn': chinaDNS,
    },`,
    replacement: `      'rule-set:cn': chinaDNS,
      // DNS 层广告拦截：命中即返回空 NOERROR，域名彻底不解析。
      // 放在 rule-set:cn 之后，避免广告规则抢在国内规则前面。
      // 默认关闭——rcode 命中无兜底，误杀会导致页面直接白屏且日志无痕迹，
      // 建议先保持 rules 层 REJECT（可在面板切 PASS 放行），确认无误杀后再开启。
      ...(ruleOptionsEnable.广告过滤放DNS层
        ? {
            ...(adProviderSwitches['anti-ad'] ? { 'rule-set:anti-ad': 'rcode://success' } : {}),
            ...(adProviderSwitches.hagezi ? { 'rule-set:hagezi': 'rcode://success' } : {}),
            ...(adProviderSwitches.hageziProPlus
              ? { 'rule-set:hageziProPlus': 'rcode://success' }
              : {}),
          }
        : {}),
    },`,
  },

  // ------------------------------------------------------------- 6. 移动端省电
  {
    name: 'keep-alive-interval 移动端省电',
    anchor: `  newConfig['keep-alive-interval'] = 60;`,
    replacement: `  // 移动端省电：keep-alive 探测越频繁，射频唤醒越多，耗电越高。
  // 1800 是社区移动端配置常用值（参考 OpenClash issue #2614）。
  newConfig['keep-alive-interval'] = ruleOptionsEnable.移动端省电模式 ? 1800 : 60;`,
  },
];
