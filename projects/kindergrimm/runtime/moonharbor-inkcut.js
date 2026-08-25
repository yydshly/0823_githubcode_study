import * as THREE from 'three';
import { makePart, U } from '../upstream/src/part.js';
import { makeRng, hashStr } from '../upstream/src/rng.js';
import { visualRecordFingerprint } from './contracts.js';

export const MOONHARBOR_INKCUT_RENDERER_ID = 'moonharbor-inkcut-2d';
export const MOONHARBOR_INKCUT_MEDIA_ID = 'moonharbor-inkcut';

export const MOONHARBOR_INKCUT_FEATURES = Object.freeze([
  'ink-shadow',
  'ink-coat-body',
  'ink-shoulder-cape',
  'ink-sash',
  'ink-collar',
  'ink-arms',
  'ink-boots',
  'ink-paper-rays',
  'ink-mask-head',
  'ink-ear-fins',
  'ink-hair-tabs',
  'ink-harbor-cap',
  'ink-eyes',
  'ink-brows',
  'ink-nose',
  'ink-mouth',
  'ink-cheek-marks',
  'ink-compass',
  'ink-signal-lamp'
]);

export const MOONHARBOR_INKCUT_COVERAGE = Object.freeze({
  head: Object.freeze(['ink-paper-rays', 'ink-mask-head', 'ink-ear-fins', 'ink-hair-tabs', 'ink-harbor-cap']),
  face: Object.freeze(['ink-eyes', 'ink-brows', 'ink-nose', 'ink-mouth', 'ink-cheek-marks']),
  body: Object.freeze(['ink-shadow', 'ink-coat-body']),
  limbs: Object.freeze(['ink-arms', 'ink-boots']),
  clothing: Object.freeze(['ink-shoulder-cape', 'ink-sash', 'ink-collar']),
  prop: Object.freeze(['ink-compass', 'ink-signal-lamp'])
});

const INK_STATES = Object.freeze({
  eyes: Object.freeze(['open', 'closed', 'left', 'right', 'up', 'down', 'angry', 'scared', 'cry']),
  brows: Object.freeze(['idle', 'angry', 'raised', 'sad']),
  mouth: Object.freeze(['idle', 'open', 'angry', 'scared', 'cry', 'sleep'])
});

function rgb(value) {
  const raw = String(value || '#000000').replace('#', '');
  const hex = raw.length === 3 ? raw.split('').map(function (char) { return char + char; }).join('') : raw.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map(function (index) { return Number.parseInt(hex.slice(index, index + 2), 16); });
}

function rgba(value, alpha) {
  const color = Array.isArray(value) ? value : rgb(value);
  return 'rgba(' + color[0] + ',' + color[1] + ',' + color[2] + ',' + (alpha == null ? 1 : alpha) + ')';
}

function polygon(ctx, points) {
  ctx.beginPath();
  points.forEach(function (point, index) {
    if (index === 0) ctx.moveTo(point[0], point[1]);
    else ctx.lineTo(point[0], point[1]);
  });
  ctx.closePath();
}

