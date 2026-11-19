#!/usr/bin/env node
/**
 * dynamic-keynote · PPTX 降级导出
 *
 * 仅在用户明确要求 .pptx 时使用。PPTX 无法承载时间轴编排、镜头语言、
 * 逐字显现与形变过渡，因此本脚本只做「静态排版还原」，并在每页备注中
 * 写明原始动效，便于人工补动画。
 *
 * 用法：
 *   npm i pptxgenjs            （国内镜像：npm config set registry https://registry.npmmirror.com）
 *   node degrade_to_pptx.js deck.json -o out.pptx
 */
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = { input: null, output: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-o' || argv[i] === '--output') { args.output = argv[++i]; }
    else if (!args.input) { args.input = argv[i]; }
  }
  if (!args.input) {
    console.error('用法: node degrade_to_pptx.js <deck.json> [-o out.pptx]');
    process.exit(2);
  }
  if (!args.output) args.output = path.join(path.dirname(args.input), 'degraded.pptx');
  return args;
}

/* 从 HTML 里抽取纯文本块，尽量保留顺序 */
function extractBlocks(html) {
  const blocks = [];
  const re = /<(h1|h2|h3|p|li|span)([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[1];
    const attrs = m[2] || '';
    const text = m[3]
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    if (!text) continue;
    const cls = (attrs.match(/class="([^"]*)"/) || [, ''])[1];
    let role = 'body';
    if (/^h1$/.test(tag) || /\bdisplay\b|\bh1\b/.test(cls)) role = 'title';
    else if (/^h2$/.test(tag) || /\bh2\b/.test(cls)) role = 'heading';
    else if (/^h3$/.test(tag) || /\bh3\b/.test(cls)) role = 'sub';
    else if (/\bstat__num\b/.test(cls)) role = 'stat';
    else if (/\bstat__label\b/.test(cls)) role = 'caption';
    blocks.push({ role, text });
  }
  return blocks;
}

/* 与 assets/palettes.js 保持一致的子集 */
const PALETTES = {
  'deep-space':    { bg: '07080C', text: 'F3F6FB', muted: '9BA7BA', accent: '5B9CFF' },
  'ink-champagne': { bg: '0B0B0C', text: 'F4EFE6', muted: 'A79E90', accent: 'D9B676' },
  'warm-coral':    { bg: 'FAF7F2', text: '1B1714', muted: '5F574D', accent: 'C4401F' },
  'mist-indigo':   { bg: 'F5F6FA', text: '14161F', muted: '565C6E', accent: '4B3FD0' },
  'midnight-lime': { bg: '05101A', text: 'E9F2F7', muted: '93A8B6', accent: 'A8E05F' }
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  let PptxGenJS;
  try {
    PptxGenJS = require('pptxgenjs');
  } catch (e) {
    console.error('[错误] 缺少依赖 pptxgenjs。请执行：npm i pptxgenjs');
    console.error('       国内镜像：npm config set registry https://registry.npmmirror.com');
    process.exit(2);
  }

  const deck = JSON.parse(fs.readFileSync(args.input, 'utf8'));
  const meta = deck.meta || {};
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9';
  pptx.author = meta.author || 'dynamic-keynote';
  pptx.title = meta.title || 'Presentation';

  const notes = [];

  (deck.slides || []).forEach((slide, i) => {
    const pal = PALETTES[slide.palette || meta.palette || 'deep-space'] || PALETTES['deep-space'];
    const s = pptx.addSlide();
    s.background = { color: pal.bg };

    const blocks = slide.pptx && slide.pptx.title
      ? [{ role: 'title', text: slide.pptx.title }]
          .concat((slide.pptx.bullets || []).map((t) => ({ role: 'body', text: t })))
      : extractBlocks(slide.html || '');

    let y = 1.1;
    blocks.forEach((b) => {
      const isTitle = b.role === 'title';
      const size = isTitle ? 44 : b.role === 'heading' ? 30 : b.role === 'sub' ? 22 : b.role === 'stat' ? 40 : 16;
      s.addText(b.text, {
        x: 0.8, y, w: 11.7, h: isTitle ? 1.1 : 0.85,
        fontSize: size,
        bold: isTitle || b.role === 'heading' || b.role === 'stat',
        color: b.role === 'stat' ? pal.accent : isTitle || b.role === 'heading' ? pal.text : pal.muted,
        fontFace: 'Microsoft YaHei',
        align: 'left',
        valign: 'top',
        charSpacing: isTitle ? -1 : 0
      });
      y += isTitle ? 1.35 : b.role === 'heading' ? 0.95 : 0.6;
      if (y > 6.2) y = 6.2;
    });

    const cam = slide.camera || {};
    s.addNotes(
      `第 ${i + 1} 页（原动态演示：${slide.id || i + 1}）\n` +
      `原色板：${slide.palette || meta.palette || 'deep-space'}\n` +
      `原镜头：zoom ${cam.z || 1} / pan ${cam.x || 0}%,${cam.y || 0}%\n` +
      `原动效：拆解 / 镜头推拉 / 逐字显现 等在 PPTX 中无法还原。\n` +
      `建议在本页手工添加：淡入(0.5s) + 上浮(0.4s)，并把强调数字设置为「强调 > 缩放」动画。`
    );
    notes.push(slide.id || `slide-${i + 1}`);
  });

  pptx.writeFile({ fileName: args.output }).then(() => {
    console.log('='.repeat(64));
    console.log('dynamic-keynote · PPTX 降级导出完成');
    console.log('='.repeat(64));
    console.log(`输出   : ${args.output}`);
    console.log(`页数   : ${notes.length}`);
    console.log('限制   : 时间轴编排 / 镜头语言 / 形变过渡 / 逐字显现均无法在 PPTX 中还原。');
    console.log('建议   : 优先使用 HTML 放映；若必须用 PPT，请配合本脚本生成的备注手工补动画。');
    console.log('='.repeat(64));
  });
}

main();
