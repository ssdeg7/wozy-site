/* Animal Loop dev diary — scroll progress racer + animated diagrams.
   Vanilla port of the original design's MechLoops / AdjustDemo components. */
(function () {
  'use strict';

  // ---------- tiny string hyperscript (mirrors React.createElement usage) ----------
  var UNITLESS = { fontWeight: 1, opacity: 1, lineHeight: 1, zIndex: 1, flex: 1, flexGrow: 1, flexShrink: 1, order: 1 };
  var SVG_TAGS = { svg: 1, g: 1, circle: 1, ellipse: 1, rect: 1, line: 1, polyline: 1, path: 1, text: 1 };
  function kebab(s) { return s.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function styleStr(o) {
    var out = [];
    for (var k in o) {
      if (o[k] == null) continue;
      var v = o[k];
      if (typeof v === 'number' && !UNITLESS[k]) v = v + 'px';
      out.push(kebab(k) + ':' + v);
    }
    return out.join(';');
  }
  function flat(arr, out) {
    for (var i = 0; i < arr.length; i++) {
      var c = arr[i];
      if (c == null || c === false) continue;
      if (Array.isArray(c)) flat(c, out); else out.push(c);
    }
    return out;
  }
  function h(tag, props) {
    var kids = flat(Array.prototype.slice.call(arguments, 2), []);
    var isSvg = SVG_TAGS[tag];
    var attrs = '';
    if (props) {
      for (var k in props) {
        if (k === 'key' || props[k] == null) continue;
        var v = props[k];
        if (k === 'style') { attrs += ' style="' + esc(styleStr(v)) + '"'; continue; }
        var name = k;
        if (isSvg && k !== 'viewBox' && k.indexOf('-') < 0) name = kebab(k);
        attrs += ' ' + name + '="' + esc(v) + '"';
      }
    }
    var inner = kids.map(function (c) { return typeof c === 'string' || typeof c === 'number' ? esc(c) : c.__html; }).join('');
    return { __html: '<' + tag + attrs + '>' + inner + '</' + tag + '>' };
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ANIMATE = !reduceMotion;

  // ---------- MechLoops ----------
  function mechLoops(t) {
    var mono = "'IBM Plex Mono', monospace";
    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
    var ball = function (x, y, op) {
      return h('g', { opacity: op == null ? 1 : op },
        h('ellipse', { cx: x + 1.2, cy: y + 1.8, rx: 4.6, ry: 3.6, fill: '#000', opacity: 0.22 }),
        h('circle', { cx: x, cy: y, r: 4.6, fill: '#E7C79A', stroke: '#8A6A44', strokeWidth: 0.9 }),
        h('circle', { cx: x, cy: y + 0.6, r: 2.6, fill: '#F7EAD3' }),
        h('circle', { cx: x - 1.6, cy: y - 1.8, r: 1.1, fill: '#fff', opacity: 0.8 })
      );
    };
    var chip = function (x, y, w, label, bg, fg) {
      return h('g', null,
        h('rect', { x: x, y: y, width: w, height: 9, rx: 4.5, fill: bg }),
        h('text', { x: x + w / 2, y: y + 6.4, textAnchor: 'middle', fontFamily: 'Nunito Sans, sans-serif', fontWeight: 900, fontSize: 5, fill: fg }, label)
      );
    };
    var svg = function (bg, label) {
      var kids = Array.prototype.slice.call(arguments, 2);
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, width: 'calc((100% - 64px) / 5)', minWidth: 150, maxWidth: 200 } },
        h('div', { style: { aspectRatio: '1', borderRadius: 20, overflow: 'hidden', background: bg } },
          h.apply(null, ['svg', { viewBox: '0 0 100 100', style: { width: '100%', height: '100%', display: 'block' }, role: 'img', 'aria-label': label }].concat(kids))),
        h('div', { style: { fontFamily: mono, fontSize: 13, color: '#6B6180', textAlign: 'center' } }, label)
      );
    };

    // 1 · Fern Hollow: each tap is one heading change
    var seg = 0.42, N = 15, R = 30, T1 = t % (seg * N);
    var k = Math.floor(T1 / seg), f = (T1 % seg) / seg, age = f * seg;
    var V = function (i) { var a = (-90 + i * 24) * Math.PI / 180; return [50 + R * Math.cos(a), 50 + R * Math.sin(a)]; };
    var A = V(k), B = V(k + 1);
    var bx = A[0] + (B[0] - A[0]) * f, by = A[1] + (B[1] - A[1]) * f;
    var trail = [V(k - 3), V(k - 2), V(k - 1), A, [bx, by]].map(function (q) { return q[0].toFixed(2) + ',' + q[1].toFixed(2); }).join(' ');
    var p1 = svg('#5DA83B', 'Each tap turns the ball',
      h('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: '#5A3A1E', strokeWidth: 20 }),
      h('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: '#EBD3A4', strokeWidth: 20, strokeDasharray: '3.2 3.2' }),
      h('circle', { cx: 50, cy: 50, r: R, fill: 'none', stroke: '#CFA46A', strokeWidth: 17 }),
      h('circle', { cx: 50, cy: 50, r: 13, fill: '#4E9A33' }),
      h('polyline', { points: trail, fill: 'none', stroke: '#FFF4DC', strokeWidth: 0.9, strokeDasharray: '1.2 1.4', opacity: 0.85 }),
      h('circle', { cx: A[0], cy: A[1], r: 3 + age * 32, fill: 'none', stroke: '#FFF4DC', strokeWidth: 1.1, opacity: clamp(1 - age / 0.32) }),
      ball(bx, by),
      age < 0.2 ? chip(76, 6, 18, 'TAP', '#EDA11F', '#2B1F4D') : null
    );

    // 2 · Coral Shallows: the lower arm runs under the bridge
    var q2 = (t % 2.6) / 2.6;
    var cx2 = -12 + 124 * q2, cy2 = 96 - 92 * q2;
    var p2 = svg('#39B8BE', 'Crossing under a bridge',
      h('line', { x1: -12, y1: 96, x2: 112, y2: 4, stroke: '#C94F68', strokeWidth: 21 }),
      h('line', { x1: -12, y1: 96, x2: 112, y2: 4, stroke: '#F3B2BE', strokeWidth: 21, strokeDasharray: '3 3' }),
      h('line', { x1: -12, y1: 96, x2: 112, y2: 4, stroke: '#D9BE8E', strokeWidth: 18 }),
      ball(cx2, cy2),
      h('line', { x1: -12, y1: 6, x2: 112, y2: 98, stroke: '#0F3F45', strokeWidth: 26, opacity: 0.3, transform: 'translate(2 3)' }),
      h('line', { x1: -12, y1: 6, x2: 112, y2: 98, stroke: '#8E3448', strokeWidth: 22.5 }),
      h('line', { x1: -12, y1: 6, x2: 112, y2: 98, stroke: '#F3B2BE', strokeWidth: 22.5, strokeDasharray: '3 3', opacity: 0.6 }),
      h('line', { x1: -12, y1: 6, x2: 112, y2: 98, stroke: '#E6D0A4', strokeWidth: 18 }),
      h('line', { x1: -12, y1: 6, x2: 112, y2: 98, stroke: '#FFF4DC', strokeWidth: 0.5, strokeDasharray: '1.5 2', opacity: 0.7 })
    );

    // 3 · Dune Flats: switch gate flips which way a tap turns
    var x3 = -8 + 116 * ((t % 3) / 3);
    var flip = clamp((x3 - 46) / 8), sy = 1 - 2 * flip, isCW = sy < 0;
    var gateCol = isCW ? '#FCA480' : '#70CBFE';
    var chev = function (y) { return h('polyline', { points: '-3.6,1.8 0,-1.8 3.6,1.8', fill: 'none', stroke: gateCol, strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', transform: 'translate(50 ' + y + ') scale(1 ' + sy.toFixed(3) + ')' }); };
    var p3 = svg('#EBC891', 'A switch gate flipping the arrows',
      h('rect', { x: -2, y: 29, width: 104, height: 42, fill: '#7A4524' }),
      h('line', { x1: -2, y1: 30.4, x2: 102, y2: 30.4, stroke: '#F4E2BE', strokeWidth: 2.4, strokeDasharray: '3 3' }),
      h('line', { x1: -2, y1: 69.6, x2: 102, y2: 69.6, stroke: '#F4E2BE', strokeWidth: 2.4, strokeDasharray: '3 3' }),
      h('rect', { x: -2, y: 32, width: 104, height: 36, fill: '#C68B57' }),
      h('line', { x1: -2, y1: 50, x2: 102, y2: 50, stroke: '#F4E2BE', strokeWidth: 0.5, strokeDasharray: '1.5 2', opacity: 0.6 }),
      chev(38), chev(44), chev(56), chev(62),
      ball(x3, 50),
      chip(31, 10, 38, isCW ? 'TAP TURNS ↻' : 'TAP TURNS ↺', gateCol, '#2B1F4D')
    );

    // 4 · Mud: slower while the ball is in it
    var vOut = 46, vIn = 17, m0 = 36, m1 = 64;
    var tA = (m0 + 8) / vOut, tB = (m1 - m0) / vIn, tC = (108 - m1) / vOut, loopT = tA + tB + tC + 0.4;
    var T4 = t % loopT;
    var x4 = T4 < tA ? -8 + vOut * T4 : T4 < tA + tB ? m0 + vIn * (T4 - tA) : Math.min(108, m1 + vOut * (T4 - tA - tB));
    var inMud = x4 > m0 + 2 && x4 < m1 - 2;
    var splats = [];
    for (var i = 0; i * 0.07 < tB; i++) {
      var ts = tA + i * 0.07, a = T4 - ts;
      if (a < 0 || a > 0.8) continue;
      var sx = m0 + vIn * (i * 0.07), side = i % 2 ? 1 : -1, d = 3.5 + ((i * 37) % 5);
      splats.push(h('circle', { cx: sx - (2 + ((i * 13) % 4)) - a * 6, cy: 50 + side * d * (1 + a * 1.6), r: 1.4 * (1 - a / 0.8) + 0.3, fill: '#5B3519', opacity: 1 - a / 0.8 }));
    }
    var marks = [];
    if (x4 > m1) for (var mx = m1; mx < x4 - 5 && mx < m1 + 26; mx += 3.4) marks.push(h('circle', { cx: mx, cy: 50 + ((mx * 7) % 3 - 1), r: 0.9, fill: '#5B3519', opacity: 0.6 * (1 - (mx - m1) / 26) }));
    var pct = inMud ? 37 : 100;
    var p4 = svg('#E3B97E', 'Rolling through mud',
      h('rect', { x: -2, y: 29, width: 104, height: 42, fill: '#7A4524' }),
      h('line', { x1: -2, y1: 30.4, x2: 102, y2: 30.4, stroke: '#F4E2BE', strokeWidth: 2.4, strokeDasharray: '3 3' }),
      h('line', { x1: -2, y1: 69.6, x2: 102, y2: 69.6, stroke: '#F4E2BE', strokeWidth: 2.4, strokeDasharray: '3 3' }),
      h('rect', { x: -2, y: 32, width: 104, height: 36, fill: '#C68B57' }),
      h('path', { d: 'M34 41 C38 34 50 36 56 35 C63 34 68 40 67 47 C66 54 69 60 62 64 C55 68 44 65 38 63 C31 60 30 48 34 41Z', fill: '#9A7046' }),
      h('path', { d: 'M36.5 42 C40 37 50 38.5 55.5 37.5 C62 36.5 65.5 41 64.8 47 C64 53 66.5 58.5 60.5 61.5 C54 64.5 45 62.5 39.5 61 C33.5 58.5 33 48.5 36.5 42Z', fill: '#5B3519' }),
      h('ellipse', { cx: 44, cy: 54, rx: 3.2, ry: 1.8, fill: '#40230D' }),
      h('ellipse', { cx: 57, cy: 45, rx: 2.6, ry: 1.4, fill: '#40230D' }),
      h('ellipse', { cx: 48, cy: 42.5, rx: 3.4, ry: 0.9, fill: '#F6E2BB', opacity: 0.45 }),
      marks, splats,
      ball(x4, 50),
      chip(32, 10, 36, 'SPEED ' + pct + '%', inMud ? '#5B3519' : '#FFF4DC', inMud ? '#F6E2BB' : '#2B1F4D')
    );

    // 5 · Fern Hollow: hit the mole, it digs a tunnel, the ball drops in and pops out past the bend
    var v5 = 46, hx = 40, yTop = 30, yBot = 72;
    var tHit = (hx - 7 + 8) / v5, tDig = tHit + 0.6, tIn = tHit + 7 / v5, tUnder = tIn + 0.3, tPop = tUnder + 0.6, tOut = tPop + 0.35;
    var tEnd = tOut + (hx + 8) / v5, loop5 = tEnd + 0.5;
    var T5 = t % loop5;
    var lerp = function (a, b, x) { return a + (b - a) * clamp(x); };
    var hole = function (x, y) { return h('g', null, h('ellipse', { cx: x, cy: y + 0.6, rx: 6.4, ry: 4, fill: '#7A5230' }), h('ellipse', { cx: x, cy: y, rx: 5.2, ry: 3.2, fill: '#2A170A' })); };
    var hill = function (x, y) { return h('g', null, h('ellipse', { cx: x, cy: y + 0.8, rx: 6.2, ry: 3.6, fill: '#000', opacity: 0.18 }), h('ellipse', { cx: x, cy: y, rx: 5.8, ry: 3.6, fill: '#8A5E36' }), h('ellipse', { cx: x - 1.2, cy: y - 1, rx: 2.6, ry: 1.2, fill: '#B07F4E' })); };
    var mole = function (x, y, op) {
      return h('g', { opacity: op },
        h('circle', { cx: x, cy: y - 2, r: 4.6, fill: '#5E4436' }),
        h('ellipse', { cx: x, cy: y - 0.6, rx: 2.4, ry: 1.7, fill: '#C9A48C' }),
        h('circle', { cx: x, cy: y - 1.2, r: 0.9, fill: '#E58C98' }),
        h('circle', { cx: x - 1.7, cy: y - 3.4, r: 0.6, fill: '#1A0F08' }),
        h('circle', { cx: x + 1.7, cy: y - 3.4, r: 0.6, fill: '#1A0F08' }),
        h('ellipse', { cx: x - 3.4, cy: y + 0.6, rx: 1.6, ry: 1, fill: '#E9C6B0' }),
        h('ellipse', { cx: x + 3.4, cy: y + 0.6, rx: 1.6, ry: 1, fill: '#E9C6B0' }));
    };
    var clods = function (yTo) {
      var out = [];
      for (var cy = yTop + 6; cy < yTo - 2; cy += 4) out.push(h('circle', { cx: hx + ((cy * 7) % 3 - 1) * 0.8, cy: cy, r: 1.3, fill: '#6B4423', opacity: 0.85 }));
      return out;
    };
    var trackPath = 'M -10 ' + yTop + ' H 70 A 21 21 0 0 1 70 ' + yBot + ' H -10';
    var entry, exit, moleEl = null, digTrail = null, ballEl = null, bump = null, chip5 = null;
    if (T5 < tHit) {
      entry = hole(hx, yTop); exit = hill(hx, yBot);
      moleEl = mole(hx, yTop, 1);
      ballEl = ball(-8 + v5 * T5, yTop);
      chip5 = chip(28, 4, 44, 'HIT THE MOLE', '#FFF4DC', '#2B1F4D');
    } else if (T5 < tUnder) {
      var dig = clamp((T5 - tHit) / (tDig - tHit));
      entry = hole(hx, yTop); exit = dig >= 1 ? hole(hx, yBot) : hill(hx, yBot);
      digTrail = clods(lerp(yTop, yBot, dig));
      if (dig < 1) moleEl = h('circle', { cx: hx, cy: lerp(yTop, yBot, dig), r: 2.8, fill: '#8A5E36', stroke: '#5B3519', strokeWidth: 0.6 });
      if (T5 < tIn) ballEl = ball(hx - 7 + v5 * (T5 - tHit), yTop);
      else { var s = 1 - clamp((T5 - tIn) / (tUnder - tIn)); ballEl = h('g', { transform: 'translate(' + hx + ' ' + yTop + ') scale(' + s.toFixed(3) + ') translate(' + (-hx) + ' ' + (-yTop) + ')' }, ball(hx, yTop, s)); }
      chip5 = chip(36, 4, 28, 'BONK!', '#EDA11F', '#2B1F4D');
    } else if (T5 < tPop) {
      var u5 = (T5 - tUnder) / (tPop - tUnder);
      entry = hill(hx, yTop); exit = hole(hx, yBot);
      digTrail = clods(yBot);
      bump = h('ellipse', { cx: hx, cy: lerp(yTop + 4, yBot - 4, u5), rx: 4.2, ry: 3, fill: '#9A6B3E', stroke: '#5B3519', strokeWidth: 0.6 });
      chip5 = chip(32, 4, 36, 'SHORTCUT!', '#5B3519', '#F6E2BB');
    } else {
      entry = hill(hx, yTop);
      exit = T5 < tOut + 0.4 ? hole(hx, yBot) : hill(hx, yBot);
      if (T5 < tOut) { var g = clamp((T5 - tPop) / (tOut - tPop)); ballEl = h('g', { transform: 'translate(' + hx + ' ' + yBot + ') scale(' + g.toFixed(3) + ') translate(' + (-hx) + ' ' + (-yBot) + ')' }, ball(hx, yBot, g)); }
      else ballEl = ball(hx - v5 * (T5 - tOut), yBot);
    }
    var p5 = svg('#5DA83B', 'A mole digging a shortcut',
      h('path', { d: trackPath, fill: 'none', stroke: '#5A3A1E', strokeWidth: 20 }),
      h('path', { d: trackPath, fill: 'none', stroke: '#EBD3A4', strokeWidth: 20, strokeDasharray: '3.2 3.2' }),
      h('path', { d: trackPath, fill: 'none', stroke: '#CFA46A', strokeWidth: 17 }),
      digTrail, entry, exit, bump, moleEl, ballEl, chip5
    );

    return h('div', { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16 } }, p1, p2, p3, p4, p5).__html;
  }

  // ---------- AdjustDemo ----------
  var ADJ_PATH = 'M48.6 75.3 L52.3 72.0 L54.8 67.6 L56.1 62.7 L56.3 57.9 L55.4 53.1 L53.3 48.7 L50.1 45.0 L45.8 42.1 L40.9 40.1 L35.7 39.2 L30.5 39.3 L25.5 40.7 L21.0 43.2 L17.3 46.8 L14.7 51.2 L13.2 56.1 L12.7 61.3 L12.9 66.6 L14.1 71.7 L16.5 76.3 L19.8 80.4 L24.0 83.7 L28.6 86.5 L33.6 88.4 L38.8 89.7 L44.3 90.2 L49.9 90.3 L55.4 90.1 L60.9 89.3 L66.1 87.9 L70.9 85.6 L75.2 82.5 L78.9 78.6 L81.8 74.1 L83.9 69.1 L85.5 63.9 L86.6 58.5 L87.2 53.1 L87.3 47.7 L86.8 42.3 L85.5 37.0 L83.5 32.1 L80.8 27.4 L77.5 23.2 L73.5 19.5 L69.1 16.2 L64.4 13.4 L59.6 11.2 L54.5 9.9 L49.4 9.9 L44.5 11.4 L40.3 14.5 L36.7 18.5 L33.8 23.2 L31.7 28.2 L30.2 33.5 L29.3 38.9 L28.7 44.4 L28.4 49.9 L28.3 55.4 L28.8 60.8 L30.2 65.8 L32.6 70.2 L36.3 73.6 L41.6 75.9 L47.3 75.9Z';
  function adjustDemo(t) {
    var ease = function (x) { return x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3); };
    var a = ease(t / 1.2);
    var lo = 160 + (195 - 160) * a, hi = 285 + (235 - 285) * a;
    var u = Math.max(0, t - 1.4);
    var scale = t < 1.4 ? 0.74 : 1 + (0.74 - 1) * Math.exp(-u * 1.05) * Math.cos(u * 3.1);
    var rating = Math.round(214 - (scale - 1) * 210);
    var within = t > 3.4 && rating >= lo && rating <= hi;
    var pct = function (v) { return ((v - 150) / 135) * 100 + '%'; };
    var mono = "'IBM Plex Mono', monospace";
    var tf = 'translate(50 50) scale(' + scale.toFixed(4) + ') translate(-50 -50)';
    var thumb = function (v) { return h('div', { style: { position: 'absolute', left: pct(v), top: 10, width: 24, height: 24, marginLeft: -12, borderRadius: 12, background: '#FFFDF6', boxShadow: '0 0 0 3px #2B1F4D, 0 3px 0 3px rgba(43,31,77,0.25)' } }); };

    return h('div', { style: { background: '#F3E8CC', borderRadius: 28, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 } },
      h('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 } },
        h('div', { style: { fontFamily: mono, fontSize: 12, fontWeight: 600, letterSpacing: 2, color: '#6B6180' } }, 'ADJUST · TARGET BAND ' + Math.round(lo) + '–' + Math.round(hi) + 'cc'),
        h('div', { style: { fontSize: 14, fontWeight: 900, padding: '6px 14px', borderRadius: 16, background: within ? '#3F7A2E' : 'rgba(43,31,77,0.1)', color: within ? '#F7EDD1' : '#2B1F4D', transition: 'background .25s, color .25s' } }, within ? '✓ Within band' : 'Searching…')
      ),
      h('div', { style: { position: 'relative', height: 64, margin: '0 14px' } },
        h('div', { style: { position: 'absolute', left: 0, right: 0, top: 19, height: 6, borderRadius: 3, background: 'rgba(43,31,77,0.14)' } }),
        h('div', { style: { position: 'absolute', left: pct(lo), width: 'calc(' + pct(hi) + ' - ' + pct(lo) + ')', top: 17, height: 10, borderRadius: 5, background: '#EDA11F' } }),
        thumb(lo), thumb(hi),
        h('div', { style: { position: 'absolute', left: pct(Math.max(150, Math.min(285, rating))), top: 40, transform: 'translateX(-50%)', fontFamily: mono, fontSize: 12, fontWeight: 600, color: '#F7EDD1', background: within ? '#3F7A2E' : '#8C3D47', padding: '2px 8px', borderRadius: 8, whiteSpace: 'nowrap' } }, rating + 'cc'),
        h('div', { style: { position: 'absolute', left: 0, top: -6, fontFamily: mono, fontSize: 11, color: '#6B6180' } }, '150cc'),
        h('div', { style: { position: 'absolute', right: 0, top: -6, fontFamily: mono, fontSize: 11, color: '#6B6180' } }, '285cc')
      ),
      h('div', { style: { borderRadius: 20, overflow: 'hidden', background: '#39B8BE', aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
        h('svg', { viewBox: '0 0 100 100', style: { height: '100%', display: 'block' }, role: 'img', 'aria-label': 'Track outline scaling until its rating lands inside the target band' },
          h('g', { transform: tf },
            h('path', { d: ADJ_PATH, fill: 'none', stroke: '#C94F68', strokeWidth: 9, strokeLinejoin: 'round' }),
            h('path', { d: ADJ_PATH, fill: 'none', stroke: '#F3B2BE', strokeWidth: 9, strokeLinejoin: 'round', strokeDasharray: '2.4 2.4' }),
            h('path', { d: ADJ_PATH, fill: 'none', stroke: '#D9BE8E', strokeWidth: 7.3, strokeLinejoin: 'round' })
          )
        )
      ),
      h('div', { style: { fontFamily: mono, fontSize: 13, color: '#6B6180', textAlign: 'center' } }, 'Sandbar Loop, rescaling until it lands in the band.')
    ).__html;
  }

  // ---------- mount + animate only while visible ----------
  function mount(el, render, staticT, period) {
    if (!el) return;
    var visible = false, raf = null, start = performance.now();
    el.innerHTML = render(staticT);
    if (!ANIMATE) return;
    var loop = function (now) {
      var t = (now - start) / 1000;
      el.innerHTML = render(period ? t % period : t);
      raf = visible ? requestAnimationFrame(loop) : null;
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(loop);
      }, { rootMargin: '100px' }).observe(el);
    } else { visible = true; raf = requestAnimationFrame(loop); }
  }
  mount(document.getElementById('mech-loops'), mechLoops, 1.7, 0);
  mount(document.getElementById('adjust-demo'), adjustDemo, 6, 8);

  // ---------- reading-progress racer in the nav ----------
  var ball = document.getElementById('progress-ball'), fill = document.getElementById('progress-fill'), pending = null;
  function onScroll() {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = null;
      var el = document.scrollingElement || document.documentElement;
      var max = el.scrollHeight - el.clientHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      if (ball) {
        ball.style.left = 'calc(24px + (100% - 68px) * ' + p.toFixed(4) + ')';
        ball.style.transform = 'rotate(' + Math.round(p * 1440) + 'deg)';
      }
      if (fill) fill.style.width = 'calc((100% - 68px) * ' + p.toFixed(4) + ')';
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
