/* dynamic-keynote · runtime.js
 * 单文件运行引擎：时间轴编排 / 镜头语言 / 动态拆解 / 数据动效 / 参数面板 / 导出接口
 * 依赖：GSAP 3.x（已随模板内联，无需联网）
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var PALETTES = window.PALETTES || {};
  var FONT_STACKS = window.FONT_STACKS || {};
  var FONT_LABELS = window.FONT_LABELS || {};

  if (!window.gsap) {
    doc.body.innerHTML = '<div style="padding:40px;font:14px system-ui;color:#F3F6FB">' +
      'GSAP 未加载：请确认 assets/vendor/gsap.min.js 已内联到页面中。</div>';
    return;
  }
  var gsap = window.gsap;

  /* ------------------------------------------------------------------ *
   * 状态
   * ------------------------------------------------------------------ */
  var state = {
    mode: 'manual',          // manual | auto | scroll
    speed: 1,               // 时间轴倍速
    dwell: 2.6,             // 每页停留秒数
    palette: 'auto',        // auto = 各页使用自身配色；否则全deck统一
    font: 'system',
    grid: false,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    particles: true,
    debug: false,
    index: 0,
    exportMode: false
  };

  var slides = [];          // { el, tl, id, palette, camera, dwell, contentStart, contentEnd, revealStart }
  var master = null;
  var totalDuration = 0;
  var gateEnd = 0;          // manual 模式下的自动暂停点
  var deckEl = null, stageEl = null;
  var panelEl, hudEl, debugEl, gridEl, helpEl, progressEl, handleEl;

  /* ------------------------------------------------------------------ *
   * 工具
   * ------------------------------------------------------------------ */
  function qa(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? (d || 0) : n; }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function hexToRgba(hex, a) {
    var h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function dur(v, def) {
    var d = v === undefined || v === null || v === '' ? (def === undefined ? 0.9 : def) : num(v, def);
    return state.reduced ? Math.min(d, 0.28) : d;
  }

  var EASE = {
    'expo.out': 'expo.out',
    'expo.inOut': 'expo.inOut',
    'power4.out': 'power4.out',
    'power3.out': 'power3.out',
    'power2.out': 'power2.out',
    'power2.in': 'power2.in',
    'power2.inOut': 'power2.inOut',
    'back.out(1.7)': 'back.out(1.7)',
    'elastic.out(1,0.62)': 'elastic.out(1,0.62)',
    'sine.inOut': 'sine.inOut',
    'none': 'none'
  };
  function ease(name) { return EASE[name] || 'expo.out'; }

  /* ------------------------------------------------------------------ *
   * 主题应用
   * ------------------------------------------------------------------ */
  var VAR_MAP = {
    bg: '--bg', bgAlt: '--bg-alt', surface: '--surface', text: '--text',
    muted: '--muted', accent: '--accent', accentInk: '--accent-ink',
    accentSoft: '--accent-soft', line: '--line', glow: '--glow'
  };

  function paletteVars(p) {
    var o = {};
    for (var k in VAR_MAP) if (p[k]) o[VAR_MAP[k]] = p[k];
    o['--glow-soft'] = hexToRgba(p.glow, p.isLight ? 0.18 : 0.26);
    o['--glow-soft-2'] = hexToRgba(p.accent, p.isLight ? 0.12 : 0.16);
    return o;
  }

  function applyVars(target, p) {
    var vars = paletteVars(p);
    for (var k in vars) target.style.setProperty(k, vars[k]);
  }

  function slidePalette(s) {
    if (state.palette !== 'auto') return PALETTES[state.palette] || PALETTES[slides[0].palette];
    return PALETTES[s.palette] || PALETTES[slides[0].palette] || PALETTES['deep-space'];
  }

  function refreshPalettes() {
    slides.forEach(function (s) { applyVars(s.el, slidePalette(s)); });
    var deckPalette = state.palette === 'auto'
      ? (PALETTES[slides[state.index] ? slides[state.index].palette : 'deep-space'] || PALETTES['deep-space'])
      : PALETTES[state.palette];
    if (deckPalette) applyVars(root, deckPalette);
  }

  /* ------------------------------------------------------------------ *
   * 文本拆分
   * ------------------------------------------------------------------ */
  function splitChars(el) {
    var text = el.textContent;
    el.textContent = '';
    var frag = doc.createDocumentFragment();
    text.split(/(\s+)/).forEach(function (chunk) {
      if (!chunk) return;
      if (/^\s+$/.test(chunk)) { frag.appendChild(doc.createTextNode(chunk)); return; }
      Array.prototype.forEach.call(chunk, function (ch) {
        var s = doc.createElement('span');
        s.className = 'split-char';
        s.textContent = ch;
        frag.appendChild(s);
      });
    });
    el.appendChild(frag);
    return qa('.split-char', el);
  }

  function splitWords(el) {
    var text = el.textContent;
    el.textContent = '';
    var frag = doc.createDocumentFragment();
    text.split(/(\s+)/).forEach(function (chunk) {
      if (!chunk) return;
      if (/^\s+$/.test(chunk)) { frag.appendChild(doc.createTextNode(chunk)); return; }
      var s = doc.createElement('span');
      s.className = 'split-word';
      s.textContent = chunk;
      frag.appendChild(s);
    });
    el.appendChild(frag);
    return qa('.split-word', el);
  }

  /* ------------------------------------------------------------------ *
   * 入场动画词汇表（禁止一律淡入）
   * ------------------------------------------------------------------ */
  var ANIMS = {
    'fade':       { from: { opacity: 0 }, to: { opacity: 1 } },
    'rise':       { from: { opacity: 0, y: 44 }, to: { opacity: 1, y: 0 } },
    'drop':       { from: { opacity: 0, y: -44 }, to: { opacity: 1, y: 0 } },
    'slide-left': { from: { opacity: 0, x: 70 }, to: { opacity: 1, x: 0 } },
    'slide-right':{ from: { opacity: 0, x: -70 }, to: { opacity: 1, x: 0 } },
    'scale':      { from: { opacity: 0, scale: 0.9 }, to: { opacity: 1, scale: 1 } },
    'zoom':       { from: { opacity: 0, scale: 1.14 }, to: { opacity: 1, scale: 1 } },
    'blur-in':    { from: { opacity: 0, filter: 'blur(16px)' }, to: { opacity: 1, filter: 'blur(0px)' } },
    'blur-out':   { from: { opacity: 1, filter: 'blur(0px)' }, to: { opacity: 0, filter: 'blur(16px)' } },
    'wipe':       { from: { clipPath: 'inset(0 100% 0 0)' }, to: { clipPath: 'inset(0 0 0 0)' } },
    'mask-up':    { from: { clipPath: 'inset(100% 0 0 0)' }, to: { clipPath: 'inset(0 0 0 0)' } },
    'glow':       { from: { opacity: 0, filter: 'brightness(2.4) blur(6px)' }, to: { opacity: 1, filter: 'brightness(1) blur(0px)' } },
    'perspective':{ from: { opacity: 0, rotationX: -55, y: 40, transformPerspective: 900 }, to: { opacity: 1, rotationX: 0, y: 0 } },
    'tilt':       { from: { opacity: 0, rotationY: -32, x: -50, transformPerspective: 1000 }, to: { opacity: 1, rotationY: 0, x: 0 } }
  };

  function addAnim(tl, el, delay, ambient, defDur) {
    var kind = el.dataset.anim;
    var d = dur(el.dataset.dur, defDur !== undefined ? defDur : 0.9);
    var e = ease(el.dataset.ease);
    var at = delay;

    if (kind === 'split' || kind === 'typing') {
      var chars = splitChars(el);
      tl.fromTo(chars,
        { opacity: 0, yPercent: 60, rotateX: -70, transformPerspective: 700 },
        { opacity: 1, yPercent: 0, rotateX: 0, duration: d, ease: e, stagger: num(el.dataset.splitSpeed, 0.028) }, at);
      return;
    }
    if (kind === 'word-by-word') {
      var words = splitWords(el);
      tl.fromTo(words,
        { opacity: 0, y: 26, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: d, ease: e, stagger: num(el.dataset.splitSpeed, 0.06) }, at);
      return;
    }
    if (kind === 'count') {
      var target = num(el.dataset.count, 0);
      var dec = num(el.dataset.countDecimals, 0);
      var pre = el.dataset.countPrefix || '';
      var suf = el.dataset.countSuffix || '';
      var sep = el.dataset.countSep !== 'false';
      var obj = { v: num(el.dataset.countFrom, 0) };
      tl.to(obj, {
        v: target, duration: dur(el.dataset.countDur, d), ease: e,
        onUpdate: function () {
          var val = dec > 0 ? obj.v.toFixed(dec) : String(Math.round(obj.v));
          if (sep) val = Number(val).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
          el.textContent = pre + val + suf;
        }
      }, at);
      return;
    }
    if (kind === 'draw') {
      var paths = el.tagName && el.tagName.toLowerCase() === 'path' ? [el] : qa('path', el);
      paths.forEach(function (p, i) {
        var len = p.getTotalLength ? p.getTotalLength() : 1000;
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(p, { strokeDashoffset: 0, duration: d, ease: e }, at + i * 0.08);
      });
      return;
    }
    if (kind === 'bar') {
      var w = num(el.dataset.value, 100);
      gsap.set(el, { width: '0%' });
      tl.to(el, { width: w + '%', duration: d, ease: e }, at);
      return;
    }
    if (kind === 'float') {
      tl.fromTo(el, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: d, ease: e }, at);
      if (!state.reduced && ambient) {
        ambient.to(el, { yPercent: -3.5, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
      }
      return;
    }
    if (kind === 'orbit') {
      tl.fromTo(el, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: d, ease: e }, at);
      if (!state.reduced && ambient) {
        ambient.to(el, { rotation: 360, duration: 26, ease: 'none', repeat: -1 }, 0);
      }
      return;
    }
    if (kind === 'beam') {
      tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: d, ease: e }, at);
      return;
    }
    if (kind === 'parallax') {
      el.dataset.depth = el.dataset.depth || '0.4';
      tl.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: d, ease: e }, at);
      return;
    }

    var preset = ANIMS[kind];
    if (!preset) return;
    tl.fromTo(el, preset.from, Object.assign({}, preset.to, { duration: d, ease: e }), at);
  }

  /* ------------------------------------------------------------------ *
   * 动态拆解（Build & Explode）
   * ------------------------------------------------------------------ */
  function explodeOffsets(group) {
    var parts = qa('[data-part]', group);
    if (!parts.length) return [];
    var mode = group.dataset.explode || 'radial';
    var gap = num(group.dataset.gap, 130);
    var box = group.getBoundingClientRect();
    var cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    return parts.map(function (p, i) {
      var r = p.getBoundingClientRect();
      var px = r.left + r.width / 2 - cx;
      var py = r.top + r.height / 2 - cy;
      var dx, dy;
      if (mode === 'stack') {
        dx = 0; dy = (i - (parts.length - 1) / 2) * gap;
      } else if (mode === 'grid') {
        dx = ((i % 3) - 1) * gap * 0.9; dy = (Math.floor(i / 3) - 1) * gap * 0.7;
      } else if (mode === 'center') {
        /* 从容器中心同时出发，各自飞向自己的位置 —— 经典的「组装」 */
        dx = -px; dy = -py;
      } else {
        var len = Math.hypot(px, py);
        if (len < 1) { dx = Math.cos(i * 2.399) * gap; dy = Math.sin(i * 2.399) * gap; }
        else { dx = px / len * gap; dy = py / len * gap; }
      }
      return { el: p, dx: dx, dy: dy, rot: ((i % 3) - 1) * 2.4 };
    });
  }

  function addExplode(tl, group) {
    var offs = explodeOffsets(group);
    var d = dur(group.dataset.dur, 1.05);
    var stag = num(group.dataset.stagger, 0.075);
    offs.forEach(function (o, i) {
      tl.fromTo(o.el,
        { x: o.dx, y: o.dy, opacity: 0, scale: 0.82, rotation: o.rot },
        { x: 0, y: 0, opacity: 1, scale: 1, rotation: 0, duration: d, ease: 'expo.out' }, i * stag);
    });
    group._kxOffsets = offs;
  }

  /* ------------------------------------------------------------------ *
   * 内容时间轴
   * ------------------------------------------------------------------ */
  function buildContentTimeline(slide) {
    var tl = gsap.timeline();
    var ambient = gsap.timeline({ paused: true });
    var el = slide.el;
    var inExplode = qa('[data-explode]', el);

    /* 分组错峰：data-dur 可作为组内元素的默认时长 */
    qa('[data-anim-group]', el).forEach(function (group) {
      var kids = qa('[data-anim]', group).filter(function (k) {
        return !k.closest('[data-explode]');
      });
      var stag = num(group.dataset.stagger, 0.08);
      var gdur = group.dataset.dur !== undefined ? num(group.dataset.dur) : undefined;
      kids.forEach(function (k, i) {
        addAnim(tl, k, num(k.dataset.delay, 0) + i * stag, ambient, gdur);
      });
    });

    /* 单元素 */
    qa('[data-anim]', el).forEach(function (e) {
      if (e.closest('[data-anim-group]')) return;
      if (e.closest('[data-explode]')) return;
      addAnim(tl, e, num(e.dataset.delay, 0), ambient);
    });

    /* 拆解 */
    inExplode.forEach(function (g) { addExplode(tl, g); });

    slide.ambient = ambient;
    return tl;
  }

  /* 环境循环动效独立于主时间轴，否则无限循环会把时间轴时长撑爆 */
  function syncAmbient() {
    slides.forEach(function (s, i) {
      if (!s.ambient) return;
      if (i === state.index) { if (!s.ambient.isActive()) s.ambient.play(); }
      else { s.ambient.pause(); }
    });
  }

  /* ------------------------------------------------------------------ *
   * FLIP 形变过渡（morph）
   * ------------------------------------------------------------------ */
  /* 布局坐标（不受 transform / 镜头缩放影响），用于 FLIP 差值计算 */
  function layoutRect(el, stop) {
    var x = 0, y = 0, node = el;
    while (node && node !== stop) {
      x += node.offsetLeft || 0;
      y += node.offsetTop || 0;
      node = node.offsetParent;
    }
    return { left: x, top: y, width: el.offsetWidth || 0, height: el.offsetHeight || 0 };
  }

  function measureMorph() {
    var map = {};
    slides.forEach(function (s) {
      qa('[data-morph]', s.el).forEach(function (el) {
        var key = el.dataset.morph;
        (map[key] = map[key] || {})[s.id] = { el: el, r: layoutRect(el, s.el) };
      });
    });
    return map;
  }

  function applyMorph(masterTl, morphMap) {
    for (var key in morphMap) {
      var pair = morphMap[key];
      var prevId = null;
      slides.forEach(function (s) {
        if (!pair[s.id]) return;
        if (prevId && pair[prevId]) {
          var a = pair[prevId], b = pair[s.id];
          var dx = a.r.left - b.r.left;
          var dy = a.r.top - b.r.top;
          var sx = a.r.width && b.r.width ? a.r.width / b.r.width : 1;
          var sy = a.r.height && b.r.height ? a.r.height / b.r.height : 1;
          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01) {
            masterTl.fromTo(b.el,
              { x: dx, y: dy, scaleX: sx, scaleY: sy },
              { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.95, ease: 'expo.out' },
              s.revealStart);
          }
        }
        prevId = s.id;
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * 主时间轴
   * ------------------------------------------------------------------ */
  function buildMaster() {
    var keep = master && master.time ? master.time() : 0;
    if (master) { master.kill(); master = null; }

    var morphMap = measureMorph();
    master = gsap.timeline({ paused: true });
    master.timeScale(state.speed);

    /* 第一遍：各页内容时间轴 */
    slides.forEach(function (s) { s.tl = buildContentTimeline(s); });

    /* 第二遍：排布位置并挂到主轴 */
    var cursor = 0;
    slides.forEach(function (s, i) {
      s.revealStart = Math.max(0, cursor - 0.35);
      s.contentStart = cursor + 0.10;
      s.contentEnd = s.contentStart + s.tl.duration();
      s.nextCursor = s.contentEnd + s.dwell;

      var prev = slides[i - 1];
      if (i === 0) {
        master.fromTo(s.el,
          { autoAlpha: 0, scale: 1.05, filter: 'blur(12px)' },
          { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' }, s.revealStart);
      } else {
        master.fromTo(s.el,
          { autoAlpha: 0, scale: 0.965, y: 34, filter: 'blur(12px)' },
          { autoAlpha: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.95, ease: 'expo.out' }, s.revealStart);
        master.to(prev.el,
          { autoAlpha: 0, scale: 1.045, filter: 'blur(12px)', duration: 0.62, ease: 'power2.in' }, s.revealStart);
        /* 拆解件在退场时向外飞散 */
        qa('[data-explode]', prev.el).forEach(function (g) {
          var offs = g._kxOffsets || explodeOffsets(g);
          offs.forEach(function (o, k) {
            master.to(o.el, {
              x: o.dx * 2.1, y: o.dy * 2.1, opacity: 0, scale: 0.9, rotation: o.rot * 2,
              duration: 0.6, ease: 'power2.in'
            }, s.revealStart + k * 0.03);
          });
        });
      }

      master.add(s.tl, s.contentStart);

      /* 镜头语言：缩放 / 平移 */
      master.to(stageEl, {
        scale: s.camera.z,
        x: s.camera.x + '%',
        y: s.camera.y + '%',
        duration: 1.25,
        ease: 'expo.out'
      }, Math.max(0, s.revealStart - 0.1));

      cursor = s.nextCursor;
    });

    applyMorph(master, morphMap);
    totalDuration = cursor;

    master.eventCallback('onUpdate', onMasterUpdate);
    master.eventCallback('onComplete', onMasterComplete);

    if (keep > 0 && keep < totalDuration) master.time(keep);
    gateEnd = slides[state.index] ? slides[state.index].contentEnd : 0;
    updateHud();
    return master;
  }

  /* ------------------------------------------------------------------ *
   * 播放控制
   * ------------------------------------------------------------------ */
  function onMasterUpdate() {
    if (!master) return;
    var t = master.time();
    var i = currentIndexByTime(t);
    if (i !== state.index) { state.index = i; refreshPalettes(); syncAmbient(); }
    if ((state.mode === 'manual' || state.mode === 'scroll') && t >= gateEnd) master.pause();
    updateHud();
    updateDebug();
  }

  function onMasterComplete() {
    if (state.mode === 'auto') {
      master.restart();
      master.play();
    } else {
      master.pause();
    }
  }

  function currentIndexByTime(t) {
    for (var i = slides.length - 1; i >= 0; i--) {
      if (t >= slides[i].revealStart) return i;
    }
    return 0;
  }

  function goto(i, instant) {
    i = clamp(i, 0, slides.length - 1);
    if (!master) return;
    var target = Math.max(0, slides[i].revealStart - 0.12);
    master.pause();
    master.time(target);
    if (!instant) master.play();
    state.index = i;
    gateEnd = slides[i].contentEnd;
    refreshPalettes();
    syncAmbient();
    updateHud();
  }

  function next() {
    if (state.index >= slides.length - 1) { if (state.mode === 'auto') master.restart(); return; }
    goto(state.index + 1);
  }

  function prev() {
    if (state.index <= 0) return;
    goto(state.index - 1);
  }

  function replay() {
    master.restart();
    state.index = 0;
    gateEnd = slides[0].contentEnd;
    refreshPalettes();
    syncAmbient();
    master.play();
  }

  /* ------------------------------------------------------------------ *
   * 视差（鼠标）
   * ------------------------------------------------------------------ */
  var pointer = { x: 0, y: 0 };
  function initParallax() {
    if (state.exportMode) return;
    doc.addEventListener('mousemove', function (e) {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2;
      if (state.reduced) return;
      var cur = slides[state.index];
      if (!cur) return;
      qa('[data-depth]', cur.el).forEach(function (el) {
        var d = num(el.dataset.depth, 0.3);
        gsap.to(el, {
          x: pointer.x * d * 46,
          y: pointer.y * d * 34,
          duration: 1.1,
          ease: 'power3.out',
          overwrite: 'auto'
        });
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * 粒子层
   * ------------------------------------------------------------------ */
  function initParticles() {
    if (!state.particles || state.exportMode) return;
    var canvas = doc.createElement('canvas');
    canvas.className = 'particles';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '1', opacity: '0.5'
    });
    deckEl.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var dots = [];

    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() {
      var n = Math.round(Math.min(90, window.innerWidth / 18));
      dots = [];
      for (var i = 0; i < n; i++) {
        dots.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          r: Math.random() * 1.8 + 0.4,
          vx: (Math.random() - 0.5) * 0.16,
          vy: -(Math.random() * 0.22 + 0.05),
          a: Math.random() * 0.45 + 0.15
        });
      }
    }
    function frame() {
      if (!canvas.isConnected) return;
      var accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#5B9CFF';
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.fillStyle = accent;
      dots.forEach(function (d) {
        d.x += d.vx + pointer.x * 0.06;
        d.y += d.vy + pointer.y * 0.06;
        if (d.y < -6) { d.y = window.innerHeight + 6; d.x = Math.random() * window.innerWidth; }
        if (d.x < -6) d.x = window.innerWidth + 6;
        if (d.x > window.innerWidth + 6) d.x = -6;
        ctx.globalAlpha = d.a;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    resize(); seed();
    window.addEventListener('resize', function () { resize(); seed(); });
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------ *
   * HUD / 调试 / 网格 / 帮助
   * ------------------------------------------------------------------ */
  function updateHud() {
    if (!progressEl || !master) return;
    var p = totalDuration ? clamp(master.time() / totalDuration, 0, 1) : 0;
    progressEl.style.width = (p * 100).toFixed(2) + '%';
    var counter = hudEl && hudEl.querySelector('[data-counter]');
    if (counter) counter.textContent = (state.index + 1) + ' / ' + slides.length;
  }

  function updateDebug() {
    if (!state.debug || !debugEl) return;
    var s = slides[state.index];
    debugEl.textContent =
      'slide   : ' + (state.index + 1) + '/' + slides.length + '  ' + (s ? s.id : '-') + '\n' +
      'palette : ' + (s ? s.palette : '-') + '   mode: ' + state.mode + '\n' +
      'time    : ' + (master ? master.time().toFixed(2) : 0) + ' / ' + totalDuration.toFixed(2) + 's\n' +
      'content : ' + (s ? s.contentEnd.toFixed(2) : 0) + 's   anims: ' +
        (s ? s.tl.getChildren().length : 0) + '\n' +
      'speed   : ' + state.speed.toFixed(2) + 'x  dwell: ' + state.dwell.toFixed(1) + 's\n' +
      'camera  : z=' + (s ? s.camera.z : 1) + ' x=' + (s ? s.camera.x : 0) + '% y=' + (s ? s.camera.y : 0) + '%';
  }

  function toggleGrid(on) {
    state.grid = on === undefined ? !state.grid : !!on;
    if (gridEl) gridEl.classList.toggle('is-on', state.grid);
  }

  function buildGrid() {
    gridEl = doc.createElement('div');
    gridEl.className = 'grid-overlay';
    for (var i = 0; i < 12; i++) gridEl.appendChild(doc.createElement('i'));
    doc.body.appendChild(gridEl);
  }

  function buildHelp() {
    helpEl = doc.createElement('div');
    helpEl.className = 'help';
    helpEl.hidden = true;
    helpEl.innerHTML =
      '<div class="help__box"><h3>快捷键</h3><dl>' +
      '<dt>→ / ↓ / Space</dt><dd>下一页</dd>' +
      '<dt>← / ↑</dt><dd>上一页</dd>' +
      '<dt>Home / End</dt><dd>首页 / 末页</dd>' +
      '<dt>P</dt><dd>显示 / 隐藏参数面板</dd>' +
      '<dt>G</dt><dd>网格叠加（12 栏）</dd>' +
      '<dt>D</dt><dd>调试信息</dd>' +
      '<dt>R</dt><dd>重播</dd>' +
      '<dt>A</dt><dd>自动播放开关</dd>' +
      '<dt>F</dt><dd>全屏</dd>' +
      '<dt>?</dt><dd>本帮助</dd>' +
      '</dl></div>';
    doc.body.appendChild(helpEl);
    helpEl.addEventListener('click', function () { helpEl.hidden = true; });
  }

  /* ------------------------------------------------------------------ *
   * 参数面板
   * ------------------------------------------------------------------ */
  function buildPanel() {
    panelEl = doc.createElement('aside');
    panelEl.className = 'panel';

    var paletteOpts = Object.keys(PALETTES).map(function (k) {
      return '<option value="' + k + '">' + PALETTES[k].name + '</option>';
    }).join('');
    var fontOpts = Object.keys(FONT_STACKS).map(function (k) {
      return '<option value="' + k + '">' + (FONT_LABELS[k] || k) + '</option>';
    }).join('');

    panelEl.innerHTML =
      '<div class="panel__title"><span>Keynote 参数</span><span>P 隐藏</span></div>' +
      '<div class="panel__row"><label>配色主题</label>' +
        '<select data-ctl="palette"><option value="auto">跟随每页设定</option>' + paletteOpts + '</select></div>' +
      '<div class="panel__row"><label>字体</label>' +
        '<select data-ctl="font">' + fontOpts + '</select></div>' +
      '<div class="panel__row"><label>动画速度 <b data-out="speed">1.0×</b></label>' +
        '<input type="range" min="0.4" max="2" step="0.1" value="1" data-ctl="speed"></div>' +
      '<div class="panel__row"><label>每页停留 <b data-out="dwell">2.6s</b></label>' +
        '<input type="range" min="1" max="8" step="0.1" value="2.6" data-ctl="dwell"></div>' +
      '<div class="panel__row"><label>播放方式</label>' +
        '<select data-ctl="mode">' +
          '<option value="manual">手动翻页</option>' +
          '<option value="auto">自动播放</option>' +
          '<option value="scroll">滚动翻页</option>' +
        '</select></div>' +
      '<div class="panel__toggles">' +
        '<button class="chip" data-toggle="grid">网格</button>' +
        '<button class="chip" data-toggle="reduced">减少动效</button>' +
        '<button class="chip" data-toggle="particles">粒子</button>' +
        '<button class="chip" data-toggle="debug">调试</button>' +
      '</div>' +
      '<div class="panel__actions">' +
        '<button class="btn" data-act="prev">◀</button>' +
        '<button class="btn" data-act="next">▶</button>' +
        '<button class="btn" data-act="replay">↺</button>' +
        '<button class="btn" data-act="full">⛶</button>' +
      '</div>' +
      '<div class="panel__foot">拖动速度 / 停留滑块会即时重排时间轴。</div>';

    doc.body.appendChild(panelEl);

    /* 收起把手 + 鼠标靠近右上角自动展开，避免面板长期遮挡正文 */
    handleEl = doc.createElement('button');
    handleEl.className = 'panel-handle';
    handleEl.textContent = '参数';
    handleEl.title = '参数面板 (P)';
    doc.body.appendChild(handleEl);
    handleEl.addEventListener('click', expandPanel);

    doc.addEventListener('mousemove', function (e) {
      if (!panelEl) return;
      var near = e.clientX > window.innerWidth - 340 && e.clientY < 440;
      if (near) expandPanel(); else collapsePanel();
    }, { passive: true });

    panelEl.addEventListener('input', function (e) {
      var ctl = e.target.dataset.ctl;
      if (!ctl) return;
      if (ctl === 'speed') {
        state.speed = num(e.target.value, 1);
        panelEl.querySelector('[data-out="speed"]').textContent = state.speed.toFixed(1) + '×';
        if (master) master.timeScale(state.speed);
      } else if (ctl === 'dwell') {
        state.dwell = num(e.target.value, 2.6);
        panelEl.querySelector('[data-out="dwell"]').textContent = state.dwell.toFixed(1) + 's';
        slides.forEach(function (s) { if (!s.el.dataset.dwell) s.dwell = state.dwell; });
        buildMaster();
      } else if (ctl === 'palette') {
        state.palette = e.target.value;
        refreshPalettes();
      } else if (ctl === 'font') {
        state.font = e.target.value;
        root.style.setProperty('--font-stack', FONT_STACKS[state.font] || FONT_STACKS.system);
      } else if (ctl === 'mode') {
        setMode(e.target.value);
      }
    });

    panelEl.addEventListener('click', function (e) {
      var act = e.target.dataset.act;
      if (act === 'next') next();
      else if (act === 'prev') prev();
      else if (act === 'replay') replay();
      else if (act === 'full') toggleFullscreen();
      var tg = e.target.dataset.toggle;
      if (tg) {
        if (tg === 'grid') { toggleGrid(); syncChips(); }
        else if (tg === 'reduced') { state.reduced = !state.reduced; doc.body.classList.toggle('is-reduced', state.reduced); syncChips(); }
        else if (tg === 'particles') { state.particles = !state.particles; syncChips(); }
        else if (tg === 'debug') { state.debug = !state.debug; if (debugEl) debugEl.hidden = !state.debug; syncChips(); updateDebug(); }
      }
    });

    syncChips();
  }

  function syncChips() {
    if (!panelEl) return;
    var map = { grid: state.grid, reduced: state.reduced, particles: state.particles, debug: state.debug };
    qa('[data-toggle]', panelEl).forEach(function (b) {
      b.setAttribute('aria-pressed', map[b.dataset.toggle] ? 'true' : 'false');
    });
  }

  function collapsePanel() {
    if (!panelEl) return;
    panelEl.classList.add('is-collapsed');
    if (handleEl) handleEl.classList.add('is-on');
  }

  function expandPanel() {
    if (!panelEl) return;
    panelEl.classList.remove('is-collapsed');
    if (handleEl) handleEl.classList.remove('is-on');
  }

  function toggleFullscreen() {
    if (!doc.fullscreenElement) {
      (doc.documentElement.requestFullscreen || function () {}).call(doc.documentElement);
    } else if (doc.exitFullscreen) {
      doc.exitFullscreen();
    }
  }

  function setMode(m) {
    state.mode = m;
    var sel = panelEl && panelEl.querySelector('[data-ctl="mode"]');
    if (sel) sel.value = m;
    if (m === 'auto') {
      gateEnd = Infinity;
      if (master) { master.play(); }
    } else {
      gateEnd = slides[state.index] ? slides[state.index].contentEnd : 0;
      if (master) master.pause();
    }
  }

  /* ------------------------------------------------------------------ *
   * 交互绑定
   * ------------------------------------------------------------------ */
  function bindKeys() {
    doc.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === ' ' || k === 'PageDown') { e.preventDefault(); next(); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); prev(); }
      else if (k === 'Home') { goto(0); }
      else if (k === 'End') { goto(slides.length - 1); }
      else if (k === 'p' || k === 'P') { if (panelEl.classList.contains('is-collapsed')) expandPanel(); else collapsePanel(); }
      else if (k === 'g' || k === 'G') { toggleGrid(); syncChips(); }
      else if (k === 'd' || k === 'D') { state.debug = !state.debug; if (debugEl) debugEl.hidden = !state.debug; syncChips(); updateDebug(); }
      else if (k === 'r' || k === 'R') { replay(); }
      else if (k === 'a' || k === 'A') { setMode(state.mode === 'auto' ? 'manual' : 'auto'); }
      else if (k === 'f' || k === 'F') { toggleFullscreen(); }
      else if (k === '?' || k === '/') { if (helpEl) helpEl.hidden = !helpEl.hidden; }
      else if (k === 'Escape') { if (helpEl) helpEl.hidden = true; }
    });

    var wheelLock = 0;
    doc.addEventListener('wheel', function (e) {
      if (state.mode !== 'scroll') return;
      var now = Date.now();
      if (now - wheelLock < 900) return;
      if (Math.abs(e.deltaY) < 18) return;
      wheelLock = now;
      if (e.deltaY > 0) next(); else prev();
    }, { passive: true });

    var tx = 0, ty = 0;
    doc.addEventListener('touchstart', function (e) {
      tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY;
    }, { passive: true });
    doc.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); }
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * 初始化
   * ------------------------------------------------------------------ */
  function collectSlides() {
    var nodes = qa('.slide');
    slides = nodes.map(function (el, i) {
      var cam = { z: 1, x: 0, y: 0 };
      if (el.dataset.camera) {
        try { cam = Object.assign(cam, JSON.parse(el.dataset.camera)); } catch (err) { /* 忽略非法 JSON */ }
      }
      return {
        el: el,
        id: el.dataset.slideId || 'slide-' + (i + 1),
        palette: el.dataset.palette || 'deep-space',
        camera: cam,
        dwell: num(el.dataset.dwell, state.dwell),
        tl: null,
        contentStart: 0, contentEnd: 0, revealStart: 0, nextCursor: 0
      };
    });
  }

  function init() {
    deckEl = doc.querySelector('.deck');
    stageEl = doc.querySelector('.stage');
    if (!deckEl || !stageEl) return;

    var params = new URLSearchParams(location.search);
    if (params.get('export') === '1') {
      state.particles = false;
      state.exportMode = true;
      state.mode = 'manual';
      doc.body.classList.add('is-export');
    }

    collectSlides();
    if (!slides.length) return;

    buildGrid();
    buildHelp();
    buildPanel();

    hudEl = doc.querySelector('.hud');
    progressEl = doc.querySelector('.hud__progress');
    debugEl = doc.createElement('div');
    debugEl.className = 'debug';
    debugEl.hidden = true;
    doc.body.appendChild(debugEl);

    doc.body.classList.toggle('is-reduced', state.reduced);
    refreshPalettes();
    initParallax();
    initParticles();
    bindKeys();
    buildMaster();

    state.index = 0;
    gateEnd = slides[0].contentEnd;
    refreshPalettes();
    syncAmbient();
    master.play();

    var boot = doc.querySelector('.boot');
    if (boot) {
      boot.classList.add('is-done');
      setTimeout(function () { boot.remove(); }, 700);
    }

    doc.documentElement.setAttribute('data-keynote-ready', '1');
    console.info('[Keynote] 已就绪：' + slides.length + ' 页 / 总时长 ' + totalDuration.toFixed(2) + 's');
  }

  /* ------------------------------------------------------------------ *
   * 对外 API（导出与自动化使用）
   * ------------------------------------------------------------------ */
  window.Keynote = {
    init: init,
    next: next,
    prev: prev,
    goto: goto,
    replay: replay,
    setMode: setMode,
    setPalette: function (p) { state.palette = p; refreshPalettes(); if (panelEl) { var s = panelEl.querySelector('[data-ctl="palette"]'); if (s) s.value = p; } },
    setFont: function (f) { state.font = f; root.style.setProperty('--font-stack', FONT_STACKS[f] || FONT_STACKS.system); if (panelEl) { var s = panelEl.querySelector('[data-ctl="font"]'); if (s) s.value = f; } },
    setSpeed: function (v) { state.speed = v; if (master) master.timeScale(v); if (panelEl) { var s = panelEl.querySelector('[data-ctl="speed"]'); if (s) s.value = v; var o = panelEl.querySelector('[data-out="speed"]'); if (o) o.textContent = v.toFixed(1) + '×'; } },
    setDwell: function (v) { state.dwell = v; slides.forEach(function (s) { if (!s.el.dataset.dwell) s.dwell = v; }); buildMaster(); if (panelEl) { var s2 = panelEl.querySelector('[data-ctl="dwell"]'); if (s2) s2.value = v; var o2 = panelEl.querySelector('[data-out="dwell"]'); if (o2) o2.textContent = v.toFixed(1) + 's'; } },
    seek: function (t) {
      if (!master) return 0;
      state.exportMode = true;
      master.pause();
      master.time(clamp(t, 0, totalDuration));
      var i = currentIndexByTime(master.time());
      if (i !== state.index) { state.index = i; refreshPalettes(); }
      updateHud();
      updateDebug();
      return master.time();
    },
    duration: function () { return totalDuration; },
    getState: function () {
      return {
        index: state.index, total: slides.length, time: master ? master.time() : 0,
        duration: totalDuration, mode: state.mode, speed: state.speed, dwell: state.dwell,
        slides: slides.map(function (s) {
          return { id: s.id, palette: s.palette, camera: s.camera, contentEnd: s.contentEnd, revealStart: s.revealStart, anims: s.tl ? s.tl.getChildren().length : 0 };
        })
      };
    }
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
