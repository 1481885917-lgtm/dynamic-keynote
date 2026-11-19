#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dynamic-keynote · 构建器
把 slides.json 编译成「单文件、离线可放映」的 Web 演示。

用法：
    python build.py <deck.json> [-o out.html] [--assets 目录] [--out-dir 目录]

产物：
    单个 HTML 文件，内联 CSS / JS / GSAP，无需联网、无需起服务，双击即可放映。

构建日志会输出：每页动画数量、时长估算、色板对比度校验结果、潜在问题。
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
DEFAULT_ASSETS = SKILL / "assets"

# ---------------------------------------------------------------- 颜色工具


def _srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_rgb(value: str):
    h = str(value).strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        return None
    try:
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return None


def relative_luminance(value: str) -> float | None:
    rgb = hex_to_rgb(value)
    if rgb is None:
        return None
    r, g, b = (_srgb_to_linear(c / 255) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(fg: str, bg: str) -> float | None:
    l1, l2 = relative_luminance(fg), relative_luminance(bg)
    if l1 is None or l2 is None:
        return None
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


# ---------------------------------------------------------------- 模板

HTML_SHELL = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<style>
{css}
</style>
</head>
<body>
<div class="boot"><div class="boot__mark">{boot_mark}</div></div>

<div class="deck">
  <div class="stage">
{slides}
  </div>
</div>

<div class="hud">
  <div data-counter>1 / 1</div>
  <div class="hud__keys">
    <span><kbd>→</kbd> 下一页</span>
    <span><kbd>P</kbd> 参数</span>
    <span><kbd>?</kbd> 帮助</span>
  </div>
</div>
<div class="hud__progress"></div>

<script>
{gsap}
</script>
<script>
{palettes}
</script>
<script>
{runtime}
</script>
<script>
{boot}
</script>
</body>
</html>
"""

BOOT_SCRIPT = """
(function () {
  var m = document.querySelector('meta[name="description"]');
  var d = (window.DECK_META && window.DECK_META.description) || (m && m.content) || '';
  document.documentElement.setAttribute('data-deck-description', d);
})();
"""


def slide_body(slide: dict, base_dir: Path) -> str:
    """取页面正文：优先内联 html，其次 htmlFile 指向的片段文件。"""
    body = slide.get("html", "")
    if not body.strip() and slide.get("htmlFile"):
        fp = base_dir / slide["htmlFile"]
        if fp.exists():
            body = fp.read_text(encoding="utf-8")
    return body


def slide_html(slide: dict, index: int, default_palette: str, base_dir: Path) -> str:
    sid = slide.get("id", f"slide-{index + 1}")
    palette = slide.get("palette", default_palette)
    align = slide.get("align", "center")
    camera = slide.get("camera", {"z": 1, "x": 0, "y": 0})
    dwell = slide.get("dwell")

    attrs = [
        f'class="slide"',
        f'data-slide-id="{html.escape(str(sid), quote=True)}"',
        f'data-palette="{html.escape(str(palette), quote=True)}"',
        f'data-align="{html.escape(str(align), quote=True)}"',
        f"data-camera='{html.escape(json.dumps(camera, ensure_ascii=False), quote=True)}'",
    ]
    if dwell is not None:
        attrs.append(f'data-dwell="{float(dwell)}"')

    body = slide.get("html", "")
    if not body.strip() and slide.get("htmlFile"):
        fp = base_dir / slide["htmlFile"]
        if not fp.exists():
            raise FileNotFoundError(f"[{sid}] 找不到片段文件：{fp}")
        body = fp.read_text(encoding="utf-8")
    body = body.strip()
    if not body:
        body = '<div class="slide__inner"><h2 class="h1">（空页）</h2></div>'

    return "    <section " + " ".join(attrs) + ">\n" + body + "\n    </section>"


# ---------------------------------------------------------------- 校验


def audit(deck: dict, palettes: dict, base_dir: Path) -> list[str]:
    """输出可读的质量报告，返回问题列表。"""
    issues: list[str] = []
    slides = deck.get("slides") or []
    if not slides:
        issues.append("deck 中没有任何 slide")
        return issues

    known = set(palettes)
    used_palettes: set[str] = set()
    for i, s in enumerate(slides):
        sid = s.get("id", f"slide-{i + 1}")
        p = s.get("palette") or deck.get("meta", {}).get("palette", "deep-space")
        used_palettes.add(p)
        if p not in known:
            issues.append(f"[{sid}] 使用了未知色板 '{p}'，将回退到默认色")
        body = slide_body(s, base_dir)
        if not body.strip():
            issues.append(f"[{sid}] 内容为空")
        if "data-anim" not in body and "data-explode" not in body:
            issues.append(f"[{sid}] 没有任何 data-anim / data-explode，页面将是静态的")
        cam = s.get("camera", {})
        if cam.get("z", 1) > 3.2:
            issues.append(f"[{sid}] 镜头缩放 z={cam.get('z')} 过大会导致边缘露白，建议 ≤ 3.0")
        if "data-anim" in body and "data-ease" not in body and "data-dur" not in body:
            issues.append(f"[{sid}] 动画未指定缓动/时长，将使用默认 expo.out 0.9s")

    for p in sorted(used_palettes):
        pal = palettes.get(p)
        if not pal:
            continue
        bg = pal.get("bg")
        for key, level, label in (("text", 4.5, "正文"), ("muted", 4.5, "次要文字"), ("accent", 3.0, "强调色")):
            ratio = contrast_ratio(pal.get(key, ""), bg)
            if ratio is None:
                issues.append(f"[色板 {p}] {label} 颜色不是合法 hex")
            elif ratio < level:
                issues.append(
                    f"[色板 {p}] {label} {pal.get(key)} on {bg} 对比度 {ratio:.2f}:1 "
                    f"低于 WCAG AA 要求的 {level}:1"
                )
    return issues


def summarize(deck: dict, base_dir: Path) -> list[str]:
    rows = []
    for i, s in enumerate(deck.get("slides") or [], 1):
        body = slide_body(s, base_dir)
        anims = len(re.findall(r"data-anim=", body))
        groups = len(re.findall(r"data-anim-group", body))
        explode = len(re.findall(r"data-explode=", body))
        counts = len(re.findall(r"data-count=", body))
        bars = len(re.findall(r'data-value=', body))
        cam = s.get("camera", {})
        rows.append(
            f"  {i:>2}. {s.get('id', '-'):<14} 动画 {anims:>2}  分组 {groups}  拆解 {explode}  "
            f"计数 {counts}  图表 {bars}  镜头 z={cam.get('z', 1)}"
        )
    return rows


# ---------------------------------------------------------------- 主流程


def build(deck_path: Path, out_path: Path, assets_dir: Path) -> int:
    deck = json.loads(deck_path.read_text(encoding="utf-8"))
    meta = deck.get("meta", {})

    css = (assets_dir / "runtime.css").read_text(encoding="utf-8")
    runtime = (assets_dir / "runtime.js").read_text(encoding="utf-8")
    palettes_js = (assets_dir / "palettes.js").read_text(encoding="utf-8")
    gsap_path = assets_dir / "vendor" / "gsap.min.js"
    if not gsap_path.exists():
        print(f"[错误] 缺少 GSAP：{gsap_path}", file=sys.stderr)
        return 2
    gsap = gsap_path.read_text(encoding="utf-8")

    # 从 palettes.js 提取色板表用于校验（简单解析，避免额外依赖）
    palettes = {}
    for m in re.finditer(
        r"'([a-z0-9-]+)':\s*\{(.*?)\n    \}", palettes_js, re.S
    ):
        pid, body = m.group(1), m.group(2)
        entry = {}
        for key in ("bg", "bgAlt", "text", "muted", "accent", "accentInk", "glow", "line", "surface", "accentSoft"):
            km = re.search(rf"\b{key}:\s*'([^']+)'", body)
            if km:
                entry[key] = km.group(1)
        palettes[pid] = entry

    default_palette = meta.get("palette", "deep-space")
    slides = "\n".join(
        slide_html(s, i, default_palette, deck_path.parent)
        for i, s in enumerate(deck.get("slides") or [])
    )

    title = meta.get("title", "Keynote")
    desc = meta.get("description", "dynamic-keynote 生成的动态演示")

    doc = HTML_SHELL.format(
        title=html.escape(title),
        desc=html.escape(desc),
        css=css,
        gsap=gsap,
        palettes=palettes_js,
        runtime=runtime,
        boot=BOOT_SCRIPT,
        slides=slides,
        boot_mark=html.escape(meta.get("bootMark", "Loading")),
    )
    # 注入 deck 元信息供运行时与导出脚本读取
    doc = doc.replace(
        "<script>\n(function () {\n  var m = document.querySelector('meta[name=\"description\"]');",
        "<script>\nwindow.DECK_META = " + json.dumps(meta, ensure_ascii=False) + ";\n(function () {\n  var m = document.querySelector('meta[name=\"description\"]');",
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(doc, encoding="utf-8")

    # ------------------------------------------------------------ 日志
    print("=" * 64)
    print(f"dynamic-keynote · 构建完成  {deck_path.name} → {out_path}")
    print("=" * 64)
    print(f"标题    : {title}")
    print(f"页数    : {len(deck.get('slides') or [])}")
    print(f"体积    : {out_path.stat().st_size / 1024:.1f} KB（单文件，内联 GSAP，可离线放映）")
    print("-" * 64)
    print("页面清单：")
    for r in summarize(deck, deck_path.parent):
        print(r)
    print("-" * 64)
    print("色板对比度（WCAG）：")
    for pid, pal in palettes.items():
        bg = pal.get("bg")
        parts = []
        for key, label in (("text", "正文"), ("muted", "次要"), ("accent", "强调")):
            ratio = contrast_ratio(pal.get(key, ""), bg)
            parts.append(f"{label} {ratio:.1f}:1" if ratio else f"{label} —")
        print(f"  {pid:<15} {'  '.join(parts)}")
    issues = audit(deck, palettes, deck_path.parent)
    print("-" * 64)
    if issues:
        print(f"发现 {len(issues)} 个待确认项：")
        for it in issues:
            print("  ! " + it)
    else:
        print("质量检查通过，无待确认项。")
    print("=" * 64)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="把 slides.json 编译为单文件动态演示")
    ap.add_argument("deck", help="deck JSON 路径")
    ap.add_argument("-o", "--output", help="输出 HTML 路径")
    ap.add_argument("--assets", default=str(DEFAULT_ASSETS), help="资源目录（默认 assets/）")
    args = ap.parse_args()

    deck_path = Path(args.deck).resolve()
    if not deck_path.exists():
        print(f"[错误] 找不到 deck 文件：{deck_path}", file=sys.stderr)
        return 2
    out_path = Path(args.output).resolve() if args.output else deck_path.with_suffix(".html")
    return build(deck_path, out_path, Path(args.assets).resolve())


if __name__ == "__main__":
    sys.exit(main())
