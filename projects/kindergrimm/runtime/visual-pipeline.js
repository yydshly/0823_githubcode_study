import * as THREE from 'three';
import { buildCharacter } from '../upstream/src/rig.js';
import { makePart, U } from '../upstream/src/part.js';
import { makeRng, hashStr } from '../upstream/src/rng.js';
import { getContentPack } from './content-packs.js';
import { mosslightV06Variant, mosslightV06Specs } from './mosslight-kit.js';
import {
  hasStyleRenderer,
  styleVisualRecord,
  buildStyleCharacter
} from './style-renderers.js';

export const BASE_RENDERER_ID = 'kindergrimm-drawn-2d';
export const MOSSLIGHT_RENDERER_ID = 'mosslight-canvas-decorator';

const VISUAL_PARTS = Object.freeze([
  'mosslight-halo',
  'mosslight-waymark',
  'mosslight-fireflies'
]);

const hexRgb = value => {
  const hex = String(value || '#000000').replace('#', '');
  const full = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map(index => Number.parseInt(full.slice(index, index + 2), 16));
};

const rgba = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

export function hasContentVisual(rawPack) {
  const id = getContentPack(rawPack).visual?.id;
  return id === MOSSLIGHT_RENDERER_ID || hasStyleRenderer(id);
}

export function contentVisualRecord(recipe, rawPack) {
  const pack = getContentPack(rawPack);
  const visual = pack.visual;
  if (hasStyleRenderer(visual)) return styleVisualRecord(recipe, visual);
  if (!visual || visual.id !== MOSSLIGHT_RENDERER_ID) return null;

  const rng = makeRng(hashStr(`${recipe.seed}:${visual.fingerprint}:mosslight-visual`));
  const variant = {
    paletteIndex: rng.ri(0, Math.max(0, visual.palette.accents.length - 1)),
    haloLeaves: rng.ri(7, 11),
    waymark: rng.pick(['branch', 'lamp', 'north', 'path']),
    fireflies: rng.ri(3, 5),
    driftSide: rng.chance(.5) ? -1 : 1
  };
  if (visual.version !== '0.1.0') Object.assign(variant, mosslightV06Variant(rng));
  const payload = {
    rendererId: visual.id,
    rendererVersion: visual.version,
    rendererFingerprint: visual.fingerprint,
    baseRenderer: visual.baseRenderer,
    addedParts: Array.isArray(visual.features) && visual.features.length ? [...visual.features] : [...VISUAL_PARTS],
    variant
  };
  return {
    ...payload,
    fingerprint: hashStr(JSON.stringify({ recipe, ...payload })).toString(16).padStart(8, '0')
  };
}

function addVisualPart(face, record, spec) {
  const part = makePart({
    name: spec.id,
    wU: spec.wU,
    hU: spec.hU,
    pivot: [.5, .5],
    states: ['idle'],
    seed: `${face.recipe.seed}:${record.rendererFingerprint}:${spec.id}`,
    draw: spec.draw
  });
  part.mesh.renderOrder = spec.order;
  part.mesh.position.z = spec.order * .001;
  part.mesh.userData.partId = spec.id;
  part.mesh.userData.contentRenderer = record.rendererId;

  const bone = new THREE.Group();
  bone.position.set(spec.x, spec.y, 0);
  bone.userData.base = { x: spec.x, y: spec.y };
  bone.add(part.mesh);
  (spec.region === 'body' ? face.bodyGroup : face.headGroup).add(bone);

  face.entries.push({
    id: spec.id,
    def: { id: spec.id, label: spec.label },
    bone,
    part,
    order: spec.order,
    side: spec.side ?? 1,
    depth: spec.depth ?? 0,
    region: spec.region ?? 'head',
    authoredBy: record.rendererId
  });
}

function drawHalo(palette, record) {
  const foliage = hexRgb(palette.foliage);
  const glow = hexRgb(palette.glow);
  return sketch => {
    const { ctx, w, h } = sketch;
    const cx = w * .5;
    const cy = h * .53;
    const rx = w * .39;
    const ry = h * .41;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.2, w * .012);
    ctx.strokeStyle = rgba(foliage, .48);
    ctx.setLineDash([w * .035, w * .024]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, -.08 * record.variant.driftSide, Math.PI * .12, Math.PI * 1.9);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let index = 0; index < record.variant.haloLeaves; index++) {
      const t = index / Math.max(1, record.variant.haloLeaves - 1);
      const angle = Math.PI * (.18 + t * 1.55);
      const x = cx + Math.cos(angle) * rx + sketch.jr(-2, 2);
      const y = cy + Math.sin(angle) * ry + sketch.jr(-2, 2);
      const leafW = Math.max(3, w * sketch.jr(.025, .045));
      const leafH = leafW * sketch.jr(.42, .62);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI * .5 + sketch.jr(-.25, .25));
      ctx.fillStyle = rgba(foliage, sketch.jr(.3, .56));
      ctx.beginPath();
      ctx.ellipse(0, 0, leafW, leafH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = rgba(glow, .58);
    for (const angle of [Math.PI * .16, Math.PI * .92, Math.PI * 1.72]) {
      const x = cx + Math.cos(angle) * rx;
      const y = cy + Math.sin(angle) * ry;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, w * .012), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
}

