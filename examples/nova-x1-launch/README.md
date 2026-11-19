# 示例：NOVA X1 新品发布

5 页科技新品发布演示，演示本 Skill 的全部核心能力。

## 运行

```bash
python ../../scripts/build.py slides.json -o index.html
# 然后双击 index.html
```

`index.html` 已预先构建好（约 144 KB，GSAP 已内联），可直接打开。

## 五页分别演示了什么

| 页 | 骨架 | 演示的能力 |
|---|---|---|
| 01 cover | cover | 逐字显现标题、漂浮主体、光晕光环、粒子层、logo 形变起点 |
| 02 structure | explode | 7 个部件**从中心组装**成爆炸图（`data-explode="center"`），退场时向外飞散；左侧编号清单 `slide-left` 逐条滑入 |
| 03 performance | metrics | 3 个指标**数字滚动**（3.4× / 120Hz / 18 小时）+ 4 条**图表生长** |
| 04 chip | detail | 换色板（墨黑×香槟金），**相机推近** `z:1.3` 聚焦芯片细节 |
| 05 finale | finale | logo 从封面位置**形变飞入**（FLIP morph）到画面中心，口号 + CTA，相机**拉远** `z:0.97` |

总时长约 29.7 秒。

## 结构

```
nova-x1-launch/
├── slides.json              编排：页序 / 色板 / 相机 / 停留时长
├── slides/
│   ├── 01-cover.html        每页正文片段
│   ├── 02-structure.html
│   ├── 03-performance.html
│   ├── 04-chip.html
│   └── 05-finale.html
└── index.html               构建产物
```

## 从这个示例改自己的

1. 复制 `templates/minimal/` 整个目录作为起点（4 页最小骨架）。
2. 改 `slides.json` 的 `meta` 与每页的 `palette` / `camera` / `dwell`。
3. 按 `references/layout-patterns.md` 的骨架改写 `slides/*.html`。
4. 运行构建脚本，**读一遍构建日志**（含 WCAG 对比度实测与待确认项）。
5. 在浏览器里实际翻一遍。

## 注意

* `slides/02-structure.html` 的零件编号标签放在图形**左侧**，是为了避开右上角的参数面板区域。
* 第 4 页相机放大了 1.3 倍，所以这一页只放了一个视觉焦点 + 一行字。
* 封面与结尾的 logo 用同一个 `data-morph="logo"`，形成跨页形变。
