# 设计系统 · Design System

## 1. 网格

12 栏网格，栏间距随视口伸缩。

```css
.grid-12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--gap); }
.col-3 / .col-4 / .col-5 / .col-6 / .col-7 / .col-8 / .col-9 / .col-12
```

| 变量 | 值 | 用途 |
|---|---|---|
| `--pad-x` | `clamp(32px, 6.5vw, 168px)` | 左右安全边距 |
| `--pad-y` | `clamp(40px, 7vh, 120px)` | 上下安全边距 |
| `--gap` | `clamp(20px, 2.6vw, 56px)` | 栏间距与栅格间距 |

**对齐规则**

* 所有元素落在 12 栏上；宁可留白也不要挤。
* 正文栏宽建议 4–6 栏；一行超过 60 个中文字符就必须换行。
* 页脚、页码、进度条固定贴边，不参与栅格。

**安全区提醒**：右上角有可调参数面板（宽 268px）。关键内容不要放在屏幕右上 340×440 的区域内；面板会在鼠标移开时自动收起，留有「参数」把手。

## 2. 字号阶梯

流体字号，随视口连续缩放，天然适配投影仪与笔记本。

| 类名 | 字号 | 行高 | 字重 | 字距 | 用途 |
|---|---|---|---|---|---|
| `.display` | `clamp(48px, 7.4vw, 132px)` | .96 | 700 | -.035em | 封面主标题、结尾口号 |
| `.h1` | `clamp(34px, 4.3vw, 76px)` | 1.06 | 700 | -.028em | 页面标题 |
| `.h2` | `clamp(26px, 2.7vw, 46px)` | 1.16 | 650 | -.02em | 章节标题 |
| `.h3` | `clamp(19px, 1.6vw, 28px)` | 1.28 | 600 | -.012em | 小标题 |
| `.lead` | `clamp(17px, 1.45vw, 26px)` | 1.5 | 400 | -.008em | 副标题、导语 |
| `.body` | `clamp(14px, 1.05vw, 18px)` | 1.62 | 400 | 0 | 正文 |
| `.label` | `clamp(11px, .78vw, 13px)` | — | 600 | .2em | 眉标、图注、图表轴 |

> 负字距只用于大字号；小字号加大字距。全大写只用于 `.label`。

## 3. 字体栈

| 预设 | 栈 |
|---|---|
| `system`（默认） | `-apple-system, "SF Pro Display", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", …` |
| `inter` | `"Inter", "SF Pro Display", "PingFang SC", …` |
| `han` | `"Source Han Sans SC", "Noto Sans SC", "PingFang SC", …` |
| `serif` | `"New York", "Source Han Serif SC", "Songti SC", Georgia, …` |

**不下载 webfont** —— 全部走系统字体栈，保证单文件离线可用、无字体闪烁。需要品牌字体时，在 `assets/runtime.css` 的 `:root` 里补一条 `@font-face` 并改成自托管 base64 或相对路径。

## 4. 留白与节奏

* 一屏一个核心观点。信息量超载就拆页。
* 标题到正文的间距 ≥ 2 个 `.body` 行高；段落之间 ≥ 1.4 倍行高。
* 页面底部留白 ≥ 12% 视口高度（除非 `data-align="bottom"`）。
* 圆角统一：`--radius: clamp(14px, 1.4vw, 26px)`。

## 5. 组件

### kicker 眉标
```html
<div class="kicker" data-anim="rise">性能</div>
```
前置发光圆点，大写、宽字距。用于标记章节。

### card 玻璃卡
```html
<div class="col-4 card card--glow" data-anim="rise">…</div>
```
`--surface` 底 + 1px 描边 + 背景模糊 + 大范围柔和阴影。`card--glow` 加一层渐变描边。

### stat 指标块
```html
<div class="stat">
  <div class="stat__num"><span data-anim="count" data-count="3.4" data-count-decimals="1">0</span><span class="stat__unit">×</span></div>
  <div class="stat__label">多核性能提升</div>
</div>
```
数字用 `tabular-nums` 等宽对齐；单位用强调色；标签用次要色。

### bars 条形图
```html
<div class="bar-row">
  <span class="label">CPU</span>
  <div class="bar-track"><div class="bar-fill" data-anim="bar" data-value="96"></div></div>
  <span class="bar-val">96</span>
</div>
```
条形用「强调色 → 强调色混白」的渐变 + 外发光。**必须同时给出数值标签**，不能只靠长度传达信息。

### halo / ring 光晕与光环
```html
<div class="halo" style="width:70%;aspect-ratio:1"></div>
<div class="ring spin-slow" style="width:54%;aspect-ratio:1"></div>
```
用于制造景深。`halo` 放最底层（`z-index:0`），不要压住文字。

## 6. 背景插图与图片

* 背景必须与主题强相关：产品结构用矢量分解图，数据用图表抽象，抽象概念用几何/粒子。
* **禁止**无关壁纸堆砌、禁止 Unsplash 随机风景图当背景。
* 图片处理三件套：① 蒙版（`mask-image` 渐隐）② 虚化（`filter: blur()` 压到 18–30px 并降透明度）③ 分层（远景层 `data-depth` 视差更小）。
* 优先内联 SVG（可逐元素动画、零网络请求）；位图必须内联为 base64 才能保证单文件离线。
* 噪点纹理：每页自动叠加 `feTurbulence` 颗粒，`opacity .12`，这是高级感的关键。

## 7. 网格叠加

按 `G` 显示 12 栏参考线，用于检查对齐。放映时自动隐藏。
