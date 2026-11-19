# dynamic-keynote · 动态演示大师

产出「苹果发布会级别」的动态演示文稿 —— 单文件 HTML，内联动效引擎，离线双击即可放映。

不是「静态页面 + 壁纸 + 项目符号」。

---

## 快速开始

```bash
# 构建示例（5 页科技新品发布）
python scripts/build.py examples/nova-x1-launch/slides.json -o examples/nova-x1-launch/index.html

# 双击 index.html 即可放映，无需联网、无需起服务
```

构建产物约 144 KB（GSAP 已内联），包含全部 CSS / JS / 动效时间轴。

## 目录

```
dynamic-keynote/
├── SKILL.md                     # Skill 入口（Claude Code 调用时读这个）
├── README.md                    # 本文件
├── assets/
│   ├── runtime.css              # 主题变量、网格、排版、组件、面板
│   ├── runtime.js               # 动效引擎：主时间轴、转场、拆解、数据动效、导出接口
│   ├── palettes.js              # 5 套高级色板 + 字体栈
│   └── vendor/gsap.min.js       # GSAP 3.12.5（内联进产物，保证离线）
├── references/
│   ├── design-system.md         # 网格、字号阶梯、留白、组件规范
│   ├── motion.md                # 动效词汇表、缓动曲线、节奏、镜头语言
│   ├── palettes.md              # 色板规范与 WCAG 实测对比度
│   ├── layout-patterns.md       # 8 种页面骨架
│   ├── copywriting.md           # 文案规则
│   └── pptx-degradation.md      # PPTX 降级路径与限制说明
├── scripts/
│   ├── build.py                 # slides.json → 单文件 HTML（含质量校验与日志）
│   ├── export_video.py          # Playwright 逐帧 + ffmpeg 合成 MP4
│   └── degrade_to_pptx.js       # PPTXGenJS 降级导出（仅在用户强制要求时）
├── examples/nova-x1-launch/
│   ├── slides.json              # 演示编排
│   ├── slides/*.html            # 每页正文片段
│   ├── README.md                # 示例拆解
│   └── index.html               # 构建产物（已生成）
└── templates/minimal/           # 4 页最小骨架，作为新演示的起点
    ├── slides.json
    └── slides/*.html
```

## 演示 JSON 格式

```json
{
  "meta": { "title": "…", "palette": "deep-space", "dwell": 2.8 },
  "slides": [
    {
      "id": "cover",
      "htmlFile": "slides/01-cover.html",
      "palette": "deep-space",
      "align": "center",
      "camera": { "z": 1, "x": 0, "y": 0 },
      "dwell": 3.4
    }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `htmlFile` | 页面正文片段文件（相对 deck.json 所在目录）。也可用 `html` 直接内联 |
| `palette` | 该页色板 id；省略则用 `meta.palette` |
| `align` | `center`（默认）/ `top` / `bottom` / `stretch` |
| `camera` | 镜头：`z` 缩放、`x`/`y` 平移（%）。建议 0.95–1.5 |
| `dwell` | 该页停留秒数，覆盖全局值 |

## 页面正文怎么写

用语义化 class + `data-anim` 声明动效，引擎自动编排：

```html
<div class="slide__inner grid-12" style="align-items:center">
  <div class="col-6 stack">
    <div class="kicker" data-anim="rise">性能</div>
    <h2 class="h1" data-anim="rise" data-delay="0.14">快，且持久</h2>
    <p class="lead" data-anim="rise" data-delay="0.3">对比上一代提升 3.4 倍。</p>
    <div class="cluster" data-anim-group data-stagger="0.12" data-delay="0.5">
      <span class="chip" data-anim="rise">A19 Pro</span>
    </div>
  </div>
  <div class="col-6">
    <div class="stat">
      <div class="stat__num"><span data-anim="count" data-count="3.4" data-count-decimals="1">0</span><span class="stat__unit">×</span></div>
      <div class="stat__label">多核性能提升</div>
    </div>
  </div>
