---
name: dynamic-keynote
description: 生成"苹果发布会级别"的动态演示文稿。当用户要做发布会式演示、产品发布、pitch deck、路演幻灯片、动效演示，或要求"高级感/电影级/动效 PPT/网页演示"时使用。默认输出单文件 Web 演示（HTML + GSAP 时间轴 + CSS 3D + SVG），含动态拆解、镜头推拉、数字滚动、图表生长、形变过渡、粒子与视差微交互，附顶部可调参数面板，并可逐帧导出 MP4。仅在用户明确要求 .pptx 时才降级为 PPTXGenJS 静态版并说明动效受限。
argument-hint: <演示主题 / 产品 / 或 deck.json 路径>
allowed-tools: [Bash, Read, Write, Edit, Glob, Grep]
---

# dynamic-keynote · 动态演示大师

产出电影级动效的演示文稿。默认交付物是**一个 HTML 文件**，双击即放映、离线可用。

## 一、核心技术判断（不可违背）

真正的苹果发布会动效**无法用 .pptx 实现**。本 Skill 的默认输出必须是 Web 演示：

| 层 | 技术 |
|---|---|
| 结构与样式 | HTML + CSS3（12 栏网格、流体字号、玻璃拟态、噪点纹理） |
| 动效编排 | GSAP 3.x 主时间轴（已内联进产物，无需联网） |
| 3D 与景深 | CSS 3D transform、perspective、视差层次 |
| 矢量图形 | SVG，可逐元素动画化 |
| 数据动效 | 数字滚动、图表生长、SVG 路径描边 |
| 导出 | Playwright 逐帧截图 + ffmpeg 合成 MP4（帧级确定） |

**只有用户明确要求 `.pptx`** 时，才用 `scripts/degrade_to_pptx.js` 降级，并在回复中明确说明动效受限、给出替代方案（见 `references/pptx-degradation.md`）。

## 二、工作流

### 步骤 1 · 澄清（最多问 3 个问题）

在动手前必须明确：

1. **讲什么** —— 主题 / 产品 / 受众 / 场合。产品发布会？融资路演？内部汇报？
2. **多少页** —— 默认 8–12 页。少于 5 页说明内容不够，讲出来像 PPT；多于 20 页观众会掉线。
3. **气质** —— 对应哪套色板：科技（deep-space）/ 奢品（ink-champagne）/ 温暖（warm-coral）/ 理性（mist-indigo）/ 活力（midnight-lime）。

用户没说就用默认值，直接开工，不要反复确认。

### 步骤 2 · 写文案（先文后动）

按 `references/copywriting.md` 写：**一屏一个核心观点**，主标题 ≤ 12 字，动词开头，数字带对比基准。

先产出大纲（每页：眉标 / 观点 / 证据 / 镜头意图），再写 HTML 片段。**不要先堆样式再想内容。**

### 步骤 3 · 选骨架 + 编排动效

从 `references/layout-patterns.md` 的 8 种骨架里选（cover / statement / split / explode / metrics / detail / comparison / finale），不要自创结构。

动效编排按 `references/motion.md`：
- 每个元素都要有位移或形变，**禁止一律淡入**；
- 入场顺序 = 阅读顺序，stagger 60–120ms；
- 用 `expo.out` / `power4.out` / `back.out`，不用线性；
- 页面之间用 `camera.z` 做推拉节奏。

### 步骤 4 · 构建 + 自检

```bash
python scripts/build.py <deck.json> -o <out.html>
```

构建脚本会输出：页面清单、每页动画数、**WCAG 对比度实测**、待确认项。**必须读一遍构建日志**，有 `!` 提示就修。

然后在浏览器里实际翻一遍（不要只靠代码推断）。至少检查：封面动效、拆解组装、数字滚动终点、转场衔接、参数面板不遮挡关键内容。

### 步骤 5 · 交付

告诉用户：
- 产物路径（单文件，双击即放映）
- 快捷键（`?` 看帮助）
- 需要视频的话给导出命令
- 若降级为 PPTX，明确说明动效限制

## 三、目录约定

新建演示时，按这个结构组织（**产物放非 C 盘**）：

```
D:/<项目目录>/<演示名>/
├── slides.json            # 编排：页序、色板、相机、停留
├── slides/
│   ├── 01-cover.html
│   ├── 02-structure.html
│   └── ...
└── index.html             # 构建产物
```

每页正文独立成 HTML 片段文件（`htmlFile` 字段引用），比把 HTML 塞进 JSON 更好维护。JSON 里不要写多行字符串续行符 —— JSON 不支持。

## 四、红线

违反任何一条都算失败：