function inkFill(sketch, path, fill, stroke, options) {
  const config = options || {};
  const ctx = sketch.ctx;
  const w = sketch.w;
  const h = sketch.h;
  ctx.save();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.lineWidth = Math.max(1.4, Math.min(w, h) * (config.edgeWidth || .045));
  ctx.stroke();
  ctx.clip();
  const step = Math.max(6, Math.round(Math.min(w, h) * (config.hatchStep || .12)));
  ctx.strokeStyle = rgba(config.hatch || stroke, config.hatchAlpha == null ? .13 : config.hatchAlpha);
  ctx.lineWidth = Math.max(.7, Math.min(w, h) * .012);
  for (let x = -h; x < w + h; x += step) {
    const jitter = sketch.jr(-1.4, 1.4);
    ctx.beginPath();
    ctx.moveTo(x + jitter, h);
    ctx.lineTo(x + h + jitter, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function inkcutVariant(recipe, renderer) {
  const rng = makeRng(hashStr(recipe.seed + ':' + renderer.fingerprint + ':moonharbor-inkcut-layout'));
  return {
    stature: Number(rng.r(.94, 1.07).toFixed(4)),
    headAspect: Number(rng.r(.9, 1.08).toFixed(4)),
    driftSide: rng.chance(.5) ? -1 : 1,
    coatHem: rng.pick(['fork', 'angle', 'square']),
    capPeak: rng.pick(['north', 'tide', 'harbor']),
    signalGlyph: rng.pick(['moon', 'wave', 'star', 'beacon']),
    hatchStep: rng.ri(8, 13),
    accentIndex: rng.ri(0, Math.max(0, renderer.palette.accents.length - 1))
  };
}

export function moonharborInkcutVisualRecord(recipe, renderer) {
  if (!renderer || renderer.id !== MOONHARBOR_INKCUT_RENDERER_ID) return null;
  const payload = {
    rendererId: renderer.id,
    rendererVersion: renderer.version,
    rendererFingerprint: renderer.fingerprint,
    baseRenderer: renderer.baseRenderer,
    addedParts: Array.from(renderer.features),
    variant: inkcutVariant(recipe, renderer)
  };
  return Object.assign({}, payload, { fingerprint: visualRecordFingerprint(recipe, payload) });
}

function drawShadow(palette) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    polygon(ctx, [[w * .08, h * .58], [w * .26, h * .24], [w * .82, h * .31], [w * .94, h * .63], [w * .72, h * .82], [w * .18, h * .76]]);
    ctx.fillStyle = rgba(palette.ink, .18);
    ctx.fill();
    ctx.strokeStyle = rgba(palette.ink, .35);
    ctx.lineWidth = Math.max(1, h * .055);
    ctx.stroke();
  };
}

function drawBody(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    inkFill(sketch, function () {
      const hem = variant.coatHem === 'fork'
        ? [[w * .76, h * .88], [w * .54, h * .76], [w * .5, h * .98], [w * .45, h * .77], [w * .23, h * .9]]
        : variant.coatHem === 'angle'
          ? [[w * .8, h * .82], [w * .58, h * .94], [w * .18, h * .84]]
          : [[w * .79, h * .88], [w * .21, h * .88]];
      polygon(ctx, [[w * .34, h * .06], [w * .66, h * .06], [w * .83, h * .34]].concat(hem, [[w * .16, h * .34]]));
    }, palette.navy, palette.ink, { hatch: palette.paper, hatchAlpha: .12, hatchStep: variant.hatchStep / 100 });
    ctx.strokeStyle = rgba(palette.paper, .42);
    ctx.lineWidth = Math.max(1, w * .018);
    ctx.beginPath();
    ctx.moveTo(w * .5, h * .14);
    ctx.lineTo(w * .5, h * .75);
    ctx.stroke();
  };
}

function drawCape(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const side = variant.driftSide;
    inkFill(sketch, function () {
      const a = side < 0 ? .16 : .84;
      const b = side < 0 ? .8 : .2;
      polygon(ctx, [[w * .5, h * .08], [w * a, h * .2], [w * b, h * .92], [w * .5, h * .62]]);
    }, palette.tide, palette.ink, { hatch: palette.paper, hatchAlpha: .16, hatchStep: .1 });
  };
}

function drawSash(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const side = variant.driftSide;
    polygon(ctx, side > 0
      ? [[w * .18, h * .18], [w * .32, h * .08], [w * .84, h * .82], [w * .68, h * .92]]
      : [[w * .82, h * .18], [w * .68, h * .08], [w * .16, h * .82], [w * .32, h * .92]]);
    ctx.fillStyle = palette.coral;
    ctx.fill();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(1.3, w * .035);
    ctx.stroke();
  };
}

function drawCollar(palette) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    inkFill(sketch, function () {
      polygon(ctx, [[w * .08, h * .2], [w * .5, h * .7], [w * .92, h * .2], [w * .77, h * .82], [w * .5, h * .58], [w * .22, h * .82]]);
    }, palette.paper, palette.ink, { hatch: palette.fog, hatchAlpha: .22, hatchStep: .16 });
  };
}

