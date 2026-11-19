# 页面骨架库 · Layout Patterns

八种常用骨架。每种给出适用场景、布局代码骨架与动效编排。
直接复制使用，不要从零发明结构。

---

## 1. cover 封面

**场景**：开场。产品名 + 一句话定位 + 主体视觉。

```html
<div class="slide__inner grid-12" style="align-items:center">
  <div class="col-6 stack">
    <div class="cluster" style="gap:14px;align-items:center">
      <div data-morph="logo" style="width:34px;height:34px;flex:0 0 auto">…</div>
      <div class="kicker" data-anim="rise">NOVA 2026 · 新品发布</div>
    </div>
    <h1 class="display" data-anim="typing" data-split-speed="0.055">NOVA X1</h1>
    <p class="lead" data-anim="rise" data-delay="0.75">把整台设备，拆开给你看。</p>
    <div class="cluster" data-anim-group data-stagger="0.13" data-delay="1.05">
      <span class="chip" data-anim="rise">A19 Pro</span>
    </div>
  </div>
  <div class="col-6" style="display:grid;place-items:center;position:relative;height:100%">
    <div class="halo pulse" style="width:76%;aspect-ratio:1;border-radius:50%"></div>
    <div class="ring spin-slow" style="width:54%;aspect-ratio:1"></div>
    <svg viewBox="0 0 320 640" data-anim="float" data-delay="0.35" style="width:min(272px,24vw)">…</svg>
  </div>
</div>
```

**编排**：kicker 先出 → 标题逐字 → 副标题 → 标签组 → 主体漂浮。相机 `z:1`。
**要点**：主体不要正对屏幕中心，放右侧 1/3 处更有呼吸感。

---

## 2. statement 大字陈述

**场景**：一句主张、一个数字、一个词。制造停顿。

```html
<div class="slide__inner" style="justify-items:center;text-align:center">
  <div class="kicker" data-anim="rise">一句话</div>
  <h2 class="display" data-anim="rise" data-delay="0.2" data-dur="1.2">快到不需要等待。</h2>
</div>
```

**编排**：kicker → 主体。停留时间给足（dwell ≥ 4s）。
**要点**：这页不要放任何其他元素。

---

## 3. split 左右分栏

**场景**：文字讲解 + 视觉主体。演示中最通用。

```html
<div class="slide__inner grid-12" style="align-items:center">
  <div class="col-6 stack">…文案…</div>
  <div class="col-6" style="display:grid;place-items:center">…视觉…</div>
</div>
```

**编排**：左栏从上到下 `rise`（delay 递增 0.14s），右栏 `scale` 或 `float`。
**要点**：两栏的视觉重心要对齐；右栏不要顶到屏幕右上角（参数面板区）。

---

## 4. explode 结构拆解

**场景**：产品内部结构、流程分解、架构分层。

```html
<div class="slide__inner" style="grid-template-columns:.82fr 1.18fr;align-items:center">
  <div class="stack">…标题 + 编号清单…</div>
  <div class="explode" data-explode="center" data-dur="1.15" data-stagger="0.075">
    <div class="part" data-part style="left:21%;top:0;width:54%;height:13%">…</div>
  </div>
</div>
```

**编排**：左侧清单 `slide-left` 逐条滑入 → 右侧零件从中心组装。
**要点**：零件用内联 SVG；编号标签放在零件**左侧**（`text-align:right`），避免被参数面板遮挡。

---

## 5. metrics 指标看板

**场景**：3 个关键数字 + 辅助图表。

```html
<div class="slide__inner stack">
  <div class="stack"><div class="kicker">性能</div><h2 class="h1">快，且持久</h2></div>
  <div class="grid-12">
    <div class="col-4 card card--glow" data-anim="rise" data-delay="0.28">
      <div class="stat">
        <div class="stat__num"><span data-anim="count" data-count="3.4" data-count-decimals="1">0</span><span class="stat__unit">×</span></div>
        <div class="stat__label">多核性能提升</div>
      </div>
    </div>
  </div>
  <div class="bars" data-anim-group data-stagger="0.12" data-delay="0.75">…</div>
</div>
```

**编排**：卡片 `rise`（delay 0.28/0.42/0.56）→ 数字滚动 1.7s → 图表条生长。
**要点**：数字滚动结束时刻要早于该页 contentEnd，否则切页时数字还在跳。

---

## 6. detail 细节特写

**场景**：把一个零件/一个数字放大讲。**必须配相机推近**。

```html
<div class="slide__inner" style="justify-items:center;text-align:center;align-content:center">
  <div class="kicker" data-anim="rise">核心</div>
  <h2 class="h1" data-anim="rise" data-delay="0.14">A19 Pro</h2>
  <div data-anim="scale" data-delay="0.3">…特写图形…</div>
</div>
```

JSON 里：`"camera": { "z": 1.3 }`
**要点**：这一页内容要**少**——相机放大 1.3 倍后，上下各裁掉约 13%，只留视觉焦点和一行字。

---

## 7. comparison 对比

**场景**：新旧对比、方案 A/B。

```html
<div class="slide__inner grid-12" style="align-items:center">
  <div class="col-5 card" data-anim="slide-left" data-delay="0.1">…旧…</div>
  <div class="col-1 center"></div>
  <div class="col-5 card card--glow" data-anim="slide-right" data-delay="0.35">…新…</div>
</div>
```

**编排**：旧方案从左滑入 → 新方案从右滑入（略晚）→ 强调差异的数字滚动。
**要点**：用同一色板，靠权重（描边/发光/字号）区分主次，不要用两种颜色。

---

## 8. finale 结尾

**场景**：口号 + 行动号召。

```html
<div class="slide__inner" style="justify-items:center;text-align:center;align-content:center;position:relative">
  <div class="halo" style="width:78%;aspect-ratio:1;border-radius:50%;position:absolute;z-index:0"></div>
  <div data-morph="logo" style="width:54px;height:54px;z-index:1">…</div>
  <div class="kicker" data-anim="rise" data-delay="0.22" style="z-index:1">NOVA X1</div>
  <h2 class="display" data-anim="rise" data-delay="0.36" style="z-index:1">此刻，未来已至。</h2>
  <p class="lead" data-anim="rise" data-delay="0.62" style="z-index:1">2026 年 9 月 12 日 10:00 开售。</p>
  <div class="cluster" data-anim-group data-stagger="0.1" data-delay="0.85" style="justify-content:center;z-index:1">…</div>
</div>
```

**编排**：logo 形变飞入 → kicker → 口号 → 副文 → CTA。相机 `z: 0.97`（轻微拉远）。
**要点**：logo 的 `data-morph` 与封面同 key，即可形成"品牌贯穿"的连贯叙事。

---

## 通用编排检查表

- [ ] 第一个进入画面的元素不是正文，而是眉标或标题
- [ ] 每屏只有一个视觉焦点（一个主标题 或 一个主数字）
- [ ] 动效有先后、有停顿，不是所有东西一起出现
- [ ] 元素入场顺序符合阅读顺序（上→下、左→右）
- [ ] 该页有 `dwell` 停留时间，且不少于最长动画的 1.5 倍
- [ ] 相机 `z` 在 0.95–1.5 之间，且与前后页形成推/拉的节奏
- [ ] 关键内容不在屏幕右上角 340×440 区域内
