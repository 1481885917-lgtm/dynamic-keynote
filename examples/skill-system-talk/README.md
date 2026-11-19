# 示例：Claude Code 技能系统（技术分享型）

8 页技术分享演示，覆盖 `references/layout-patterns.md` 里**全部 8 种骨架**，用来示范"讲技术内容"该怎么排。

**主题**：把重复工作变成可复用的资产。
**受众**：工程师。
**数据**：全部为 `dynamic-keynote` skill 本身的真实测量值。

## 运行

```bash
python ../../scripts/build.py slides.json -o index.html
# 然后双击 index.html
```

`index.html` 已预先构建好，GSAP 已内联，离线可放映。

## 八页分别演示了什么

| 页 | 骨架 | 演示的能力 | 相机 |
|---|---|---|---|
| 01 cover | cover | 终端 SVG 逐行浮现、文件树逐条滑入、标题**逐字显现**、logo 形变起点 | z 1.00 |
| 02 problem | statement | 单句立论「写过的第二次，就是负债」 | z 1.08 推近 |
| 03 anatomy | explode | 六张目录卡从画面中心**同时组装** | z 1.00 |
| 04 loading | metrics | 三个指标**数字滚动** + 五条**条形图生长** | z 1.00 |
| 05 flow | flow | 5 步工作流，箭头**错峰**推进 | z 1.05 |
| 06 skillmd | detail | frontmatter 代码块，换**香槟金色板**做特写章节 | z 1.18 推近 |
| 07 compare | comparison | 五维矩阵，Skill 列高亮 | z 0.98 拉远 |
| 08 finale | finale | logo 从封面位置**形变飞入**居中 + 口号 | z 0.96 |

总时长约 53.8 秒，动画节点 91 个（构建日志实测）。

## 结构

```
skill-system-talk/
├── slides.json              编排：页序 / 色板 / 相机 / 停留时长
├── slides/
│   ├── 01-cover.html        每页正文片段
│   ├── 02-problem.html
│   ├── ...
│   └── 08-finale.html
└── index.html               构建产物
```

## 与 nova-x1-launch 的分工

| | nova-x1-launch | 本范例 |
|---|---|---|
| 定位 | 产品发布会 | 技术分享 / 内部汇报 |
| 页数 | 5 页 | 8 页 |
| 骨架覆盖 | 5 种 | **8 种全覆盖** |
| 色板 | 深空 + 香槟金特写 | 深空 + 香槟金特写 |
| 镜头节奏 | 单一焦点 | 逐页推拉成节奏 |

要新做一场发布会看 `nova-x1-launch`；要讲一套方法、拆一张架构图看本范例。

## 数据溯源

```
28 个文件 · 361.9 KB
├── SKILL.md            7.3 KB   ← 常驻索引
├── references/        27.3 KB   ← 按需加载（6 份）
├── assets/           127.5 KB
├── examples/         165.6 KB
├── scripts/           22.0 KB
└── 根目录文档         14.2 KB
```

复核命令（在 skill 根目录执行）：

```bash
python -c "import pathlib;r=pathlib.Path('.');print(len([f for f in r.rglob('*') if f.is_file()]), round(sum(f.stat().st_size for f in r.rglob('*') if f.is_file())/1024,1))"
```

### 数据时效

页面上的数字是**制作时（2026-11-18）的实测快照**。由于本范例本身位于 `examples/` 内，收录动作会改变被测对象——重新测量时 `examples/` 与总量必然大于上面的值，`references/`、`scripts/` 等子项则基本不变。做新演示时按当前实际值改写第 4 页即可。

## 注意

* **第 6 页相机 1.18× 推近**，内容必须水平居中，否则网格项会被裁出屏幕（左栏整块消失）。`.slide__inner` 加 `justify-self:center`，或把内容收进中间 70% 安全区。
* 第 6 页换用 `ink-champagne` 色板，与前后页形成"代码特写"章节感；换色板后要重新看对比度，构建日志会实测。
* 封面与结尾的 logo 用同一个 `data-morph="logo"`，形成跨页形变。
* 条形图页（第 4 页）用了 `data-anim-group` 上的 `data-dur`，组内元素共用默认时长，比逐个元素写参数干净。

## 从这个示例改自己的

1. 复制 `templates/minimal/` 或本目录作为起点。
2. 改 `slides.json` 的 `meta` 与每页的 `palette` / `camera` / `dwell`。
3. 按 `references/layout-patterns.md` 改写 `slides/*.html`。
4. 运行构建脚本，**读一遍构建日志**（含 WCAG 对比度实测与待确认项）。
5. 在浏览器里实际翻一遍。