function drawLimb(palette, kind, side) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const lean = side * w * .09;
    inkFill(sketch, function () {
      if (kind === 'arm') {
        polygon(ctx, [[w * .3, h * .03], [w * .69, h * .03], [w * .64 + lean, h * .67], [w * .82 + lean, h * .86], [w * .55 + lean, h * .98], [w * .3 + lean, h * .74]]);
      } else {
        polygon(ctx, [[w * .31, h * .02], [w * .69, h * .02], [w * .61 + lean, h * .72], [w * .9 + lean, h * .83], [w * .77 + lean, h * .98], [w * .18 + lean, h * .95], [w * .1 + lean, h * .79], [w * .4 + lean, h * .7]]);
      }
    }, kind === 'arm' ? palette.tide : palette.navy, palette.ink, { hatch: palette.paper, hatchAlpha: .14, hatchStep: .16 });
  };
}

function drawRays(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    ctx.save();
    ctx.translate(w * .5, h * .53);
    ctx.rotate(variant.driftSide * .08);
    for (let index = 0; index < 9; index += 1) {
      const angle = index / 9 * Math.PI * 2;
      const inner = w * .29;
      const outer = w * (index % 2 ? .45 : .5);
      ctx.strokeStyle = index % 3 ? rgba(palette.gold, .34) : rgba(palette.coral, .28);
      ctx.lineWidth = Math.max(1.2, w * .018);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.stroke();
    }
    ctx.restore();
  };
}

function drawHead(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    inkFill(sketch, function () {
      polygon(ctx, [[w * .28, h * .06], [w * .72, h * .06], [w * .94, h * .34], [w * .82, h * .76], [w * .55, h * .96], [w * .22, h * .78], [w * .06, h * .35]]);
    }, palette.paper, palette.ink, { hatch: palette.fog, hatchAlpha: .2, hatchStep: variant.hatchStep / 95 });
    ctx.strokeStyle = rgba(palette.tide, .36);
    ctx.lineWidth = Math.max(1, w * .015);
    ctx.beginPath();
    ctx.moveTo(w * .16, h * .38);
    ctx.lineTo(w * .48, h * .13);
    ctx.lineTo(w * .84, h * .37);
    ctx.stroke();
  };
}

function drawEar(palette, species, side) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    inkFill(sketch, function () {
      if (species === 'cat') polygon(ctx, [[w * .5, h * .02], [w * .91, h * .92], [w * .08, h * .78]]);
      else if (species === 'dog') polygon(ctx, side < 0 ? [[w * .15, h * .06], [w * .82, h * .34], [w * .62, h * .96], [w * .05, h * .68]] : [[w * .85, h * .06], [w * .18, h * .34], [w * .38, h * .96], [w * .95, h * .68]]);
      else polygon(ctx, [[w * .18, h * .25], [w * .82, h * .08], [w * .76, h * .8], [w * .24, h * .92]]);
    }, palette.coral, palette.ink, { hatch: palette.paper, hatchAlpha: .18, hatchStep: .18 });
  };
}

function drawHair(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const tabs = variant.capPeak === 'north' ? 5 : 4;
    ctx.fillStyle = palette.ink;
    for (let index = 0; index < tabs; index += 1) {
      const x = w * (.13 + index * .17);
      polygon(ctx, [[x, h * .15], [x + w * .17, h * .08], [x + w * .12, h * .72], [x - w * .02, h * .63]]);
      ctx.fill();
    }
  };
}

function drawCap(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    inkFill(sketch, function () {
      const peakX = variant.capPeak === 'north' ? .55 : variant.capPeak === 'tide' ? .72 : .42;
      polygon(ctx, [[w * .08, h * .76], [w * .26, h * .25], [w * peakX, h * .03], [w * .92, h * .66], [w * .75, h * .9], [w * .2, h * .91]]);
    }, palette.navy, palette.ink, { hatch: palette.gold, hatchAlpha: .15, hatchStep: .14 });
    ctx.strokeStyle = palette.gold;
    ctx.lineWidth = Math.max(1.2, w * .025);
    ctx.beginPath();
    ctx.moveTo(w * .2, h * .72);
    ctx.lineTo(w * .82, h * .62);
    ctx.stroke();
  };
}

