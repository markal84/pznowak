// Shared ring-preview geometry. compute(state) -> values bound into the SVG template.
var RING = (function () {
  var K = 0.5523;
  function ell(rx, ry) {
    return [['M', [[-rx, 0]]], ['C', [[-rx, -ry * K], [-rx * K, -ry], [0, -ry]]], ['C', [[rx * K, -ry], [rx, -ry * K], [rx, 0]]],
      ['C', [[rx, ry * K], [rx * K, ry], [0, ry]]], ['C', [[-rx * K, ry], [-rx, ry * K], [-rx, 0]]], ['Z', []]];
  }
  function poly(p) { return [['M', [p[0]]]].concat(p.slice(1).map(function (q) { return ['L', [q]]; })).concat([['Z', []]]); }
  var CUTS = {
    okragly: { label: 'Okrągły', cmds: ell(1, 1), kind: 'radial', p4: [45, 135, 225, 315] },
    owal: { label: 'Owal', cmds: ell(0.74, 1), kind: 'radial', p4: [50, 130, 230, 310] },
    markiza: { label: 'Markiza', cmds: [['M', [[0, -1]]], ['C', [[0.56, -0.55], [0.56, 0.55], [0, 1]]], ['C', [[-0.56, 0.55], [-0.56, -0.55], [0, -1]]], ['Z', []]], kind: 'radial', p4: [90, 270, 0, 180] },
    gruszka: { label: 'Gruszka', cmds: [['M', [[0, -1]]], ['C', [[0.35, -0.6], [0.76, -0.12], [0.76, 0.32]]], ['C', [[0.76, 0.74], [0.42, 1], [0, 1]]], ['C', [[-0.42, 1], [-0.76, 0.74], [-0.76, 0.32]]], ['C', [[-0.76, -0.12], [-0.35, -0.6], [0, -1]]], ['Z', []]], kind: 'radial', p4: [270, 20, 160, 90] },
    szmaragdowy: { label: 'Szmaragdowy', cmds: poly([[-0.5, -1], [0.5, -1], [0.72, -0.78], [0.72, 0.78], [0.5, 1], [-0.5, 1], [-0.72, 0.78], [-0.72, -0.78]]), kind: 'step', p4: [55, 125, 235, 305] },
    poduszka: { label: 'Poduszka', cmds: [['M', [[-0.5, -0.9]]], ['C', [[-0.17, -0.95], [0.17, -0.95], [0.5, -0.9]]], ['C', [[0.82, -0.86], [0.86, -0.82], [0.9, -0.5]]], ['C', [[0.95, -0.17], [0.95, 0.17], [0.9, 0.5]]], ['C', [[0.86, 0.82], [0.82, 0.86], [0.5, 0.9]]], ['C', [[0.17, 0.95], [-0.17, 0.95], [-0.5, 0.9]]], ['C', [[-0.82, 0.86], [-0.86, 0.82], [-0.9, 0.5]]], ['C', [[-0.95, 0.17], [-0.95, -0.17], [-0.9, -0.5]]], ['C', [[-0.86, -0.82], [-0.82, -0.86], [-0.5, -0.9]]], ['Z', []]], kind: 'radial', p4: [45, 135, 225, 315] },
    princessa: { label: 'Princessa', cmds: poly([[-0.86, -0.86], [0.86, -0.86], [0.86, 0.86], [-0.86, 0.86]]), kind: 'princess', p4: [45, 135, 225, 315] },
    serce: { label: 'Serce', cmds: [['M', [[0, 0.92]]], ['C', [[-0.38, 0.62], [-0.98, 0.22], [-0.98, -0.3]]], ['C', [[-0.98, -0.74], [-0.5, -0.98], [0, -0.56]]], ['C', [[0.5, -0.98], [0.98, -0.74], [0.98, -0.3]]], ['C', [[0.98, 0.22], [0.38, 0.62], [0, 0.92]]], ['Z', []]], kind: 'radial', p4: [90, 270, 200, 340] }
  };
  var GEMS = {
    diament: { label: 'Diament', c: ['#FFFFFF', '#D9E2EA', '#8D9DAC'] },
    szafir: { label: 'Szafir', c: ['#7F9CEB', '#26449E', '#0E1C52'] },
    szmaragd: { label: 'Szmaragd', c: ['#86D8AC', '#1E7A4E', '#0A3A24'] },
    rubin: { label: 'Rubin', c: ['#F58A9C', '#B3173C', '#550616'] },
    tanzanit: { label: 'Tanzanit', c: ['#B0A2F2', '#5B47B8', '#2A1C6A'] },
    morganit: { label: 'Morganit', c: ['#FCE3DC', '#E7A9A2', '#B06D6B'] },
    topaz: { label: 'Topaz niebieski', c: ['#B4E7F5', '#3C9CC4', '#195674'] },
    wlasny: { label: 'Mój kamień', c: ['#E9E7E1', '#A9A69E', '#5E5B55'] }
  };
  var METALS = {
    au: ['#6E5018', '#E6C97E', '#B38B3E', '#F5E4B0', '#86621F'],
    ag: ['#74787C', '#F1F1EE', '#AEB1B4', '#FBFBF9', '#83878B']
  };
  var CX = 200, CY = 242, R = 116, SY = 100, S = 46;
  function f(n) { return Math.round(n * 10) / 10; }
  function abs(cmds, s, cx, cy) {
    return cmds.map(function (c) { return c[0] + c[1].map(function (p) { return f(cx + p[0] * s) + ' ' + f(cy + p[1] * s); }).join(' '); }).join(' ');
  }
  function sample(cmds) {
    var pts = [], cur = null;
    cmds.forEach(function (c) {
      var t = c[0], p = c[1];
      if (t === 'M') { cur = p[0]; pts.push(cur); }
      else if (t === 'L') { for (var i = 1; i <= 16; i++) { var u = i / 16; pts.push([cur[0] + (p[0][0] - cur[0]) * u, cur[1] + (p[0][1] - cur[1]) * u]); } cur = p[0]; }
      else if (t === 'C') {
        for (var j = 1; j <= 24; j++) {
          var v = j / 24, a = Math.pow(1 - v, 3), b = 3 * Math.pow(1 - v, 2) * v, d = 3 * (1 - v) * v * v, e = v * v * v;
          pts.push([a * cur[0] + b * p[0][0] + d * p[1][0] + e * p[2][0], a * cur[1] + b * p[0][1] + d * p[1][1] + e * p[2][1]]);
        }
        cur = p[2];
      }
    });
    return pts;
  }
  function atAngle(pts, deg) {
    var target = deg * Math.PI / 180, best = pts[0], bd = 9;
    pts.forEach(function (p) {
      var a = Math.atan2(p[1], p[0]), d = Math.abs(Math.atan2(Math.sin(a - target), Math.cos(a - target)));
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }
  function evenly(pts, spacing, scale) {
    var out = [], acc = 0, prev = pts[0];
    out.push(prev);
    for (var i = 1; i < pts.length; i++) {
      var p = pts[i], dx = (p[0] - prev[0]) * scale, dy = (p[1] - prev[1]) * scale;
      acc += Math.sqrt(dx * dx + dy * dy);
      if (acc >= spacing) { out.push(p); acc = 0; }
      prev = p;
    }
    var first = out[0], last = out[out.length - 1];
    if (out.length > 2 && Math.hypot((last[0] - first[0]) * scale, (last[1] - first[1]) * scale) < spacing * 0.75) out.pop();
    return out;
  }
  function circles(list, r) {
    return list.map(function (p) { return 'M' + f(p[0] - r) + ' ' + f(p[1]) + ' a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0'; }).join(' ');
  }
  function facetLines(cmds, kind, s, cx, cy) {
    if (kind === 'radial') {
      var l = [];
      for (var i = 0; i < 8; i++) {
        var a = Math.PI / 8 + i * Math.PI / 4;
        l.push('M' + f(cx + Math.cos(a) * s * 0.35) + ' ' + f(cy + Math.sin(a) * s * 0.35) + ' L' + f(cx + Math.cos(a) * s * 1.6) + ' ' + f(cy + Math.sin(a) * s * 1.6));
      }
      return l.join(' ');
    }
    var vs = cmds.filter(function (c) { return c[1].length; }).map(function (c) { return c[1][c[1].length - 1]; });
    var out = vs.map(function (p) { return 'M' + f(cx + p[0] * s) + ' ' + f(cy + p[1] * s) + ' L' + f(cx + p[0] * s * 0.5) + ' ' + f(cy + p[1] * s * 0.5); }).join(' ');
    out += ' ' + abs(cmds, s * 0.75, cx, cy);
    if (kind === 'princess') {
      var q = s * 0.43;
      out += ' M' + f(cx - q) + ' ' + f(cy - q) + ' L' + f(cx + q) + ' ' + f(cy + q) + ' M' + f(cx + q) + ' ' + f(cy - q) + ' L' + f(cx - q) + ' ' + f(cy + q);
    }
    return out;
  }
  function compute(st) {
    var cut = CUTS[st.cut], gem = GEMS[st.gem];
    var th = { cienka: 10, klasyczna: 14, szeroka: 19 }[st.width];
    var r = R - th;
    var bandPath = 'M' + (CX - R) + ' ' + CY + ' a' + R + ' ' + R + ' 0 1 0 ' + 2 * R + ' 0 a' + R + ' ' + R + ' 0 1 0 ' + -2 * R + ' 0 Z M' + (CX - r) + ' ' + CY + ' a' + r + ' ' + r + ' 0 1 1 ' + 2 * r + ' 0 a' + r + ' ' + r + ' 0 1 1 ' + -2 * r + ' 0 Z';
    var hlR = R - th * 0.35;
    var a1 = 205 * Math.PI / 180, a2 = 245 * Math.PI / 180;
    var highlight = 'M' + f(CX + Math.cos(a1) * hlR) + ' ' + f(CY + Math.sin(a1) * hlR) + ' A' + hlR + ' ' + hlR + ' 0 0 1 ' + f(CX + Math.cos(a2) * hlR) + ' ' + f(CY + Math.sin(a2) * hlR);
    var pts = sample(cut.cmds);
    var setting = st.setting;
    var stoneScale = setting === 'trylogia' ? S * 0.86 : S;
    var prongAngles = setting === 'lapki-6' ? [30, 90, 150, 210, 270, 330] : cut.p4;
    var showProngs = setting !== 'kaszta';
    var prongs = showProngs ? prongAngles.map(function (d) { var p = atAngle(pts, d); return [CX + p[0] * stoneScale * 1.02, SY + p[1] * stoneScale * 1.02]; }) : [];
    var haloScale = stoneScale * 1.36;
    var haloDots = setting === 'halo' ? evenly(pts, 13, haloScale).map(function (p) { return [CX + p[0] * haloScale, SY + p[1] * haloScale]; }) : [];
    var trio = setting === 'trylogia';
    var side = [[CX - 66, 143], [CX + 66, 143]];
    var round = ell(1, 1);
    var sideS = 23;
    var pave = [];
    if (st.pave === 'tak') {
      var pr = R - th / 2;
      for (var deg = 198; deg <= 342; deg += 5.5) {
        if (deg > 236 && deg < 304) continue;
        var ar = deg * Math.PI / 180;
        pave.push([CX + Math.cos(ar) * pr, CY + Math.sin(ar) * pr]);
      }
    }
    var band = st.metal === 'ag' ? 'ag' : 'au';
    var head = st.metal === 'au' ? 'au' : 'ag';
    return {
      bandPath: bandPath,
      innerRing: 'M' + (CX - r) + ' ' + CY + ' a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0 a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0',
      highlight: highlight,
      bandFill: 'url(#k-' + band + ')',
      headFill: 'url(#k-' + head + ')',
      gemPath: abs(cut.cmds, stoneScale, CX, SY),
      gemTable: abs(cut.cmds, stoneScale * 0.5, CX, SY),
      gemLines: facetLines(cut.cmds, cut.kind, stoneScale, CX, SY),
      glint: 'M' + f(CX - stoneScale * 0.42) + ' ' + f(SY - stoneScale * 0.3) + ' l' + f(stoneScale * 0.16) + ' ' + f(-stoneScale * 0.16) + ' l' + f(stoneScale * 0.07) + ' ' + f(stoneScale * 0.07) + ' Z',
      g1: gem.c[0], g2: gem.c[1], g3: gem.c[2],
      prongPath: circles(prongs, setting === 'lapki-6' ? 5.2 : 6),
      prongDisplay: showProngs ? 'inline' : 'none',
      bezelPath: abs(cut.cmds, stoneScale * 1.17, CX, SY),
      bezelDisplay: setting === 'kaszta' ? 'inline' : 'none',
      haloMetal: abs(cut.cmds, haloScale, CX, SY),
      haloDots: circles(haloDots, 4.6),
      haloDisplay: setting === 'halo' ? 'inline' : 'none',
      sidePath: trio ? side.map(function (c) { return abs(round, sideS, c[0], c[1]); }).join(' ') : '',
      sideTable: trio ? side.map(function (c) { return abs(round, sideS * 0.5, c[0], c[1]); }).join(' ') : '',
      sideLines: trio ? side.map(function (c) { return facetLines(round, 'radial', sideS, c[0], c[1]); }).join(' ') : '',
      sideProngs: trio ? circles([].concat.apply([], side.map(function (c) { return [45, 135, 225, 315].map(function (d) { var a = d * Math.PI / 180; return [c[0] + Math.cos(a) * sideS, c[1] + Math.sin(a) * sideS]; }); })), 3.8) : '',
      trioDisplay: trio ? 'inline' : 'none',
      pavePath: circles(pave, Math.max(2.4, th * 0.2)),
      paveDisplay: pave.length ? 'inline' : 'none',
      gemStroke: gem.c[2]
    };
  }
  return { compute: compute, CUTS: CUTS, GEMS: GEMS, METALS: METALS };
})();
