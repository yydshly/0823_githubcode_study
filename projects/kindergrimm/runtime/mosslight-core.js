import * as THREE from 'three';
import { makePart, U } from '../upstream/src/part.js';
import { makeRng, hashStr } from '../upstream/src/rng.js';
import { visualRecordFingerprint } from './contracts.js';

export const MOSSLIGHT_CORE_RENDERER_ID = 'mosslight-core-2d';
export const MOSSLIGHT_CORE_MEDIA_ID = 'mosslight-gouache';

export const MOSSLIGHT_CORE_FEATURES = Object.freeze([
  'core-shadow',
  'core-body',
  'core-mantle',
  'core-collar',
  'core-waymark',
  'core-arms',
  'core-legs',
  'core-head',
  'core-ears',
  'core-hair',
  'core-leaf-crown',
  'core-eyes',
  'core-brows',
  'core-nose',
  'core-mouth',
  'core-cheek-sprigs',
  'core-lantern'
]);

export const MOSSLIGHT_CORE_COVERAGE = Object.freeze({
  head: Object.freeze(['core-head', 'core-ears', 'core-hair', 'core-leaf-crown']),
  face: Object.freeze(['core-eyes', 'core-brows', 'core-nose', 'core-mouth', 'core-cheek-sprigs']),
  body: Object.freeze(['core-body', 'core-shadow']),
  limbs: Object.freeze(['core-arms', 'core-legs']),
  clothing: Object.freeze(['core-mantle', 'core-collar', 'core-waymark']),
  prop: Object.freeze(['core-lantern'])
});

const CORE_STATES = Object.freeze({
  eyes: Object.freeze(['open', 'closed', 'left', 'right', 'up', 'down', 'angry', 'scared', 'cry']),
  brows: Object.freeze(['idle', 'angry', 'raised', 'sad']),
  mouth: Object.freeze(['idle', 'open', 'angry', 'scared', 'cry', 'sleep']),
  quadlegs: Object.freeze(['idle', 'stepA', 'stepB'])
});

const rgb = value => {
  const raw = String(value || '#000000').replace('#', '');
  const hex = raw.length === 3 ? [...raw].map(char => char + char).join('') : raw.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
};
const rgba = (value, alpha = 1) => {
  const [r, g, b] = Array.isArray(value) ? value : rgb(value);
  return `rgba(${r},${g},${b},${alpha})`;
};

function roundedPath(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w * .5, h * .5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function gouacheFill(sketch, path, fill, edge, options = {}) {
  const { ctx, w, h } = sketch;
  ctx.save();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = edge;
  ctx.lineWidth = Math.max(1.2, Math.min(w, h) * (options.edgeWidth ?? .035));
  ctx.stroke();
  ctx.clip();
  const flecks = options.flecks ?? Math.max(6, Math.round(w * h / 1250));
  for (let index = 0; index < flecks; index += 1) {
    const x = sketch.jr(0, w);
    const y = sketch.jr(0, h);
    const length = sketch.jr(w * .018, w * .075);
    ctx.strokeStyle = index % 3 ? rgba(options.paper ?? '#f4eddc', sketch.jr(.08, .2)) : rgba(options.edgeFleck ?? '#223a2d', sketch.jr(.025, .075));
    ctx.lineWidth = sketch.jr(.6, 1.8);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y + sketch.jr(-1.4, 1.4));
    ctx.stroke();
  }
  ctx.restore();
}

function leafPath(ctx, cx, cy, rx, ry, angle = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, -ry);
  ctx.bezierCurveTo(rx * .95, -ry * .55, rx, ry * .45, 0, ry);
  ctx.bezierCurveTo(-rx, ry * .45, -rx * .95, -ry * .55, 0, -ry);
  ctx.closePath();
  ctx.restore();
}