function drawEyes(palette, side) {
  return function (sketch, state) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const y = state === 'closed' ? h * .56 : h * .5;
    ctx.strokeStyle = palette.ink;
    ctx.fillStyle = palette.tide;
    ctx.lineWidth = Math.max(1.3, w * .055);
    if (state === 'closed' || state === 'sleep') {
      ctx.beginPath();
      ctx.moveTo(w * .16, y);
      ctx.lineTo(w * .84, y + side * h * .03);
      ctx.stroke();
      return;
    }
    const angry = state === 'angry';
    polygon(ctx, [[w * .5, h * (angry ? .26 : .15)], [w * .9, h * .5], [w * .5, h * .85], [w * .1, h * .5]]);
    ctx.fill();
    ctx.stroke();
    let dx = 0;
    let dy = 0;
    if (state === 'left') dx = -w * .11;
    if (state === 'right') dx = w * .11;
    if (state === 'up') dy = -h * .12;
    if (state === 'down' || state === 'cry') dy = h * .12;
    ctx.fillStyle = palette.ink;
    ctx.beginPath();
    ctx.arc(w * .5 + dx, h * .5 + dy, Math.max(1.5, w * .1), 0, Math.PI * 2);
    ctx.fill();
    if (state === 'cry') {
      ctx.strokeStyle = palette.tide;
      ctx.beginPath();
      ctx.moveTo(w * .5, h * .82);
      ctx.lineTo(w * .5 + side * w * .08, h);
      ctx.stroke();
    }
  };
}

function drawBrows(palette, side) {
  return function (sketch, state) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    let slope = side * .04;
    if (state === 'angry') slope = side * .22;
    if (state === 'sad') slope = side * -.2;
    const lift = state === 'raised' ? -.15 : 0;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(1.5, w * .08);
    ctx.beginPath();
    ctx.moveTo(w * .14, h * (.55 + slope + lift));
    ctx.lineTo(w * .86, h * (.55 - slope + lift));
    ctx.stroke();
  };
}

function drawNose(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    polygon(ctx, variant.driftSide > 0
      ? [[w * .2, h * .2], [w * .88, h * .55], [w * .24, h * .82]]
      : [[w * .8, h * .2], [w * .12, h * .55], [w * .76, h * .82]]);
    ctx.fillStyle = palette.coral;
    ctx.fill();
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(1.2, w * .07);
    ctx.stroke();
  };
}

function drawMouth(palette) {
  return function (sketch, state) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    ctx.strokeStyle = palette.ink;
    ctx.fillStyle = palette.coral;
    ctx.lineWidth = Math.max(1.4, w * .045);
    if (state === 'open' || state === 'scared' || state === 'cry') {
      polygon(ctx, state === 'scared'
        ? [[w * .5, h * .08], [w * .87, h * .5], [w * .5, h * .92], [w * .13, h * .5]]
        : [[w * .18, h * .32], [w * .82, h * .3], [w * .7, h * .84], [w * .3, h * .84]]);
      ctx.fill();
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    if (state === 'angry') {
      ctx.moveTo(w * .15, h * .72);
      ctx.lineTo(w * .5, h * .35);
      ctx.lineTo(w * .85, h * .72);
    } else if (state === 'sleep') {
      ctx.moveTo(w * .2, h * .5);
      ctx.lineTo(w * .8, h * .5);
    } else {
      ctx.moveTo(w * .18, h * .42);
      ctx.lineTo(w * .5, h * .66);
      ctx.lineTo(w * .82, h * .42);
    }
    ctx.stroke();
  };
}

function drawCheek(palette, side) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    ctx.strokeStyle = rgba(palette.tide, .86);
    ctx.lineWidth = Math.max(1.1, w * .055);
    for (let index = 0; index < 3; index += 1) {
      const y = h * (.28 + index * .2);
      ctx.beginPath();
      ctx.moveTo(w * .14, y);
      ctx.lineTo(w * (.66 + side * .06), y + side * h * .08);
      ctx.stroke();
    }
  };
}

function drawCompass(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    ctx.fillStyle = palette.gold;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(1.3, w * .055);
    polygon(ctx, [[w * .5, h * .04], [w * .68, h * .34], [w * .96, h * .5], [w * .66, h * .68], [w * .5, h * .96], [w * .32, h * .68], [w * .04, h * .5], [w * .34, h * .32]]);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = variant.driftSide > 0 ? palette.coral : palette.tide;
    polygon(ctx, [[w * .5, h * .16], [w * .61, h * .5], [w * .5, h * .84], [w * .39, h * .5]]);
    ctx.fill();
  };
}