</div>
```

常用 class：`.display .h1 .h2 .h3 .lead .body .label .kicker .accent .hl .muted`
布局：`.grid-12 .col-3…col-12 .stack .cluster .center`
组件：`.card .card--glow .stat .bars .bar-row .explode .part .halo .ring`

完整动效词汇表见 `references/motion.md`，页面骨架见 `references/layout-patterns.md`。

## 放映时的操作

| 键 | 作用 |
|---|---|
| `→` `↓` `空格` | 下一页 |
| `←` `↑` | 上一页 |
| `Home` / `End` | 首页 / 末页 |
| `P` | 显示 / 隐藏参数面板（鼠标移到右上角也会自动展开） |
| `G` | 12 栏网格叠加 |
| `D` | 调试信息（页码、播放头、镜头参数） |
| `R` | 重播 |
| `A` | 自动播放开关 |
| `F` | 全屏 |
| `?` | 帮助 |

顶部参数面板可实时调整：配色主题、字体、动画速度（0.4×–2×）、每页停留（1–8s）、播放方式（手动 / 自动 / 滚动）、网格、减少动效、粒子。

> 面板在鼠标移开时自动收起，只留一个「参数」把手 —— 放映时不会遮挡内容。

## 导出视频

```bash
pip install playwright
python -m playwright install chromium
# 国内加速：$env:PLAYWRIGHT_DOWNLOAD_HOST='https://npmmirror.com/mirrors/playwright/'

# 合成 MP4（需要 ffmpeg）
python scripts/export_video.py examples/nova-x1-launch/index.html -o D:/exports --fps 30 --size 1920x1080
```

因为所有动效跑在一条 GSAP 主时间轴上，导出是**帧级确定**的：脚本按 `Keynote.seek(t)` 定位每一帧再截图，不会有录屏常见的掉帧与卡顿。

只要 PNG 序列不要视频：加 `--mode frames`。
4K 素材：加 `--scale 2`。

ffmpeg 安装：`winget install Gyan.FFmpeg`，或 https://www.gyan.dev/ffmpeg/builds/ 。

## 自定义色板

编辑 `assets/palettes.js`，追加一条：

```js
'my-brand': {
  id: 'my-brand', name: '品牌蓝', isLight: false,
  bg: '#0A0F1C', bgAlt: '#0E1526',
  surface: 'rgba(255,255,255,.05)',
  text: '#EEF3FF', muted: '#96A3C0',
  accent: '#3D7BFF', accentInk: '#050810',
  accentSoft: 'rgba(61,123,255,.14)',
  line: 'rgba(255,255,255,.10)',
  glow: '#1B4FD8', font: 'system'
}
```

然后在 deck JSON 里写 `"palette": "my-brand"`，重新构建。构建脚本会自动重算 WCAG 对比度并在不达标时报警。

## 自定义字体

引擎走系统字体栈，不下载 webfont —— 这是离线可用的前提。需要品牌字体时，在 `assets/runtime.css` 的 `:root` 里加 `@font-face`（自托管 woff2 + base64，或相对路径），再在 `assets/palettes.js` 的 `FONT_STACKS` 里加一条。

## 需要 PPTX 时

见 `references/pptx-degradation.md`。要点：PPTX 无法承载时间轴编排、镜头语言、动态拆解与形变过渡；降级脚本会还原静态版式，并在每页备注里写明原动效与手工补动画的建议。

## 环境依赖

| 用途 | 依赖 |
|---|---|
| 构建 | Python 3.8+（无第三方依赖） |
| 放映 | 现代浏览器（Chrome / Edge / Safari / Firefox 近两年版本） |
| 导出视频 | `playwright` + Chromium + `ffmpeg` |
| PPTX 降级 | Node.js + `pptxgenjs` |

国内镜像：npm `https://registry.npmmirror.com`；pip `https://pypi.tuna.tsinghua.edu.cn/simple`；Playwright 浏览器 `https://npmmirror.com/mirrors/playwright/`。