function coreVariant(recipe, renderer) {
  const rng = makeRng(hashStr(`${recipe.seed}:${renderer.fingerprint}:mosslight-core-layout`));
  return {
    stature: Number(rng.r(.92, 1.08).toFixed(4)),
    headWidth: Number(rng.r(.92, 1.1).toFixed(4)),
    driftSide: rng.chance(.5) ? -1 : 1,
    crownLeaves: rng.ri(3, 6),
    freckles: rng.ri(3, 7),
    mantleCut: rng.pick(['round', 'split', 'leaf']),
    lanternRune: rng.pick(['path', 'star', 'branch', 'gate']),
    accentIndex: rng.ri(0, Math.max(0, renderer.palette.accents.length - 1))
  };
}

export function mosslightCoreVisualRecord(recipe, renderer) {
  if (!renderer || renderer.id !== MOSSLIGHT_CORE_RENDERER_ID) return null;
  const payload = {
    rendererId: renderer.id,
    rendererVersion: renderer.version,
    rendererFingerprint: renderer.fingerprint,
    baseRenderer: renderer.baseRenderer,
    addedParts: [...renderer.features],
    variant: coreVariant(recipe, renderer)
  };
  return { ...payload, fingerprint: visualRecordFingerprint(recipe, payload) };
}

