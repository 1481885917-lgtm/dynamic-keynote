# 动效语法 · Motion Spec

本文件是 dynamic-keynote 的动效契约。引擎 `assets/runtime.js` 实现了这里描述的全部词汇。

---

## 1. 时间轴架构

```
master (gsap.timeline, paused)
├── 镜头推拉 tween            → .stage 的 scale / x / y
├── 页面进场 tween            → 上一页 autoAlpha→0 + 模糊 + 放大
├── 页面进场 tween            → 本页 autoAlpha→1 + 缩放归位 + 去模糊
├── exit explode tween        → 拆解件向外飞散
├── content timeline (每页)   → 元素入场动画
└── morph tween               → 跨页形变过渡
```

* 所有动效都在**同一条主时间轴**上，因此 `Keynote.seek(t)` 能把画面定位到任意时刻 → 逐帧导出视频是确定性的，不会掉帧。
* **无限循环动效（float / orbit）必须放在独立的环境时间轴**（`slide.ambient`），否则 `repeat:-1` 会把主轴时长撑到 GSAP 上限（1e10 秒）。运行时已自动处理，不要在 content timeline 里写 `repeat:-1`。
* 每页的 `contentEnd` = 该页内容动画结束时刻；其后是 `dwell`（停留）时段，再进入转场。

## 2. 缓动曲线

| 名称 | CSS 等价 | 用途 |
|---|---|---|
| `expo.out` | `cubic-bezier(.16,1,.3,1)` | **默认**。元素入场、拆解组装 |
| `power4.out` | — | 需要更强冲击感的位移 |
| `power3.out` | — | 中等位移、图表生长 |
| `power2.out` / `power2.in` | — | 退场、淡出、缩小 |
| `power2.inOut` | `cubic-bezier(.65,0,.35,1)` | 镜头推拉、页面切换 |
| `back.out(1.7)` | `cubic-bezier(.34,1.56,.64,1)` | 轻微回弹，适合图标/徽标 |
| `elastic.out(1,.62)` | — | 极少用，只用于强调性数字 |
| `sine.inOut` | — | 环境循环（呼吸感） |
| `none` | `linear` | 仅用于持续旋转 |

**硬性规则**：禁止把所有元素都做成 `fade` 或 `power2.inOut` 的匀速淡入淡出。每个元素必须至少有一种"位移"或"形变"。

## 3. 时长基准

| 层级 | 时长 | 说明 |
|---|---|---|
| 微交互 | 180–240ms | 按钮、chip 反馈 |
| 元素入场 | 500–700ms | 标题、卡片、图表 |
| 场景 | 900–1200ms | 页面整体、拆解组装 |
| 转场 | 950ms（进场）/ 620ms（退场） | 由引擎固定 |
| 镜头 | 1250ms | 由引擎固定 |

同一屏内元素错峰（stagger）**60–120ms**；超过 5 个元素同时入场时，把 stagger 降到 60ms 以内，避免拖沓。

## 4. 入场动画词汇表

用 `data-anim="<名称>"` 声明。配套属性：
`data-dur`（秒）、`data-delay`（秒）、`data-ease`（缓动名）。

| 名称 | 效果 | 适用 |
|---|---|---|
| `rise` | 下方 44px 上浮 + 淡入 | 通用首选 |
| `drop` | 上方落入 | 顶部标题 |
| `slide-left` / `slide-right` | 横向滑入 | 列表项、要点 |
| `scale` | 0.9 → 1 | 卡片、图形 |
| `zoom` | 1.14 → 1 | 制造"推进"感 |
| `blur-in` | 模糊消散 | 背景层、装饰 |
| `wipe` | 从左擦出 | 分栏、图形 |
| `mask-up` | 自下而上揭开 | 文字块、图表容器 |
| `perspective` | 绕 X 轴翻起 | 3D 卡片、层叠结构 |
| `tilt` | 绕 Y 轴转正 | 产品结构图 |
| `glow` | 高亮衰减 | 强调瞬间 |
| `typing` / `split` | 逐字显现（带翻转） | 主标题、关键词 |
| `word-by-word` | 逐词浮现 | 长句 |
| `count` | 数字滚动 | 指标、数据 |
| `bar` | 宽度生长 | 柱状图 |
| `draw` | SVG 路径描边 | 折线、示意图 |
| `float` | 入场后持续漂浮 | 产品主体 |
| `orbit` | 入场后持续自转 | 环形元素 |
| `beam` | 光晕扫过 | 高光卡片 |
| `parallax` | 随鼠标视差 | 背景层（配 `data-depth`） |

