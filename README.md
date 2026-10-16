# 洛谷屏蔽讨论与题解（保留犇犇）

一个 Tampermonkey 用户脚本，用于屏蔽洛谷中容易分散注意力的讨论入口和题解页面，同时保留犇犇，并按钩子等级给用户名染色。

## 功能

- 屏蔽洛谷主页的"最近讨论"板块
- 屏蔽题目详情页的"相关讨论"板块
- 隐藏题目详情页的算法标签
- 阻止访问题目题解页面
  - `/problem/solution/...`
  - `/problem/{ID}/solution`
- 拦截讨论链接点击
- 保留犇犇（`/benben`）相关入口
- 白名单放行钩子等级说明帖 `/discuss/142324`
- 按钩子等级给用户名染色（绿 / 蓝 / 金三种流光效果）
- 支持 React 动态渲染内容

## 安装

### 前置要求

1. 在浏览器中安装 [Tampermonkey](https://www.tampermonkey.net/)
2. 确认浏览器已启用 Tampermonkey 扩展

### 从 GitHub 安装

点击下方链接，Tampermonkey 会弹出安装页面：

[安装脚本](https://raw.githubusercontent.com/GX6zm/luogu-blocker/main/luogu-blocker.user.js)

### 手动安装

1. 打开 Tampermonkey 管理面板
2. 点击"添加新脚本"
3. 删除默认内容，粘贴 `luogu-blocker.user.js` 的全部代码
4. 按 `Ctrl + S` 保存
5. 打开洛谷，脚本自动生效

## 使用

安装后无需额外操作，直接访问洛谷即可。

| 页面 | 效果 |
|------|------|
| 洛谷主页 | 隐藏"最近讨论"板块 |
| 题目详情页 | 隐藏"相关讨论"板块、算法标签 |
| 题解页面 | 整页拦截，显示屏蔽提示 |
| 讨论链接 | 点击无效，相关链接隐藏 |
| `/discuss/142324`（钩子说明帖） | **白名单放行，正常访问** |
| 犇犇 | 保留，不受影响 |
| 用户名 | 按钩子等级显示不同颜色的流动效果 |

## 钩子染色

脚本会按每个用户的 OI 程序设计能力等级（钩子）给用户名加上不同颜色的流光效果：

| 等级 | 钩子 | 效果 |
|------|------|------|
| 1 ~ 5 | 绿钩 | 翡翠色渐变流动 |
| 6 ~ 7 | 蓝钩 | 深海色渐变 + 脉冲 |
| 8 ~ 10 | 金钩 | 鎏金色渐变流动 + 光晕 |
| 0 | 无钩 | 保持原样 |

### 数据来源

脚本会根据页面类型选择最优数据源：

- **关注列表页**（`/user/{uid}/following`）：读取页面内嵌的 `lentille-context` JSON 中的 `ccfLevel` 字段
- **其他页面**（首页、题目页、个人主页等）：读取用户名链接后面的 `<a class="sb_amazeui"><svg fill="...">` 颜色

两种数据源互补，无需额外发起网络请求。

### 开关

通过 Tampermonkey 菜单可以随时开关钩子染色：

> Tampermonkey 面板 → 本脚本 → **切换：钩子染色**

开关状态保存在 `localStorage`，刷新后保留。

## 白名单

以下链接不受屏蔽影响：

- `/discuss/142324` —— 钩子等级说明帖
- `/discuss/show/142324` —— 同上（旧版链接格式）
- `/benben` 及 `/benben/...` —— 犇犇

### 添加更多白名单

如果想放行更多讨论帖，修改脚本中 `isWhitelistedDiscuss` 函数的正则：

```javascript
function isWhitelistedDiscuss(href) {
    if (!href) return false;
    // 把 142324 替换成你要放行的帖子 ID（可以写成 | 分隔的多个）
    return /\/discuss\/(show\/)?(142324|598533|1362361)(\b|$|\/|\?)/.test(href);
}
```

同时把第 2 部分 CSS 里的 `:not([href*="142324"])` 按同样规则追加 `:not([href*="..."]):not(...)`。

## 配置

目前脚本无需配置。如果洛谷更新页面结构导致屏蔽失效，可以修改脚本中的选择器逻辑。

常见需要调整的位置：

- `hideRecentDiscussBlock()`：主页"最近讨论"
- `hideProblemTags()`：题目页算法标签
- `hideRelatedDiscuss()`：题目页"相关讨论"
- `setupHookColors()`：钩子染色
- 点击拦截部分：讨论与题解链接
- `isWhitelistedDiscuss()`：讨论链接白名单

## 常见问题

### 1. 脚本没有生效？

- 确认 Tampermonkey 已启用
- 确认脚本的 `@match` 包含 `https://www.luogu.com.cn/*`
- 尝试刷新页面
- 如果洛谷更新了页面结构，可能需要更新选择器

### 2. 为什么保留犇犇？

犇犇是洛谷的短动态功能，不属于传统讨论区，因此脚本默认保留。

### 3. 为什么放行 `/discuss/142324`？

这是洛谷官方的钩子等级说明帖。用户名的钩子图标本身就指向这个帖子，屏蔽它会影响用户查看钩子等级说明。

### 4. 钩子染色为什么在关注列表和首页表现不同？

数据来源不同：

- **关注列表**：直接读页面内嵌的 JSON（`ccfLevel` 字段），准确度最高
- **首页等其他页面**：读 DOM 里钩子图标的 SVG 颜色（绿 `#5eb95e` / 蓝 `#3498db` / 金 `#f1c40f` 等）

两种方式结果一致，只是数据源不同。

### 5. 会影响正常做题吗？

不会。脚本只隐藏讨论入口、相关讨论、算法标签和题解页面，不影响题目阅读、提交代码等核心功能。

### 6. 如何临时关闭？

- **整体关闭**：在 Tampermonkey 面板中禁用该脚本
- **仅关闭钩子染色**：Tampermonkey 面板 → 本脚本 → **切换：钩子染色**

## 更新日志

### v3.3

- 新增：白名单放行钩子等级说明帖 `/discuss/142324`

### v3.2

- 调整：金钩流动速度从 `2.5s` 减慢到 `5s`

### v3.1

- 调整：钩子染色 CSS 恢复 v2.0 原版配色和动画

### v3.0

- 调整：用柔和投影代替描边解决钩子染色可读性（后已回退）

### v2.9

- 调整：加 `-webkit-text-stroke` 解决钩子染色可读性（后已回退）

### v2.8

- 调整：绿/金钩改回 v2.0 原色相（后已回退）

### v2.7

- 调整：恢复渐变流动方案

### v2.6

- 调整：改用呼吸光晕动画（后已回退）

### v2.5

- 调整：改用光晕呼吸动画（后已回退）

### v2.4

- 调整：强化 CSS 优先级，全部加 `!important`

### v2.3

- 新增：首页等其他页面也支持钩子染色（读 SVG fill 颜色）
- 保留：关注列表读 JSON 的逻辑

### v2.2

- 新增：关注列表按钩子等级染色（读 `lentille-context` JSON 的 `ccfLevel`）
- 修正：`@updateURL` 和 `@downloadURL` 改为 raw 地址
- 新增：`GM_registerMenuCommand` 菜单开关

### v2.1

- 调整：从 DOM 里真实读取钩子 SVG fill 颜色

### v2.0

- 新增：关注列表用户名按钩子等级染色
- 完善：各页面屏蔽逻辑

### v1.9

- 优化："相关讨论"卡片隐藏逻辑
- 支持隐藏空卡片外框
- 保留犇犇
- 继续屏蔽题解页面、讨论链接、算法标签

## 开发

欢迎提交 Issue 或 Pull Request。

如果洛谷页面结构发生变化，可以在浏览器控制台检查对应元素，并更新脚本中的选择器。

### 调试钩子等级

在关注列表页或首页控制台运行：

```javascript
// 检查 lentille-context JSON
const script = document.getElementById('lentille-context');
if (script) {
    const data = JSON.parse(script.textContent);
    console.log('users:', data?.data?.users?.result);
}

// 检查 DOM 钩子
document.querySelectorAll('a[href^="/user/"]').forEach(function(a, i) {
    if (i > 10) return;
    const sib = a.nextElementSibling;
    const svg = sib && sib.querySelector && sib.querySelector('svg[fill]');
    console.log(a.textContent.trim(),
        '→ hook:', svg ? svg.getAttribute('fill') : '(无)');
});
```

## 许可证

本项目使用 MIT License，详见 [LICENSE](LICENSE)。

## 致谢

- 感谢 Tampermonkey 和洛谷社区
- 本脚本的编写与调试过程中使用了 AI 助手（DeepSeek）进行辅助
