#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dynamic-keynote · 视频导出
用 Playwright 逐帧驱动 Keynote.seek()，再交给 ffmpeg 合成 MP4。
因为动效跑在一条 GSAP 主时间轴上，导出结果是帧级确定的（与屏幕录制不同，不会掉帧）。

用法：
    python export_video.py <demo.html> [-o 输出目录] [--fps 30] [--size 1920x1080] [--scale 1]
                            [--mode video|frames] [--keep-frames]

依赖：
    pip install playwright
    python -m playwright install chromium
    ffmpeg（Windows: winget install Gyan.FFmpeg  或  https://www.gyan.dev/ffmpeg/builds/）
"""
from __future__ import annotations

import argparse
import math
import shutil
import subprocess
import sys
import time
from pathlib import Path


def human(n: float) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} GB"


def install_hint() -> str:
    return (
        "未找到 ffmpeg。Windows 下任选其一：\n"
        "  winget install Gyan.FFmpeg\n"
        "  或下载静态包：https://www.gyan.dev/ffmpeg/builds/ （解压后把 bin 加入 PATH）\n"
        "  国内镜像：https://mirrors.tuna.tsinghua.edu.cn/ 下的 ffmpeg-release-essentials.zip\n"
        "也可以先加 --mode frames 只导出 PNG 序列，再自行用 ffmpeg 合成。"
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="把单文件动态演示导出为 MP4")
    ap.add_argument("html", help="演示 HTML 路径")
    ap.add_argument("-o", "--output", help="输出目录")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--size", default="1920x1080", help="画布尺寸，如 1920x1080")
    ap.add_argument("--scale", type=float, default=1.0, help="设备像素比（2 = 4K 素材）")
    ap.add_argument("--mode", choices=["video", "frames"], default="video")
    ap.add_argument("--keep-frames", action="store_true", help="合成后保留 PNG 序列")
    ap.add_argument("--crf", type=int, default=18, help="H.264 质量（越小越好，默认 18）")
    args = ap.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[错误] 缺少 playwright。请先执行：pip install playwright", file=sys.stderr)
        print("       国内下载加速：$env:PLAYWRIGHT_DOWNLOAD_HOST='https://npmmirror.com/mirrors/playwright/'", file=sys.stderr)
        return 2

    html_path = Path(args.html).resolve()
    if not html_path.exists():
        print(f"[错误] 找不到 HTML：{html_path}", file=sys.stderr)
        return 2

    out_dir = Path(args.output).resolve() if args.output else html_path.parent / "export"
    frames_dir = out_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)
    out_dir.mkdir(parents=True, exist_ok=True)

    try:
        w, h = (int(x) for x in args.size.lower().split("x"))
    except ValueError:
        print("[错误] --size 格式应为 1920x1080", file=sys.stderr)
        return 2

    url = html_path.as_uri() + "?export=1"
    total_frames = 0
    duration = 0.0

    print("=" * 64)
    print("dynamic-keynote · 视频导出")
    print("=" * 64)
    print(f"源文件 : {html_path.name}")
    print(f"画布   : {w}x{h} @{args.scale}x  {args.fps}fps")
    print(f"输出   : {out_dir}")
    print("-" * 64)

    t0 = time.time()
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--force-color-profile=srgb", "--hide-scrollbars"])
        page = browser.new_page(
            viewport={"width": w, "height": h},
            device_scale_factor=args.scale,
        )
        page.goto(url, wait_until="load")
        page.wait_for_selector("[data-keynote-ready='1']", timeout=20000)
        page.evaluate("Keynote.setMode('manual')")

        duration = float(page.evaluate("Keynote.duration()"))
        total_frames = int(math.ceil(duration * args.fps))
        print(f"时长   : {duration:.2f}s  →  {total_frames} 帧")

        for i in range(total_frames):
            t = i / args.fps
            page.evaluate(f"Keynote.seek({t})")
            page.screenshot(path=str(frames_dir / f"frame_{i:06d}.png"))
            if i % max(1, args.fps) == 0:
                done = i / args.fps
                print(f"  渲染 {done:6.2f}s / {duration:.2f}s  ({done / duration * 100:5.1f}%)")
        browser.close()

    print("-" * 64)
    print(f"帧序列 : {frames_dir}  ({human(sum(f.stat().st_size for f in frames_dir.glob('*.png')))} )")

    if args.mode == "frames":
        print("已按 --mode frames 停止，未调用 ffmpeg。")
        print("=" * 64)
        return 0

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        print("[警告] " + install_hint())
        print("=" * 64)
        return 3

    out_file = out_dir / (html_path.stem + ".mp4")
    cmd = [
        ffmpeg, "-y",
        "-framerate", str(args.fps),
        "-i", str(frames_dir / "frame_%06d.png"),
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", str(args.crf),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        str(out_file),
    ]
    print("合成中 :", " ".join(cmd[1:6]), "...")
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)

    if not args.keep_frames:
        shutil.rmtree(frames_dir, ignore_errors=True)

    print("-" * 64)
    print(f"完成   : {out_file}  ({human(out_file.stat().st_size)})")
    print(f"耗时   : {time.time() - t0:.1f}s")
    print("=" * 64)
    return 0


if __name__ == "__main__":
    sys.exit(main())