function drawShadow(palette) {
  return sketch => {
    const { ctx, w, h } = sketch;
    const gradient = ctx.createRadialGradient(w * .5, h * .52, 0, w * .5, h * .52, w * .45);
    gradient.addColorStop(0, rgba(palette.shadow, .24));
    gradient.addColorStop(1, rgba(palette.shadow, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(w * .5, h * .52, w * .46, h * .24, 0, 0, Math.PI * 2);
    ctx.fill();
  };
}

function drawBody(palette, variant) {
  return sketch => {
    const { ctx, w, h } = sketch;
    gouacheFill(sketch, () => {
      ctx.beginPath();
      ctx.moveTo(w * .28, h * .1);
      ctx.quadraticCurveTo(w * .08, h * .34, w * .17, h * .78);
      ctx.quadraticCurveTo(w * .5, h * (variant.mantleCut === 'split' ? .91 : .96), w * .83, h * .78);
      ctx.quadraticCurveTo(w * .92, h * .34, w * .72, h * .1);
      ctx.closePath();
    }, palette.bark, rgba(palette.shadow, .92), { paper: palette.paper, edgeWidth: .026 });
    ctx.strokeStyle = rgba(palette.paper, .34);
    ctx.lineWidth = Math.max(1, w * .018);
    ctx.beginPath();
    ctx.moveTo(w * .5, h * .18);
    ctx.lineTo(w * .5, h * .8);
    ctx.stroke();
  };
}

function drawMantle(palette, variant) {
  return sketch => {
    const { ctx, w, h } = sketch;
    const accent = palette.accents[variant.accentIndex];
    gouacheFill(sketch, () => {
      ctx.beginPath();
      ctx.moveTo(w * .2, h * .22);
      ctx.quadraticCurveTo(w * .5, h * .02, w * .8, h * .22);
      ctx.lineTo(w * .7, h * .84);
      if (variant.mantleCut === 'leaf') ctx.quadraticCurveTo(w * .5, h * .7, w * .5, h * .98);
      else if (variant.mantleCut === 'split') ctx.lineTo(w * .53, h * .76);
      ctx.lineTo(w * .5, h * .9);
      ctx.lineTo(w * .47, h * .76);
      ctx.lineTo(w * .3, h * .84);
      ctx.closePath();
    }, palette.foliage, rgba(palette.shadow, .94), { paper: palette.mist, edgeWidth: .026 });
    ctx.strokeStyle = rgba(accent, .55);
    ctx.lineWidth = Math.max(1.1, w * .016);
    ctx.setLineDash([w * .035, w * .025]);
    ctx.beginPath();
    ctx.moveTo(w * .3, h * .33);
    ctx.quadraticCurveTo(w * .5, h * .2, w * .7, h * .33);
    ctx.stroke();
  };
}

function drawLimb(palette, kind, side) {
  return sketch => {
    const { ctx, w, h } = sketch;
    const lean = side * w * .08;
    gouacheFill(sketch, () => {
      ctx.beginPath();
      if (kind === 'arm') {
        ctx.moveTo(w * .38, h * .05);
        ctx.quadraticCurveTo(w * .46 + lean, h * .45, w * .3 + lean, h * .78);
        ctx.quadraticCurveTo(w * .38, h * .98, w * .58, h * .84);
        ctx.quadraticCurveTo(w * .72 + lean, h * .45, w * .62, h * .05);
      } else {
        ctx.moveTo(w * .34, h * .02);
        ctx.lineTo(w * .28 + lean, h * .75);
        ctx.quadraticCurveTo(w * .12 + lean, h * .96, w * .6 + lean, h * .96);
        ctx.quadraticCurveTo(w * .76 + lean, h * .82, w * .62, h * .7);
        ctx.lineTo(w * .66, h * .02);
      }
      ctx.closePath();
    }, kind === 'arm' ? palette.foliage : palette.bark, rgba(palette.shadow, .94), { paper: palette.paper, edgeWidth: .045, flecks: 5 });
  };
}

function drawHead(palette, variant) {
  return sketch => {
    const { ctx, w, h } = sketch;
    gouacheFill(sketch, () => {
      ctx.beginPath();
      ctx.moveTo(w * .5, h * .04);
      ctx.bezierCurveTo(w * .88, h * .09, w * .94, h * .55, w * .72, h * .83);
      ctx.quadraticCurveTo(w * .5, h * 1.03, w * .28, h * .83);
      ctx.bezierCurveTo(w * .06, h * .55, w * .12, h * .09, w * .5, h * .04);
      ctx.closePath();
    }, palette.paper, rgba(palette.shadow, .96), { paper: palette.mist, edgeWidth: .024, flecks: variant.freckles + 8 });
    ctx.fillStyle = rgba(palette.glow, .08);
    ctx.beginPath();
    ctx.ellipse(w * .5, h * .52, w * .32, h * .29, 0, 0, Math.PI * 2);
    ctx.fill();
  };
}

function drawEar(palette, species, side) {
  return sketch => {
    const { ctx, w, h } = sketch;
    gouacheFill(sketch, () => {
      ctx.beginPath();
      if (species === 'cat') {
        ctx.moveTo(w * .22, h * .88); ctx.lineTo(w * .5 + side * w * .06, h * .04); ctx.lineTo(w * .82, h * .88);
      } else if (species === 'dog') {
        ctx.moveTo(w * .3, h * .08); ctx.quadraticCurveTo(w * .9, h * .32, w * .62, h * .95); ctx.quadraticCurveTo(w * .18, h * .72, w * .3, h * .08);
      } else {
        ctx.ellipse(w * .5, h * .52, w * .22, h * .42, side * .08, 0, Math.PI * 2);
      }
      ctx.closePath();
    }, palette.paper, rgba(palette.shadow, .9), { paper: palette.mist, edgeWidth: .055, flecks: 3 });
    ctx.fillStyle = rgba(palette.accentRose, .28);
    ctx.beginPath();
    ctx.ellipse(w * .5, h * .55, w * .1, h * .22, 0, 0, Math.PI * 2);
    ctx.fill();
  };
}

function drawHair(palette, variant) {
  return sketch => {
    const { ctx, w, h } = sketch;
    gouacheFill(sketch, () => {
      ctx.beginPath();
      ctx.moveTo(w * .08, h * .82);
      ctx.quadraticCurveTo(w * .06, h * .12, w * .5, h * .06);
      ctx.quadraticCurveTo(w * .94, h * .12, w * .92, h * .82);
      ctx.lineTo(w * .78, h * .62);
      ctx.lineTo(w * .65, h * .82);
      ctx.lineTo(w * .5, h * .58 + variant.driftSide * h * .015);
      ctx.lineTo(w * .34, h * .82);
      ctx.lineTo(w * .2, h * .62);
      ctx.closePath();
    }, palette.shadow, rgba(palette.foliage, .9), { paper: palette.mist, edgeWidth: .025, flecks: 9 });
  };
}

function drawEyes(palette, side) {
  return (sketch, state) => {
    const { ctx, w, h } = sketch;
    const cy = h * .5;
    ctx.strokeStyle = rgba(palette.shadow, .98);
    ctx.fillStyle = rgba(palette.shadow, .98);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.8, w * .11);
    if (state === 'closed' || state === 'cry') {
      ctx.beginPath();
      ctx.moveTo(w * .18, cy);
      ctx.quadraticCurveTo(w * .5, state === 'cry' ? cy + h * .18 : cy - h * .08, w * .82, cy);
      ctx.stroke();
      return;
    }
    const scared = state === 'scared';
    const angry = state === 'angry';
    const dx = state === 'left' ? -w * .12 : state === 'right' ? w * .12 : 0;
    const dy = state === 'up' ? -h * .12 : state === 'down' ? h * .12 : 0;
    ctx.beginPath();
    ctx.ellipse(w * .5, cy, w * (scared ? .24 : .2), h * (scared ? .3 : .24), angry ? side * .16 : 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(w * .5 + dx, cy + dy, Math.max(1.7, w * .09), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(palette.glow, .95);
    ctx.beginPath();
    ctx.arc(w * .46 + dx, cy - h * .04 + dy, Math.max(1, w * .025), 0, Math.PI * 2);
    ctx.fill();
  };
}

function drawBrows(palette, side) {
  return (sketch, state) => {
    const { ctx, w, h } = sketch;
    const lift = state === 'raised' ? -h * .16 : state === 'sad' ? h * .08 : 0;
    const tilt = state === 'angry' ? -side * h * .2 : state === 'sad' ? side * h * .14 : 0;
    ctx.strokeStyle = rgba(palette.shadow, .92);
    ctx.lineWidth = Math.max(1.5, w * .09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * .18, h * .55 + lift - tilt);
    ctx.quadraticCurveTo(w * .5, h * .35 + lift, w * .82, h * .55 + lift + tilt);
    ctx.stroke();
  };
}

function drawNose(palette) {
  return sketch => {
    const { ctx, w, h } = sketch;
    ctx.fillStyle = rgba(palette.bark, .78);
    ctx.strokeStyle = rgba(palette.shadow, .86);
    ctx.lineWidth = Math.max(1, w * .07);
    leafPath(ctx, w * .5, h * .52, w * .22, h * .25, Math.PI);
    ctx.fill(); ctx.stroke();
  };
}

function drawMouth(palette) {
  return (sketch, state) => {
    const { ctx, w, h } = sketch;
    ctx.strokeStyle = rgba(palette.shadow, .96);
    ctx.fillStyle = rgba(palette.accentRose, .5);
    ctx.lineWidth = Math.max(1.4, w * .055);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (state === 'open' || state === 'scared' || state === 'cry') {
      ctx.ellipse(w * .5, h * .5, w * (state === 'scared' ? .17 : .22), h * (state === 'cry' ? .25 : .2), 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (state === 'sleep') {
      ctx.moveTo(w * .24, h * .48); ctx.quadraticCurveTo(w * .5, h * .64, w * .76, h * .48); ctx.stroke();
    } else if (state === 'angry') {
      ctx.moveTo(w * .2, h * .64); ctx.quadraticCurveTo(w * .5, h * .3, w * .8, h * .64); ctx.stroke();
    } else {
      ctx.moveTo(w * .2, h * .42); ctx.quadraticCurveTo(w * .5, h * .68, w * .8, h * .42); ctx.stroke();
    }
  };
}

function drawSprig(palette, side) {
  return sketch => {
    const { ctx, w, h } = sketch;
    ctx.strokeStyle = rgba(palette.foliage, .82);
    ctx.lineWidth = Math.max(1.1, w * .04);
    ctx.beginPath();
    ctx.moveTo(w * .18, h * .78);
    ctx.quadraticCurveTo(w * .48, h * .45, w * .8, h * .18);
    ctx.stroke();
    for (const [x, y, a] of [[.34, .62, -.5], [.5, .47, .55], [.66, .31, -.45]]) {
      ctx.fillStyle = rgba(palette.foliage, .76);
      leafPath(ctx, w * x, h * y, w * .12, h * .12, a * side);
      ctx.fill();
    }
  };
}

function drawCrown(palette, variant) {
  return sketch => {
    const { ctx, w, h } = sketch;
    ctx.strokeStyle = rgba(palette.foliage, .86);
    ctx.lineWidth = Math.max(1.4, w * .018);
    ctx.beginPath();
    ctx.moveTo(w * .12, h * .74);
    ctx.quadraticCurveTo(w * .5, h * .45, w * .88, h * .74);
    ctx.stroke();
    for (let index = 0; index < variant.crownLeaves; index += 1) {
      const t = index / Math.max(1, variant.crownLeaves - 1);
      const x = w * (.18 + t * .64);
      const y = h * (.64 - Math.sin(t * Math.PI) * .28);
      ctx.fillStyle = rgba(index % 2 ? palette.foliage : palette.accents[variant.accentIndex], .9);
      ctx.strokeStyle = rgba(palette.shadow, .72);
      leafPath(ctx, x, y, w * .085, h * .2, (t - .5) * .8);
      ctx.fill(); ctx.stroke();
    }
  };
}

function drawCollar(palette) {
  return sketch => {
    const { ctx, w, h } = sketch;
    ctx.fillStyle = rgba(palette.mist, .96);
    ctx.strokeStyle = rgba(palette.shadow, .88);
    ctx.lineWidth = Math.max(1.2, w * .025);
    ctx.beginPath();
    ctx.moveTo(w * .12, h * .18); ctx.lineTo(w * .5, h * .84); ctx.lineTo(w * .88, h * .18);
    ctx.quadraticCurveTo(w * .5, h * .02, w * .12, h * .18);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };
}

function drawWaymark(palette, variant) {
  return sketch => {
    const { ctx, w, h } = sketch;
    ctx.fillStyle = rgba(palette.glow, .92);
    ctx.strokeStyle = rgba(palette.shadow, .92);
    ctx.lineWidth = Math.max(1.1, w * .07);
    ctx.beginPath();
    ctx.moveTo(w * .5, h * .08); ctx.lineTo(w * .9, h * .5); ctx.lineTo(w * .5, h * .92); ctx.lineTo(w * .1, h * .5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = rgba(palette.foliage, .96);
    ctx.lineWidth = Math.max(1.1, w * .06);
    ctx.beginPath();
    if (variant.lanternRune === 'star') {
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + i * Math.PI * 4 / 5;
        const x = w * .5 + Math.cos(a) * w * .24;
        const y = h * .5 + Math.sin(a) * h * .24;
        if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else {
      ctx.moveTo(w * .25, h * .68); ctx.quadraticCurveTo(w * .5, h * .18, w * .75, h * .34);
    }
    ctx.stroke();
  };
}

function drawLantern(palette, variant) {
  return sketch => {
    const { ctx, w, h } = sketch;
    const glow = ctx.createRadialGradient(w * .5, h * .58, 0, w * .5, h * .58, w * .42);
    glow.addColorStop(0, rgba(palette.glow, .72));
    glow.addColorStop(1, rgba(palette.glow, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, h * .12, w, h * .82);
    ctx.strokeStyle = rgba(palette.shadow, .94);
    ctx.lineWidth = Math.max(1.4, w * .055);
    ctx.beginPath();
    ctx.moveTo(w * .32, h * .3); ctx.quadraticCurveTo(w * .5, h * .02, w * .68, h * .3);
    ctx.stroke();
    roundedPath(ctx, w * .22, h * .28, w * .56, h * .58, w * .08);
    ctx.fillStyle = rgba(palette.paper, .9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rgba(palette.glow, .96);
    leafPath(ctx, w * .5, h * .58, w * .13, h * .19, variant.driftSide * .18);
    ctx.fill();
  };
}

function buildCoreLayout(recipe, visual) {
  const v = visual.variant;
  const S = U * .45 * v.stature;
  const w = S * .78 * v.headWidth;
  const bodyTop = S * .54;
  const bodyH = S * .92;
  const legLen = S * .42;
  const floorY = bodyTop + bodyH + legLen;
  const halfW = w * .62;
  const turn = v.driftSide * .12;
  return {
    U,
    s: S,
    w,
    turn,
    at: Math.abs(turn),
    ts: Math.sign(turn) || 1,
    press: 1,
    P: {},
    colors: {},
    media: { id: MOSSLIGHT_CORE_MEDIA_ID },
    L: { skullTop: [0, -S * .92], hatX: turn * w * .12, hatY: -S * .9 },
    B: {
      quad: recipe.base === 'quad',
      sit: recipe.base === 'sit',
      dir: v.driftSide,
      cx: 0,
      top: bodyTop,
      bot: bodyTop + bodyH,
      h: bodyH,
      halfW,
      shoulderY: bodyTop + bodyH * .2,
      shoulderX: halfW * .9,
      hipY: bodyTop + bodyH * .82,
      hipX: halfW * .42,
      floorY,
      gripR: S * .075,
      grip: side => [side * halfW * 1.25, bodyTop + bodyH * .58]
    }
  };
}

function addCorePart(face, spec) {
  const part = makePart({
    name: spec.contentId + (spec.side ? `-${spec.side > 0 ? 'r' : 'l'}` : ''),
    wU: spec.wU,
    hU: spec.hU,
    pivot: spec.pivot ?? [.5, .5],
    states: spec.states ?? ['idle'],
    seed: `${face.recipe.seed}:${face.visual.rendererFingerprint}:${spec.contentId}:${spec.side ?? 0}`,
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
    bone,
    part,
    order: spec.order,
    side: spec.side ?? 1,
    depth: spec.depth ?? 0,
    region: spec.region ?? 'head',
    authoredBy: face.visual.rendererId
  });
}

export function buildMosslightCoreCharacter(recipe, renderer) {
  const visual = mosslightCoreVisualRecord(recipe, renderer);
  if (!visual) throw new Error(`Unsupported Core renderer: ${renderer?.id ?? 'missing'}`);
  const F = buildCoreLayout(recipe, visual);
  const group = new THREE.Group();
  const headGroup = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup, headGroup);
  const entries = [];
  const face = {
    group,
    headGroup,
    bodyGroup,
    entries,
    F,
    recipe,
    visual,
    rank: null,
    byId: id => entries.filter(entry => entry.id === id),
    dispose() { entries.forEach(entry => entry.part.dispose()); }
  };
  const p = renderer.palette;
  const v = visual.variant;
  const S = F.s;
  const B = F.B;
  const headW = F.w * 2.35 / U;
  const headH = S * 2.05 / U;
  const bodyW = B.halfW * 2.8 / U;
  const bodyH = B.h * 1.14 / U;
  const shoulderY = -B.shoulderY / U;
  const hipY = -B.hipY / U;

  addCorePart(face, { contentId: 'core-shadow', animId: 'shadow', label: 'painted contact shadow', region: 'body', order: -4, wU: bodyW * 1.2, hU: .28, x: 0, y: -B.floorY / U + .04, draw: drawShadow(p) });
  addCorePart(face, { contentId: 'core-body', animId: 'torso', label: 'gouache body', region: 'body', order: -1, wU: bodyW, hU: bodyH, x: 0, y: -(B.top + B.h * .52) / U, draw: drawBody(p, v) });
  addCorePart(face, { contentId: 'core-mantle', animId: 'mantle', label: 'moss mantle', region: 'body', order: 0, wU: bodyW * 1.06, hU: bodyH * .96, x: 0, y: -(B.top + B.h * .5) / U, draw: drawMantle(p, v) });

  for (const side of [-1, 1]) {
    addCorePart(face, { contentId: 'core-legs', animId: recipe.base === 'quad' ? 'quadlegs' : 'legs', label: 'route boot', region: 'body', order: -2, side, states: recipe.base === 'quad' ? CORE_STATES.quadlegs : ['idle'], wU: .25, hU: S * .58 / U, pivot: [.5, .08], x: side * B.halfW * .38 / U, y: hipY, draw: drawLimb(p, 'leg', side) });
    addCorePart(face, { contentId: 'core-arms', animId: 'arms', label: 'mantle arm', region: 'body', order: 1, side, wU: .29, hU: S * .72 / U, pivot: [.5, .08], x: side * B.shoulderX / U, y: shoulderY, draw: drawLimb(p, 'arm', side) });
  }

  addCorePart(face, { contentId: 'core-collar', animId: 'collar', label: 'paper collar', region: 'body', order: 2, wU: bodyW * .7, hU: .24, x: 0, y: -(B.top + S * .03) / U, draw: drawCollar(p) });
  addCorePart(face, { contentId: 'core-waymark', animId: 'waymark', label: 'route badge', region: 'body', order: 3, wU: .19, hU: .19, x: v.driftSide * bodyW * .14, y: -(B.top + B.h * .42) / U, draw: drawWaymark(p, v) });

  addCorePart(face, { contentId: 'core-hair', animId: 'hair', label: 'moss hair', order: -2, depth: -.18, wU: headW * 1.05, hU: headH * 1.04, x: 0, y: 0, draw: drawHair(p, v) });
  addCorePart(face, { contentId: 'core-head', animId: 'skull', label: 'leaf head', order: 1, wU: headW, hU: headH, x: 0, y: 0, draw: drawHead(p, v) });

  for (const side of [-1, 1]) {
    addCorePart(face, { contentId: 'core-ears', animId: 'ears', label: `${recipe.species} ear`, order: 0, side, depth: -.05, wU: .26, hU: .47, x: side * F.w * .86 / U, y: -S * .12 / U, draw: drawEar(p, recipe.species, side) });
    addCorePart(face, { contentId: 'core-eyes', animId: 'eyes', label: 'glow eye', order: 3, side, depth: .12, states: CORE_STATES.eyes, wU: .22, hU: .18, x: side * F.w * .38 / U + F.turn * .04, y: S * .04 / U, draw: drawEyes(p, side) });
    addCorePart(face, { contentId: 'core-brows', animId: 'brows', label: 'brush brow', order: 4, side, depth: .18, states: CORE_STATES.brows, wU: .27, hU: .14, x: side * F.w * .38 / U + F.turn * .04, y: S * .23 / U, draw: drawBrows(p, side) });
    addCorePart(face, { contentId: 'core-cheek-sprigs', animId: 'cheek-sprigs', label: 'cheek sprig', order: 5, side, depth: .2, wU: .27, hU: .22, x: side * F.w * .57 / U, y: -S * .33 / U, draw: drawSprig(p, side) });
  }

  addCorePart(face, { contentId: 'core-nose', animId: 'nose', label: 'leaf nose', order: 4, depth: .22, wU: .18, hU: .17, x: F.turn * .08, y: -S * .2 / U, draw: drawNose(p) });
  addCorePart(face, { contentId: 'core-mouth', animId: 'mouth', label: 'brush mouth', order: 5, depth: .24, states: CORE_STATES.mouth, wU: .36, hU: .22, x: F.turn * .1, y: -S * .47 / U, draw: drawMouth(p) });
  addCorePart(face, { contentId: 'core-leaf-crown', animId: 'crest', label: 'leaf crown', order: 7, depth: .3, wU: headW * .82, hU: .5, x: 0, y: S * .78 / U, draw: drawCrown(p, v) });

  const near = 1;
  const grip = B.grip(near);
  addCorePart(face, { contentId: 'core-lantern', animId: 'held', label: 'route lantern', region: 'body', order: 2, side: near, wU: .43, hU: .65, pivot: [.5, .08], x: grip[0] / U, y: -grip[1] / U, draw: drawLantern(p, v) });

  const featurePlanes = Object.fromEntries(MOSSLIGHT_CORE_FEATURES.map(id => [id, entries.filter(entry => entry.contentPartId === id).length]));
  face.rendererAudit = Object.freeze({
    rendererId: MOSSLIGHT_CORE_RENDERER_ID,
    independent: true,
    mediaId: MOSSLIGHT_CORE_MEDIA_ID,
    visiblePartPlanes: entries.length,
    authoredPartPlanes: entries.filter(entry => entry.authoredBy === MOSSLIGHT_CORE_RENDERER_ID).length,
    upstreamVisiblePartPlanes: entries.filter(entry => !entry.authoredBy).length,
    featurePlanes
  });
  return face;
}
