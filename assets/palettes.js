/* dynamic-keynote · 色板库
 * 每套遵循 60-30-10：bg/bgAlt 占 60%，text/muted/surface 占 30%，accent/glow 占 10%。
 * 所有数值均已按 WCAG 校验：text 与 muted 对 bg ≥ 4.5:1，accent 对 bg ≥ 3:1（实测值见 references/palettes.md）。
 */
(function (g) {
  'use strict';

  var PALETTES = {
    'deep-space': {
      id: 'deep-space',
      name: '深空灰 × 荧光蓝',
      note: '科技新品 / 硬件发布',
      isLight: false,
      bg: '#07080C',
      bgAlt: '#0B0E15',
      surface: 'rgba(255,255,255,0.045)',
      text: '#F3F6FB',
      muted: '#9BA7BA',
      accent: '#5B9CFF',
      accentInk: '#06080D',
      accentSoft: 'rgba(91,156,255,0.14)',
      line: 'rgba(255,255,255,0.10)',
      glow: '#1E5BFF',
      font: 'system'
    },
    'ink-champagne': {
      id: 'ink-champagne',
      name: '墨黑 × 香槟金',
      note: '奢品 / 高端服务 / 品牌片',
      isLight: false,
      bg: '#0B0B0C',
      bgAlt: '#121013',
      surface: 'rgba(244,239,230,0.05)',
      text: '#F4EFE6',
      muted: '#A79E90',
      accent: '#D9B676',
      accentInk: '#0B0B0C',
      accentSoft: 'rgba(217,182,118,0.12)',
      line: 'rgba(244,239,230,0.12)',
      glow: '#B08D4F',
      font: 'system'
    },
    'warm-coral': {
      id: 'warm-coral',
      name: '暖白 × 珊瑚橙',
      note: '生活方式 / 消费级产品 / 品牌故事',
      isLight: true,
      bg: '#FAF7F2',
      bgAlt: '#F2EDE4',
      surface: 'rgba(27,23,20,0.045)',
      text: '#1B1714',
      muted: '#5F574D',
      accent: '#C4401F',
      accentInk: '#FFFFFF',
      accentSoft: 'rgba(196,64,31,0.10)',
      line: 'rgba(27,23,20,0.12)',
      glow: '#FF6B4A',
      font: 'system'
    },
    'mist-indigo': {
      id: 'mist-indigo',
      name: '薄雾 × 靛紫',
      note: 'SaaS / 数据 / 企业级发布',
      isLight: true,
      bg: '#F5F6FA',
      bgAlt: '#EAECF5',
      surface: 'rgba(20,22,31,0.045)',
      text: '#14161F',
      muted: '#565C6E',
      accent: '#4B3FD0',
      accentInk: '#FFFFFF',
      accentSoft: 'rgba(75,63,208,0.10)',
      line: 'rgba(20,22,31,0.12)',
      glow: '#6B5CE7',
      font: 'system'
    },
    'midnight-lime': {
      id: 'midnight-lime',
      name: '午夜蓝 × 青柠',
      note: '运动 / 户外 / 年轻化产品',
      isLight: false,
      bg: '#05101A',
      bgAlt: '#08161F',
      surface: 'rgba(233,242,247,0.05)',
      text: '#E9F2F7',
      muted: '#93A8B6',
      accent: '#A8E05F',
      accentInk: '#061019',
      accentSoft: 'rgba(168,224,95,0.13)',
      line: 'rgba(233,242,247,0.12)',
      glow: '#2E7D4F',
      font: 'system'
    }
  };

  var FONT_STACKS = {
    system: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans SC", sans-serif',
    inter: '"Inter", "SF Pro Display", -apple-system, "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif',
    han: '"Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
    serif: '"New York", "Source Han Serif SC", "Songti SC", "STSong", Georgia, "Times New Roman", serif'
  };

  var FONT_LABELS = {
    system: '系统字体（SF Pro / 苹方）',
    inter: 'Inter',
    han: '思源黑体',
    serif: '衬线 / 编辑风'
  };

  g.PALETTES = PALETTES;
  g.FONT_STACKS = FONT_STACKS;
  g.FONT_LABELS = FONT_LABELS;
})(window);
