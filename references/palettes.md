# 配色规范 · Palettes

5 套内置色板，均遵循 60-30-10 比例法则，并已通过 WCAG 对比度校验。
数据源：`assets/palettes.js`（运行时唯一真源，构建脚本会读取它做校验）。

---

## 0. 比例法则

| 占比 | 承担 | 取自 |
|---|---|---|
| 60% | 画面基底 | `bg` / `bgAlt` 渐层 |
| 30% | 结构与文字 | `text` / `muted` / `surface` / `line` |
| 10% | 视觉焦点 | `accent` / `glow` |

**禁止**：高饱和撞色、默认 Office 配色、彩虹渐变、纯黑 `#000` 与纯白 `#FFF` 大面积并置。

## 1. 五套色板

### deep-space 深空灰 × 荧光蓝
科技新品 / 硬件发布 / 开发者工具

| 角色 | 色值 |
|---|---|
| bg | `#07080C` |
| bgAlt | `#0B0E15` |
| text | `#F3F6FB` |
| muted | `#9BA7BA` |
| accent | `#5B9CFF` |
| accentInk | `#06080D` |
| glow | `#1E5BFF` |

### ink-champagne 墨黑 × 香槟金
奢品 / 高端服务 / 品牌片 / 仪式感章节

| 角色 | 色值 |
|---|---|
| bg | `#0B0B0C` |
| bgAlt | `#121013` |
| text | `#F4EFE6` |
| muted | `#A79E90` |
| accent | `#D9B676` |
| accentInk | `#0B0B0C` |
| glow | `#B08D4F` |

### warm-coral 暖白 × 珊瑚橙
生活方式 / 消费级产品 / 品牌故事

| 角色 | 色值 |
|---|---|
| bg | `#FAF7F2` |
| bgAlt | `#F2EDE4` |
| text | `#1B1714` |
| muted | `#5F574D` |
| accent | `#C4401F` |
| accentInk | `#FFFFFF` |
| glow | `#FF6B4A` |

> 浅底色板的 accent 必须压暗到 `#C4401F` 这一档；`#FF6B4A` 只用于光晕填充，不能当正文色。

### mist-indigo 薄雾 × 靛紫
SaaS / 数据 / 企业级发布

| 角色 | 色值 |
|---|---|
| bg | `#F5F6FA` |
| bgAlt | `#EAECF5` |
| text | `#14161F` |
| muted | `#565C6E` |
| accent | `#4B3FD0` |
| accentInk | `#FFFFFF` |
| glow | `#6B5CE7` |

### midnight-lime 午夜蓝 × 青柠
运动 / 户外 / 年轻化产品

| 角色 | 色值 |
|---|---|
| bg | `#05101A` |
| bgAlt | `#08161F` |
| text | `#E9F2F7` |
| muted | `#93A8B6` |
| accent | `#A8E05F` |
| accentInk | `#061019` |
| glow | `#2E7D4F` |

---

## 2. 对比度实测（WCAG 2.1）

| 色板 | 正文 text / bg | 次要 muted / bg | 强调 accent / bg |
|---|---|---|---|
| deep-space | 18.5 : 1 | 8.2 : 1 | 7.3 : 1 |
| ink-champagne | 17.2 : 1 | 7.4 : 1 | 10.2 : 1 |
| warm-coral | 16.7 : 1 | 6.6 : 1 | 4.8 : 1 |
| mist-indigo | 16.7 : 1 | 6.2 : 1 | 6.7 : 1 |
| midnight-lime | 16.9 : 1 | 7.8 : 1 | 12.3 : 1 |

* 正文与次要文字 ≥ 4.5:1（AA）—— 全部满足。
* 强调色仅用于 ≥24px 的大字或图形，要求 ≥ 3:1 —— 全部满足。
* 构建脚本 `scripts/build.py` 每次都会重新计算并在不达标时报警。

### 色盲友好

* 五套色板的正文与背景明度差都 ≥ 6:1，色觉障碍用户也能分辨正文与背景。
* 信息不靠颜色单通道传达：图表同时给数值标签，状态同时给图标或文字。
* 避免把绿/红作为唯一区分维度（`midnight-lime` 的 accent 是黄绿色，不与红撞色）。

---

## 3. 质感处理

**渐变**：优先径向渐变 + 弱对比，禁止廉价的线性彩虹渐变。

```css
background:
  radial-gradient(120% 92% at 76% 6%, var(--glow-soft) 0%, transparent 56%),
  radial-gradient(92% 72% at 6% 98%, var(--glow-soft-2) 0%, transparent 60%),
  linear-gradient(178deg, var(--bg-alt) 0%, var(--bg) 66%);
```

**噪点**：每页叠一层 `feTurbulence` 生成的胶片颗粒（`opacity .12`，`mix-blend-mode: overlay`）。这是"高级感"的关键 —— 纯渐变会显得塑料。

**阴影**：柔和、大范围、低透明度。`0 30px 80px -50px rgba(0,0,0,.9)`，禁止硬边小阴影。

**玻璃**：`backdrop-filter: blur(18px) saturate(140%)` + 1px `var(--line)` 描边。

---

## 4. 自定义色板

编辑 `assets/palettes.js`，追加一个条目：

```js
'my-brand': {
  id: 'my-brand',
  name: '品牌蓝',
  note: '企业品牌',
  isLight: false,
  bg: '#0A0F1C', bgAlt: '#0E1526',
  surface: 'rgba(255,255,255,.05)',
  text: '#EEF3FF', muted: '#96A3C0',
  accent: '#3D7BFF', accentInk: '#050810',
  accentSoft: 'rgba(61,123,255,.14)',
  line: 'rgba(255,255,255,.10)',
  glow: '#1B4FD8',
  font: 'system'
}
```

然后在页面 JSON 里写 `"palette": "my-brand"`，并重新运行构建脚本 —— 它会验证对比度。

> 需要在**页面级别**换色时，用 `data-palette` 属性；面板里的"配色主题"下拉框默认是"跟随每页设定"，改成具体色板名即可强制全局统一。