function drawWaymark(palette, record) {
  const foliage = hexRgb(palette.foliage);
  const glow = hexRgb(palette.glow);
  const paper = hexRgb(palette.paper);
  return sketch => {
    const { ctx, w, h } = sketch;
    const cx = w * .5;
    const cy = h * .5;
    const radius = Math.min(w, h) * .3;
    ctx.save();
    ctx.translate(sketch.jr(-1.2, 1.2), sketch.jr(-1.2, 1.2));
    ctx.fillStyle = rgba(paper, .94);
    ctx.strokeStyle = rgba(foliage, .9);
    ctx.lineWidth = Math.max(1.5, radius * .15);
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx + radius * .82, cy);
    ctx.lineTo(cx, cy + radius);
    ctx.lineTo(cx - radius * .82, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = rgba(glow, .98);
    ctx.fillStyle = rgba(glow, .9);
    ctx.lineWidth = Math.max(1.2, radius * .12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (record.variant.waymark === 'branch') {
      ctx.moveTo(cx, cy + radius * .48); ctx.lineTo(cx, cy - radius * .5);
      ctx.moveTo(cx, cy - radius * .05); ctx.lineTo(cx - radius * .38, cy - radius * .3);
      ctx.moveTo(cx, cy + radius * .15); ctx.lineTo(cx + radius * .4, cy - radius * .1);
    } else if (record.variant.waymark === 'lamp') {
      ctx.rect(cx - radius * .3, cy - radius * .28, radius * .6, radius * .62);
      ctx.moveTo(cx - radius * .18, cy - radius * .3); ctx.quadraticCurveTo(cx, cy - radius * .68, cx + radius * .18, cy - radius * .3);
    } else if (record.variant.waymark === 'north') {
      ctx.moveTo(cx, cy - radius * .55); ctx.lineTo(cx + radius * .27, cy + radius * .38); ctx.lineTo(cx, cy + radius * .18); ctx.lineTo(cx - radius * .27, cy + radius * .38); ctx.closePath();
    } else {
      ctx.moveTo(cx - radius * .5, cy + radius * .3); ctx.quadraticCurveTo(cx - radius * .1, cy - radius * .5, cx + radius * .5, cy + radius * .18);
    }
    ctx.stroke();
    if (record.variant.waymark === 'lamp') {
      ctx.beginPath(); ctx.arc(cx, cy + radius * .02, radius * .13, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };
}

function drawFireflies(palette, record) {
  const glow = hexRgb(palette.glow);
  const accent = hexRgb(palette.accents[record.variant.paletteIndex] || palette.foliage);
  const anchors = [
    [.18, .3], [.8, .22], [.88, .58], [.15, .7], [.67, .82]
  ];
  return sketch => {
    const { ctx, w, h } = sketch;
    for (let index = 0; index < record.variant.fireflies; index++) {
      const anchor = anchors[index];
      const x = w * (record.variant.driftSide < 0 ? 1 - anchor[0] : anchor[0]) + sketch.jr(-2.5, 2.5);
      const y = h * anchor[1] + sketch.jr(-2.5, 2.5);
      const radius = Math.max(2.5, Math.min(w, h) * sketch.jr(.025, .04));
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.6);
      gradient.addColorStop(0, rgba(glow, .98));
      gradient.addColorStop(.32, rgba(accent, .52));
      gradient.addColorStop(1, rgba(glow, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(glow, .96);
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.2, radius * .42), 0, Math.PI * 2);
      ctx.fill();
    }
  };
}

export function applyContentVisuals(face, rawPack) {
  const pack = getContentPack(rawPack);
  const record = contentVisualRecord(face.recipe, pack);
  if (!record) {
    face.visual = null;
    return face;
  }

  const palette = pack.visual.palette;
  const F = face.F;
  const top = Math.min(-F.s * 1.08, F.L.skullTop[1] - F.s * .18);
  const bottom = F.B.floorY + F.s * .14;
  const centerY = (top + bottom) * .5;
  const fullHeight = bottom - top;
  const fullWidth = Math.max(F.w * 2.7, F.B.halfW * (F.B.quad ? 3.2 : 2.7), F.s * 1.7);

  addVisualPart(face, record, {
    id: VISUAL_PARTS[0], label: 'moss halo', region: 'body', order: -4, depth: -.42,
    wU: fullWidth / U, hU: fullHeight / U,
    x: (F.B.quad ? F.B.cx * .18 : 0) / U, y: -centerY / U,
    draw: drawHalo(palette, record)
  });

  const badgeSize = Math.max(F.s * .32, 18);
  const badgeX = F.B.quad ? F.B.cx - F.B.dir * F.B.halfW * .18 : F.B.halfW * .22 * record.variant.driftSide;
  const badgeY = F.B.top + F.B.h * .47;
  addVisualPart(face, record, {
    id: VISUAL_PARTS[1], label: 'waymark badge', region: 'body', order: 0, depth: .02,
    wU: badgeSize / U, hU: badgeSize / U,
    x: badgeX / U, y: -badgeY / U,
    draw: drawWaymark(palette, record)
  });

  const lightWidth = Math.max(F.w * 2.55, F.s * 1.85);
  const lightHeight = F.s * 1.95;
  addVisualPart(face, record, {
    id: VISUAL_PARTS[2], label: 'firefly lights', region: 'head', order: 7, depth: .34,
    wU: lightWidth / U, hU: lightHeight / U,
    x: F.turn * F.w * .08 / U, y: F.s * .04 / U,
    draw: drawFireflies(palette, record)
  });

  for (const spec of mosslightV06Specs(face, record, palette)) {
    if (record.addedParts.includes(spec.id)) addVisualPart(face, record, spec);
  }

  face.visual = record;
  return face;
}

export function buildContentCharacter(recipe, rawPack) {
  const pack = getContentPack(rawPack);
  if (hasStyleRenderer(pack.visual)) return buildStyleCharacter(recipe, pack.visual);
  return applyContentVisuals(buildCharacter(recipe), pack);
}