1. **不用 `.pptx` 作为默认交付物。**
2. **不允许元素统一淡入淡出。** 每屏至少有一处明显的位移 / 形变 / 缩放。
3. **不用默认 Office 配色、高饱和撞色、彩虹渐变。** 用 `assets/palettes.js` 的 5 套色板，或新增并通过对比度校验。
4. **不用无关壁纸。** 背景必须与内容强相关，优先内联 SVG。
5. **正文对比度必须 ≥ 4.5:1**（构建脚本会校验，不达标必须改色）。
6. **不下载 webfont、不引用外部 CDN。** 产物必须能离线打开。图标用内联 SVG，不用 Font Awesome。
7. **无限循环动效不能放进内容时间轴。** `float` / `orbit` 由引擎自动分流到环境时间轴；自己写 `repeat:-1` 会把主时间轴时长撑爆。
8. **关键内容不放屏幕右上 340×440 区域**（参数面板区）。
9. **不写 `Math.random()` 进动画** —— 会破坏逐帧导出的确定性。
10. **相机 `z > 1.1` 的页面，内容必须水平居中。** 相机以舞台中心缩放，`z=1.3` 会裁掉左右各 15% 的画布；若页面用了 `max-width`，网格项默认**左对齐**，会被裁出屏幕。给 `.slide__inner` 加 `justify-self:center`，或把内容收进中间 70% 安全区。

## 五、资源索引

| 文件 | 什么时候读 |
|---|---|
| `references/motion.md` | 编排动效、查动画词汇表与缓动曲线 |
| `references/design-system.md` | 查网格、字号阶梯、组件写法 |
| `references/palettes.md` | 选色板、查对比度、加自定义色板 |
| `references/layout-patterns.md` | 选页面骨架 |
| `references/copywriting.md` | 写标题与要点 |
| `references/pptx-degradation.md` | 用户坚持要 .pptx 时 |
| `examples/nova-x1-launch/` | 完整可运行的 5 页范例（产品发布会），改造它比自己从零写快 |
| `examples/skill-system-talk/` | 完整可运行的 8 页范例（技术分享），**8 种骨架全覆盖**，讲方法论/架构时用 |

## 六、常用命令

```bash
# 构建
python scripts/build.py examples/nova-x1-launch/slides.json -o examples/nova-x1-launch/index.html

# 导出 MP4（帧级确定，不掉帧）
python scripts/export_video.py out.html -o D:/exports --fps 30 --size 1920x1080

# 只要 PNG 序列
python scripts/export_video.py out.html -o D:/exports --mode frames

# PPTX 降级（仅在用户强制要求时）
npm config set registry https://registry.npmmirror.com && npm i pptxgenjs
node scripts/degrade_to_pptx.js deck.json -o degraded.pptx
```

## 七、引擎 API（写自定义片段时用）

```js
Keynote.goto(2)            // 跳到第 3 页
Keynote.next() / .prev()   // 翻页
Keynote.seek(12.5)         // 定位到 12.5 秒（导出用）
Keynote.duration()         // 总时长（秒）
Keynote.setPalette('ink-champagne')
Keynote.setFont('han')
Keynote.setSpeed(1.4)      // 时间轴倍速
Keynote.setDwell(3.2)      // 每页停留秒数
Keynote.setMode('auto'|'manual'|'scroll')
Keynote.getState()         // 页码、时间轴、每页动画数
```

## 八、示例演示说明

### `examples/nova-x1-launch/` —— 5 页科技新品发布

涵盖：

1. **cover** —— 逐字标题、漂浮主体、光晕光环、logo 形变起点
2. **structure** —— 7 个部件从中心**组装**成爆炸图（`data-explode="center"`）
3. **performance** —— 3 个指标数字滚动 + 4 条图表生长
4. **chip** —— 换色板（墨黑×香槟金）+ 相机推近 `z:1.3` 聚焦细节
5. **finale** —— logo 从封面位置**形变飞入**中心、口号、CTA、相机拉远

总时长约 29.7 秒。构建后双击 `index.html` 即可放映。

### `examples/skill-system-talk/` —— 8 页技术分享

**8 种骨架全覆盖**，演示内容是"讲一套方法"该怎么排：

1. **cover** —— 终端 SVG 逐行浮现、标题逐字显现
2. **statement** —— 单句立论 + 相机推近
3. **explode** —— 六张卡片从中心同时组装
4. **metrics** —— 三个指标数字滚动 + 五条条形图生长
5. **flow** —— 5 步工作流箭头错峰推进
6. **detail** —— 代码特写，换香槟金色板 + 相机推近 `z:1.18`
7. **comparison** —— 五维矩阵对比 + 相机拉远
8. **finale** —— logo 跨页形变飞入中心 + 口号

总时长约 53.8 秒，动画节点 91 个。