function drawLamp(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const glow = ctx.createRadialGradient(w * .5, h * .57, 0, w * .5, h * .57, w * .48);
    glow.addColorStop(0, rgba(palette.gold, .7));
    glow.addColorStop(1, rgba(palette.gold, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, h * .15, w, h * .8);
    inkFill(sketch, function () {
      polygon(ctx, [[w * .24, h * .25], [w * .76, h * .25], [w * .84, h * .87], [w * .16, h * .87]]);
    }, palette.paper, palette.ink, { hatch: palette.gold, hatchAlpha: .18, hatchStep: .15 });
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = Math.max(1.3, w * .05);
    ctx.beginPath();
    ctx.moveTo(w * .31, h * .28);
    ctx.quadraticCurveTo(w * .5, h * .02, w * .69, h * .28);
    ctx.stroke();
    ctx.fillStyle = variant.signalGlyph === 'wave' ? palette.tide : variant.signalGlyph === 'moon' ? palette.coral : palette.gold;
    polygon(ctx, variant.signalGlyph === 'star'
      ? [[w * .5, h * .38], [w * .58, h * .54], [w * .75, h * .57], [w * .61, h * .68], [w * .65, h * .83], [w * .5, h * .74], [w * .35, h * .83], [w * .39, h * .68], [w * .25, h * .57], [w * .42, h * .54]]
      : [[w * .5, h * .38], [w * .72, h * .58], [w * .5, h * .79], [w * .28, h * .58]]);
    ctx.fill();
  };
}

function buildInkcutLayout(recipe, visual) {
  const variant = visual.variant;
  const scale = U * .43 * variant.stature;
  const headWidth = scale * .67 * variant.headAspect;
  const bodyTop = scale * .46;
  const bodyHeight = scale * 1.08;
  const legLength = scale * .5;
  const floorY = bodyTop + bodyHeight + legLength;
  const halfWidth = headWidth * .56;
  const turn = variant.driftSide * .16;
  return {
    U: U,
    s: scale,
    w: headWidth,
    turn: turn,
    at: Math.abs(turn),
    ts: Math.sign(turn) || 1,
    press: 1,
    P: {},
    colors: {},
    media: { id: MOONHARBOR_INKCUT_MEDIA_ID },
    L: { skullTop: [0, -scale * .72], hatX: turn * headWidth * .2, hatY: -scale * .8 },
    B: {
      quad: false,
      sit: false,
      dir: variant.driftSide,
      cx: 0,
      top: bodyTop,
      bot: bodyTop + bodyHeight,
      h: bodyHeight,
      halfW: halfWidth,
      shoulderY: bodyTop + bodyHeight * .18,
      shoulderX: halfWidth,
      hipY: bodyTop + bodyHeight * .78,
      hipX: halfWidth * .42,
      floorY: floorY,
      gripR: scale * .07,
      grip: function (side) { return [side * halfWidth * 1.35, bodyTop + bodyHeight * .57]; }
    }
  };
}

function addInkcutPart(face, spec) {
  const name = spec.contentId + (spec.side ? '-' + (spec.side > 0 ? 'r' : 'l') : '');
  const part = makePart({
    name: name,
    wU: spec.wU,
    hU: spec.hU,
    pivot: spec.pivot || [.5, .5],
    states: spec.states || ['idle'],
    seed: face.recipe.seed + ':' + face.visual.rendererFingerprint + ':' + spec.contentId + ':' + (spec.side || 0),
    draw: spec.draw
  });
  part.matl.side = THREE.FrontSide;
  part.matl.needsUpdate = true;
  part.mesh.renderOrder = spec.order;
  part.mesh.position.z = spec.order * .001;
  part.mesh.userData.partId = spec.contentId;
  part.mesh.userData.contentRenderer = face.visual.rendererId;
  part.mesh.userData.provenance = 'local-authored-procedural-2d';

  const bone = new THREE.Group();
  bone.position.set(spec.x, spec.y, 0);
  bone.userData.base = { x: spec.x, y: spec.y };
  bone.add(part.mesh);
  (spec.region === 'body' ? face.bodyGroup : face.headGroup).add(bone);
  face.entries.push({
    id: spec.animId,
    contentPartId: spec.contentId,
    def: { id: spec.contentId, label: spec.label },
    bone: bone,
    part: part,
    order: spec.order,
    side: spec.side || 1,
    depth: spec.depth || 0,
    region: spec.region || 'head',
    authoredBy: face.visual.rendererId
  });
}