### 分组错峰

```html
<ul data-anim-group data-stagger="0.08" data-delay="0.5">
  <li data-anim="slide-left">第一项</li>
  <li data-anim="slide-left">第二项</li>
</ul>
```

`data-anim-group` 内的子元素自动按 `data-stagger` 依次入场；子元素上的 `data-delay` 作为整体偏移。

## 5. 动态拆解（Build & Explode）

```html
<div class="explode" data-explode="center" data-dur="1.15" data-stagger="0.075">
  <div class="part" data-part style="left:21%;top:0;width:54%;height:13%">…</div>
  <div class="part" data-part style="left:21%;top:15%;width:54%;height:13%">…</div>
</div>
```

| `data-explode` | 行为 |
|---|---|
| `center` | **默认推荐**。所有件从容器中心同时出发，各自飞向自己的位置 —— 读作"组装" |
| `radial` | 各件从自身方位的外侧飞入 —— 读作"收拢" |
| `stack` | 沿 Y 轴等距展开 —— 经典分层爆炸图 |
| `grid` | 网格状散开 —— 零件较多的场景 |

* 退场时所有件**向外飞散并淡出**（引擎自动处理），配合页面的模糊放大退场。
* 零件用内联 SVG，`preserveAspectRatio="xMidYMid meet"`，容器 `position:relative`。
* `data-part` 是唯一标记；`data-explode` 容器内不要再放 `data-anim`（会被拆解接管）。

## 6. 镜头语言

在页面 JSON 里声明 `camera`，作用于 `.stage`（整场），随转场平滑插值：

```json
{ "camera": { "z": 1.3, "x": 0, "y": 0 } }
```

| 参数 | 含义 | 建议 |
|---|---|---|
| `z` | 缩放 | 1.0 常规；1.2–1.5 推近细节；0.95–1.0 拉远收尾；≤ 3.2 否则边缘露白 |
| `x` / `y` | 平移（%） | 把焦点元素推到画面中心 |

典型编排：封面 `z=1` → 结构页 `z=1.02` → 细节页 `z=1.3`（推近）→ 结尾页 `z=0.97`（拉远）。

> **推近时必须水平居中内容。** 相机以舞台中心缩放，`z=1.3` 意味着左右各被裁掉 15% 的画布。
> 如果页面用了 `max-width` 限制宽度，网格项默认是**左对齐**（不是居中），推近后左边缘会被裁出屏幕。
> 解决办法：给 `.slide__inner` 加 `justify-self:center`；或者让内容天然占满并居中。
> 推近幅度越大，越要把内容收进中间 70% 的安全区。

## 7. 形变过渡（Morph / FLIP）

跨页的同一元素用相同 `data-morph="key"` 标记，引擎计算两页的位置差，让它"飞"过去：

```html
<!-- 第 1 页 -->
<div data-morph="logo">…</div>
<!-- 第 5 页 -->
<div data-morph="logo">…</div>
```

* 不要求相邻页；引擎会自动连接**最近两次出现**。
* 形变与该元素自身的 `data-anim` 会争夺 transform：把 `data-anim` 放在**内层**，`data-morph` 放外层。

## 8. 触发方式

| 方式 | 行为 |
|---|---|
| 手动 | 键盘 `→ ← Space Home End`、面板按钮、触摸滑动 |
| 自动 | 面板切到"自动播放"，主轴连续播放，末页循环 |
| 滚动 | 面板切到"滚动翻页"，滚轮上下翻页（带 900ms 锁） |

导出手册里"逐帧截图"走的是 `Keynote.seek(t)`，与触发方式无关。

## 9. 可访问性与降级

* `prefers-reduced-motion: reduce` 或面板"减少动效" → 所有时长压到 ≤0.28s，环境循环停用。
* 导出模式（URL 带 `?export=1`）→ 关闭粒子与鼠标视差，避免逐帧抖动。
* 关键信息不能只靠动效传达：数字滚动结束后必须有完整数值，拆解图必须有文字标签。