export function buildMoonharborInkcutCharacter(recipe, renderer) {
  const visual = moonharborInkcutVisualRecord(recipe, renderer);
  if (!visual) throw new Error('Unsupported Inkcut renderer: ' + (renderer && renderer.id || 'missing'));
  const layout = buildInkcutLayout(recipe, visual);
  const group = new THREE.Group();
  const headGroup = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup, headGroup);
  const entries = [];
  const face = {
    group: group,
    headGroup: headGroup,
    bodyGroup: bodyGroup,
    entries: entries,
    F: layout,
    recipe: recipe,
    visual: visual,
    rank: null,
    byId: function (id) { return entries.filter(function (entry) { return entry.id === id; }); },
    dispose: function () { entries.forEach(function (entry) { entry.part.dispose(); }); }
  };

  const palette = renderer.palette;
  const variant = visual.variant;
  const scale = layout.s;
  const body = layout.B;
  const headW = layout.w * 2.5 / U;
  const headH = scale * 1.62 / U;
  const bodyW = body.halfW * 3.05 / U;
  const bodyH = body.h * 1.16 / U;
  const shoulderY = -body.shoulderY / U;
  const hipY = -body.hipY / U;

  addInkcutPart(face, { contentId: 'ink-shadow', animId: 'shadow', label: 'angular contact shadow', region: 'body', order: -6, wU: bodyW * 1.25, hU: .25, x: 0, y: -body.floorY / U + .035, draw: drawShadow(palette) });
  addInkcutPart(face, { contentId: 'ink-coat-body', animId: 'torso', label: 'ink-cut coat body', region: 'body', order: -2, wU: bodyW, hU: bodyH, x: 0, y: -(body.top + body.h * .5) / U, draw: drawBody(palette, variant) });
  addInkcutPart(face, { contentId: 'ink-shoulder-cape', animId: 'mantle', label: 'asymmetric shoulder cape', region: 'body', order: -1, wU: bodyW * 1.18, hU: bodyH * .98, x: 0, y: -(body.top + body.h * .49) / U, draw: drawCape(palette, variant) });
  addInkcutPart(face, { contentId: 'ink-sash', animId: 'sash', label: 'signal sash', region: 'body', order: 1, wU: bodyW * .88, hU: bodyH * .82, x: 0, y: -(body.top + body.h * .48) / U, draw: drawSash(palette, variant) });

  [-1, 1].forEach(function (side) {
    addInkcutPart(face, { contentId: 'ink-boots', animId: 'legs', label: 'harbor boot', region: 'body', order: -3, side: side, wU: .28, hU: scale * .68 / U, pivot: [.5, .07], x: side * body.halfW * .38 / U, y: hipY, draw: drawLimb(palette, 'leg', side) });
    addInkcutPart(face, { contentId: 'ink-arms', animId: 'arms', label: 'signal arm', region: 'body', order: 2, side: side, wU: .31, hU: scale * .76 / U, pivot: [.5, .07], x: side * body.shoulderX / U, y: shoulderY, draw: drawLimb(palette, 'arm', side) });
  });

  addInkcutPart(face, { contentId: 'ink-collar', animId: 'collar', label: 'split paper collar', region: 'body', order: 3, wU: bodyW * .72, hU: .25, x: 0, y: -(body.top + scale * .02) / U, draw: drawCollar(palette) });
  addInkcutPart(face, { contentId: 'ink-compass', animId: 'waymark', label: 'eight-point compass', region: 'body', order: 4, wU: .2, hU: .2, x: variant.driftSide * bodyW * .13, y: -(body.top + body.h * .42) / U, draw: drawCompass(palette, variant) });

  addInkcutPart(face, { contentId: 'ink-paper-rays', animId: 'paper-rays', label: 'cut-paper signal rays', order: -5, depth: -.4, wU: headW * 1.3, hU: headH * 1.22, x: 0, y: 0, draw: drawRays(palette, variant) });
  addInkcutPart(face, { contentId: 'ink-hair-tabs', animId: 'hair', label: 'block-cut hair tabs', order: -2, depth: -.18, wU: headW * 1.03, hU: headH * 1.02, x: 0, y: .02, draw: drawHair(palette, variant) });
  addInkcutPart(face, { contentId: 'ink-mask-head', animId: 'skull', label: 'faceted paper mask', order: 0, wU: headW, hU: headH, x: 0, y: 0, draw: drawHead(palette, variant) });

  [-1, 1].forEach(function (side) {
    addInkcutPart(face, { contentId: 'ink-ear-fins', animId: 'ears', label: recipe.species + ' signal ear', order: -1, side: side, depth: -.08, wU: .25, hU: .42, x: side * layout.w * .93 / U, y: -scale * .04 / U, draw: drawEar(palette, recipe.species, side) });
    addInkcutPart(face, { contentId: 'ink-eyes', animId: 'eyes', label: 'diamond tide eye', order: 3, side: side, depth: .12, states: INK_STATES.eyes, wU: .21, hU: .17, x: side * layout.w * .4 / U + layout.turn * .04, y: scale * .02 / U, draw: drawEyes(palette, side) });
    addInkcutPart(face, { contentId: 'ink-brows', animId: 'brows', label: 'square ink brow', order: 4, side: side, depth: .18, states: INK_STATES.brows, wU: .26, hU: .13, x: side * layout.w * .4 / U + layout.turn * .04, y: scale * .2 / U, draw: drawBrows(palette, side) });
    addInkcutPart(face, { contentId: 'ink-cheek-marks', animId: 'cheek-marks', label: 'tide hatch cheek', order: 5, side: side, depth: .2, wU: .24, hU: .2, x: side * layout.w * .58 / U, y: -scale * .3 / U, draw: drawCheek(palette, side) });
  });

  addInkcutPart(face, { contentId: 'ink-nose', animId: 'nose', label: 'signal wedge nose', order: 4, depth: .22, wU: .16, hU: .16, x: layout.turn * .07, y: -scale * .17 / U, draw: drawNose(palette, variant) });
  addInkcutPart(face, { contentId: 'ink-mouth', animId: 'mouth', label: 'folded ink mouth', order: 5, depth: .24, states: INK_STATES.mouth, wU: .34, hU: .2, x: layout.turn * .08, y: -scale * .42 / U, draw: drawMouth(palette) });
  addInkcutPart(face, { contentId: 'ink-harbor-cap', animId: 'crest', label: 'angular harbor cap', order: 7, depth: .31, wU: headW * .9, hU: .47, x: 0, y: scale * .68 / U, draw: drawCap(palette, variant) });

  const grip = body.grip(1);
  addInkcutPart(face, { contentId: 'ink-signal-lamp', animId: 'held', label: 'cut-paper signal lamp', region: 'body', order: 3, side: 1, wU: .43, hU: .64, pivot: [.5, .08], x: grip[0] / U, y: -grip[1] / U, draw: drawLamp(palette, variant) });

  const featurePlanes = Object.fromEntries(MOONHARBOR_INKCUT_FEATURES.map(function (id) {
    return [id, entries.filter(function (entry) { return entry.contentPartId === id; }).length];
  }));
  face.rendererAudit = Object.freeze({
    rendererId: MOONHARBOR_INKCUT_RENDERER_ID,
    independent: true,
    mediaId: MOONHARBOR_INKCUT_MEDIA_ID,
    visiblePartPlanes: entries.length,
    authoredPartPlanes: entries.filter(function (entry) { return entry.authoredBy === MOONHARBOR_INKCUT_RENDERER_ID; }).length,
    upstreamVisiblePartPlanes: entries.filter(function (entry) { return !entry.authoredBy; }).length,
    featurePlanes: featurePlanes
  });
  return face;
}
