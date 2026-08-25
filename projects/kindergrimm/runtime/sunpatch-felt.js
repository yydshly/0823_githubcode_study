import * as THREE from 'three';
import { makePart, U } from '../upstream/src/part.js';
import { makeRng, hashStr } from '../upstream/src/rng.js';
import { visualRecordFingerprint } from './contracts.js';

export const SUNPATCH_FELT_RENDERER_ID = 'sunpatch-felt-2d';
export const SUNPATCH_FELT_MEDIA_ID = 'sunpatch-felt';

export const SUNPATCH_FELT_FEATURES = Object.freeze([
  'felt-shadow',
  'felt-body',
  'felt-belly-patch',
  'felt-arms',
  'felt-feet',
  'felt-scallop-cape',
  'felt-blanket-collar',
  'felt-pocket',
  'felt-thread-aura',
  'felt-head',
  'felt-ears',
  'felt-hair-patch',
  'felt-hood',
  'felt-button-eyes',
  'felt-thread-brows',
  'felt-patch-nose',
  'felt-stitched-mouth',
  'felt-freckle-knots',
  'felt-sun-token',
  'felt-spool-lantern'
]);

export const SUNPATCH_FELT_COVERAGE = Object.freeze({
  head: Object.freeze(['felt-thread-aura', 'felt-head', 'felt-ears', 'felt-hair-patch', 'felt-hood']),
  face: Object.freeze(['felt-button-eyes', 'felt-thread-brows', 'felt-patch-nose', 'felt-stitched-mouth', 'felt-freckle-knots']),
  body: Object.freeze(['felt-shadow', 'felt-body', 'felt-belly-patch']),
  limbs: Object.freeze(['felt-arms', 'felt-feet']),
  clothing: Object.freeze(['felt-scallop-cape', 'felt-blanket-collar', 'felt-pocket']),
  prop: Object.freeze(['felt-sun-token', 'felt-spool-lantern'])
});

const FELT_STATES = Object.freeze({
  eyes: Object.freeze(['open', 'closed', 'left', 'right', 'up', 'down', 'angry', 'scared', 'cry']),
  brows: Object.freeze(['idle', 'angry', 'raised', 'sad']),
  mouth: Object.freeze(['idle', 'open', 'angry', 'scared', 'cry', 'sleep'])
});

function rgba(value, alpha) {
  const raw = String(value || '#000000').replace('#', '');
  const hex = raw.length === 3 ? raw.split('').map(function (char) { return char + char; }).join('') : raw.padEnd(6, '0').slice(0, 6);
  const rgb = [0, 2, 4].map(function (index) { return Number.parseInt(hex.slice(index, index + 2), 16); });
  return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (alpha == null ? 1 : alpha) + ')';
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * .5, height * .5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function feltFill(sketch, path, fill, thread, options) {
  const config = options || {};
  const ctx = sketch.ctx;
  const w = sketch.w;
  const h = sketch.h;
  ctx.save();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.clip();
  const fibers = config.fibers || 28;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(.55, Math.min(w, h) * .008);
  for (let index = 0; index < fibers; index += 1) {
    const x = sketch.jr(w * .04, w * .96);
    const y = sketch.jr(h * .04, h * .96);
    const length = sketch.jr(2, Math.max(3, Math.min(w, h) * .055));
    ctx.strokeStyle = index % 2 ? rgba(thread, .11) : rgba('#ffffff', .09);
    ctx.beginPath();
    ctx.moveTo(x - length * .5, y + sketch.jr(-1, 1));
    ctx.lineTo(x + length * .5, y + sketch.jr(-1, 1));
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  path();
  ctx.strokeStyle = thread;
  ctx.lineWidth = Math.max(1.2, Math.min(w, h) * (config.edgeWidth || .035));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (config.stitch !== false) ctx.setLineDash([Math.max(2, Math.min(w, h) * .045), Math.max(2, Math.min(w, h) * .035)]);
  ctx.stroke();
  ctx.restore();
}

function sunpatchVariant(recipe, renderer) {
  const rng = makeRng(hashStr(recipe.seed + ':' + renderer.fingerprint + ':sunpatch-felt-layout'));
  return {
    stature: Number(rng.r(.94, 1.06).toFixed(4)),
    headRound: Number(rng.r(.92, 1.1).toFixed(4)),
    leanSide: rng.chance(.5) ? -1 : 1,
    bellyShape: rng.pick(['oval', 'heart', 'cloud']),
    hoodNotch: rng.pick(['round', 'leaf', 'split']),
    pocketSide: rng.chance(.5) ? -1 : 1,
    buttonType: rng.pick(['two-hole', 'four-hole', 'cross']),
    stitchSpacing: rng.ri(5, 9),
    tokenGlyph: rng.pick(['sun', 'flower', 'thread', 'star']),
    accentIndex: rng.ri(0, Math.max(0, renderer.palette.accents.length - 1))
  };
}

export function sunpatchFeltVisualRecord(recipe, renderer) {
  if (!renderer || renderer.id !== SUNPATCH_FELT_RENDERER_ID) return null;
  const payload = {
    rendererId: renderer.id,
    rendererVersion: renderer.version,
    rendererFingerprint: renderer.fingerprint,
    baseRenderer: renderer.baseRenderer,
    addedParts: Array.from(renderer.features),
    variant: sunpatchVariant(recipe, renderer)
  };
  return Object.assign({}, payload, { fingerprint: visualRecordFingerprint(recipe, payload) });
}

function drawShadow(palette) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const gradient = ctx.createRadialGradient(w * .5, h * .5, 0, w * .5, h * .5, w * .46);
    gradient.addColorStop(0, rgba(palette.thread, .24));
    gradient.addColorStop(1, rgba(palette.thread, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(w * .5, h * .5, w * .46, h * .3, 0, 0, Math.PI * 2);
    ctx.fill();
  };
}

function drawBody(palette) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      ctx.beginPath();
      ctx.moveTo(w * .3, h * .05);
      ctx.quadraticCurveTo(w * .5, -h * .02, w * .7, h * .05);
      ctx.bezierCurveTo(w * .91, h * .22, w * .88, h * .79, w * .68, h * .93);
      ctx.quadraticCurveTo(w * .5, h * 1.02, w * .31, h * .93);
      ctx.bezierCurveTo(w * .12, h * .78, w * .09, h * .22, w * .3, h * .05);
      ctx.closePath();
    }, palette.denim, palette.thread, { fibers: 38, edgeWidth: .025 });
  };
}

function drawBelly(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      if (variant.bellyShape === 'heart') {
        ctx.beginPath();
        ctx.moveTo(w * .5, h * .9);
        ctx.bezierCurveTo(w * .08, h * .55, w * .16, h * .17, w * .5, h * .38);
        ctx.bezierCurveTo(w * .84, h * .17, w * .92, h * .55, w * .5, h * .9);
        ctx.closePath();
      } else if (variant.bellyShape === 'cloud') {
        ctx.beginPath();
        ctx.moveTo(w * .16, h * .62);
        ctx.bezierCurveTo(w * .05, h * .38, w * .27, h * .22, w * .42, h * .35);
        ctx.bezierCurveTo(w * .55, h * .12, w * .83, h * .24, w * .78, h * .46);
        ctx.bezierCurveTo(w * .98, h * .56, w * .82, h * .83, w * .6, h * .76);
        ctx.bezierCurveTo(w * .42, h * .94, w * .12, h * .82, w * .16, h * .62);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.ellipse(w * .5, h * .54, w * .34, h * .38, 0, 0, Math.PI * 2);
      }
    }, palette.oat, palette.thread, { fibers: 18, edgeWidth: .028 });
  };
}

function drawLimb(palette, kind, side) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      if (kind === 'arm') {
        ctx.beginPath();
        ctx.moveTo(w * .28, h * .04);
        ctx.quadraticCurveTo(w * .68, -h * .02, w * .75, h * .2);
        ctx.lineTo(w * (.65 + side * .06), h * .73);
        ctx.quadraticCurveTo(w * (.84 + side * .04), h * .88, w * .66, h * .97);
        ctx.quadraticCurveTo(w * .38, h * 1.02, w * .3, h * .75);
        ctx.lineTo(w * .2, h * .2);
        ctx.quadraticCurveTo(w * .2, h * .08, w * .28, h * .04);
        ctx.closePath();
      } else {
        roundedRect(ctx, w * .18, h * .04, w * .64, h * .76, w * .25);
        ctx.moveTo(w * .2, h * .69);
        ctx.quadraticCurveTo(w * (.05 + side * .02), h * .78, w * .1, h * .94);
        ctx.quadraticCurveTo(w * .5, h * 1.03, w * .91, h * .92);
        ctx.quadraticCurveTo(w * .95, h * .76, w * .78, h * .69);
        ctx.closePath();
      }
    }, kind === 'arm' ? palette.sage : palette.plum, palette.thread, { fibers: 20, edgeWidth: .035 });
  };
}

function drawCape(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      ctx.beginPath();
      ctx.moveTo(w * .18, h * .1);
      ctx.quadraticCurveTo(w * .5, -h * .03, w * .82, h * .1);
      ctx.lineTo(w * .9, h * .65);
      const count = 5;
      for (let index = 0; index <= count; index += 1) {
        const x = w * (.9 - index * .8 / count);
        const y = h * (.7 + (index % 2 ? .18 : .04));
        ctx.quadraticCurveTo(x - w * .08, y + h * .08, x - w * .16, y);
      }
      ctx.closePath();
    }, palette.tomato, palette.thread, { fibers: 34, edgeWidth: .024 });
    ctx.fillStyle = palette.sunflower;
    ctx.beginPath();
    ctx.arc(w * (.5 + variant.leanSide * .16), h * .18, Math.max(2, w * .035), 0, Math.PI * 2);
    ctx.fill();
  };
}

function drawCollar(palette) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      ctx.beginPath();
      ctx.moveTo(w * .06, h * .25);
      ctx.quadraticCurveTo(w * .22, h * .05, w * .5, h * .48);
      ctx.quadraticCurveTo(w * .78, h * .05, w * .94, h * .25);
      ctx.quadraticCurveTo(w * .8, h * .78, w * .5, h * .6);
      ctx.quadraticCurveTo(w * .2, h * .78, w * .06, h * .25);
      ctx.closePath();
    }, palette.oat, palette.thread, { fibers: 14, edgeWidth: .04 });
  };
}

function drawPocket(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      roundedRect(ctx, w * .12, h * .12, w * .76, h * .72, w * .14);
    }, palette.sunflower, palette.thread, { fibers: 14, edgeWidth: .045 });
    ctx.strokeStyle = palette.thread;
    ctx.lineWidth = Math.max(1, w * .035);
    ctx.beginPath();
    ctx.moveTo(w * .24, h * .34);
    ctx.quadraticCurveTo(w * .5, h * (.48 + variant.pocketSide * .03), w * .76, h * .34);
    ctx.stroke();
  };
}

function drawAura(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    ctx.save();
    ctx.strokeStyle = rgba(palette.sunflower, .66);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, w * .012);
    ctx.setLineDash([variant.stitchSpacing, variant.stitchSpacing * .75]);
    ctx.beginPath();
    ctx.ellipse(w * .5, h * .54, w * .39, h * .4, variant.leanSide * .08, Math.PI * .08, Math.PI * 1.92);
    ctx.stroke();
    ctx.restore();
  };
}

function drawHead(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      ctx.beginPath();
      ctx.moveTo(w * .21, h * .2);
      ctx.bezierCurveTo(w * .34, -h * .02, w * .72, 0, w * .82, h * .22);
      ctx.bezierCurveTo(w * .98, h * .48, w * .82, h * .86, w * .57, h * .94);
      ctx.bezierCurveTo(w * .28, h * 1.02, w * .04, h * .72, w * .13, h * .4);
      ctx.quadraticCurveTo(w * .12, h * .27, w * .21, h * .2);
      ctx.closePath();
    }, palette.oat, palette.thread, { fibers: 44, edgeWidth: .02 });
    ctx.fillStyle = rgba(palette.tomato, .12);
    ctx.beginPath();
    ctx.ellipse(w * (.5 + variant.leanSide * .07), h * .66, w * .3, h * .17, 0, 0, Math.PI * 2);
    ctx.fill();
  };
}

function drawEar(palette, species, side) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      if (species === 'cat') {
        ctx.beginPath();
        ctx.moveTo(w * .18, h * .86);
        ctx.quadraticCurveTo(w * .3, h * .18, w * .58, h * .06);
        ctx.quadraticCurveTo(w * .91, h * .42, w * .77, h * .9);
        ctx.closePath();
      } else if (species === 'dog') {
        ctx.beginPath();
        ctx.moveTo(w * .22, h * .08);
        ctx.quadraticCurveTo(w * .88, h * .02, w * .78, h * .55);
        ctx.quadraticCurveTo(w * .72, h * .98, w * .32, h * .89);
        ctx.quadraticCurveTo(w * .08, h * .55, w * .22, h * .08);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.ellipse(w * .5, h * .53, w * .32, h * .42, side * .12, 0, Math.PI * 2);
      }
    }, palette.sage, palette.thread, { fibers: 14, edgeWidth: .04 });
  };
}

function drawHair(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      ctx.beginPath();
      ctx.moveTo(w * .12, h * .62);
      ctx.quadraticCurveTo(w * .12, h * .2, w * .34, h * .18);
      ctx.quadraticCurveTo(w * .48, -h * .02, w * .62, h * .18);
      ctx.quadraticCurveTo(w * .88, h * .14, w * .9, h * .58);
      ctx.quadraticCurveTo(w * .73, h * .46, w * .62, h * .7);
      ctx.quadraticCurveTo(w * .47, h * .46, w * .34, h * .71);
      ctx.quadraticCurveTo(w * .22, h * .48, w * .12, h * .62);
      ctx.closePath();
    }, variant.leanSide > 0 ? palette.plum : palette.denim, palette.thread, { fibers: 24, edgeWidth: .025 });
  };
}

function drawHood(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      ctx.beginPath();
      ctx.moveTo(w * .12, h * .76);
      ctx.bezierCurveTo(w * .12, h * .14, w * .34, h * .02, w * .5, h * .03);
      ctx.bezierCurveTo(w * .72, h * .01, w * .9, h * .22, w * .88, h * .76);
      ctx.lineTo(w * .73, h * .63);
      if (variant.hoodNotch === 'split') {
        ctx.lineTo(w * .56, h * .7);
        ctx.lineTo(w * .5, h * .58);
        ctx.lineTo(w * .44, h * .7);
      } else if (variant.hoodNotch === 'leaf') {
        ctx.quadraticCurveTo(w * .5, h * .49, w * .27, h * .63);
      } else {
        ctx.quadraticCurveTo(w * .5, h * .5, w * .27, h * .63);
      }
      ctx.closePath();
    }, palette.tomato, palette.thread, { fibers: 30, edgeWidth: .022 });
  };
}

function drawEye(palette, variant) {
  return function (sketch, state) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const st = state || 'open';
    if (st === 'closed' || st === 'sleep') {
      ctx.strokeStyle = palette.thread;
      ctx.lineWidth = Math.max(1.5, w * .08);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * .2, h * .52);
      ctx.quadraticCurveTo(w * .5, h * .7, w * .8, h * .52);
      ctx.stroke();
      return;
    }
    const shifts = { left: [-.1, 0], right: [.1, 0], up: [0, -.1], down: [0, .1], scared: [0, -.04], cry: [0, .04] };
    const shift = shifts[st] || [0, 0];
    const radius = st === 'scared' ? w * .29 : w * .25;
    ctx.fillStyle = palette.plum;
    ctx.strokeStyle = palette.thread;
    ctx.lineWidth = Math.max(1.4, w * .055);
    ctx.beginPath();
    ctx.arc(w * (.5 + shift[0]), h * (.5 + shift[1]), radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = palette.oat;
    const holes = variant.buttonType === 'two-hole'
      ? [[-.08, 0], [.08, 0]]
      : [[-.08, -.08], [.08, -.08], [-.08, .08], [.08, .08]];
    holes.forEach(function (point) {
      ctx.beginPath();
      ctx.arc(w * (.5 + point[0]), h * (.5 + point[1]), Math.max(1, w * .032), 0, Math.PI * 2);
      ctx.fill();
    });
    if (variant.buttonType === 'cross') {
      ctx.strokeStyle = palette.sunflower;
      ctx.lineWidth = Math.max(1, w * .035);
      ctx.beginPath();
      ctx.moveTo(w * .36, h * .36); ctx.lineTo(w * .64, h * .64);
      ctx.moveTo(w * .64, h * .36); ctx.lineTo(w * .36, h * .64);
      ctx.stroke();
    }
  };
}

function drawBrow(palette, side) {
  return function (sketch, state) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const st = state || 'idle';
    let left = .16;
    let right = .84;
    let y0 = .58;
    let y1 = .46;
    if (st === 'angry') { y0 = side < 0 ? .35 : .65; y1 = side < 0 ? .65 : .35; }
    if (st === 'sad') { y0 = side < 0 ? .68 : .42; y1 = side < 0 ? .42 : .68; }
    if (st === 'raised') { y0 -= .18; y1 -= .18; }
    ctx.strokeStyle = palette.thread;
    ctx.lineWidth = Math.max(1.2, w * .065);
    ctx.lineCap = 'round';
    ctx.setLineDash([Math.max(2, w * .12), Math.max(1, w * .06)]);
    ctx.beginPath();
    ctx.moveTo(w * left, h * y0);
    ctx.quadraticCurveTo(w * .5, h * .28, w * right, h * y1);
    ctx.stroke();
  };
}

function drawNose(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      ctx.beginPath();
      if (variant.hoodNotch === 'leaf') {
        ctx.moveTo(w * .5, h * .08);
        ctx.quadraticCurveTo(w * .92, h * .44, w * .5, h * .92);
        ctx.quadraticCurveTo(w * .08, h * .44, w * .5, h * .08);
      } else {
        ctx.moveTo(w * .5, h * .1);
        ctx.lineTo(w * .87, h * .76);
        ctx.quadraticCurveTo(w * .5, h * .94, w * .13, h * .76);
        ctx.closePath();
      }
    }, palette.tomato, palette.thread, { fibers: 8, edgeWidth: .055 });
  };
}

function drawMouth(palette) {
  return function (sketch, state) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const st = state || 'idle';
    ctx.strokeStyle = palette.thread;
    ctx.lineWidth = Math.max(1.2, w * .055);
    ctx.lineCap = 'round';
    ctx.setLineDash([Math.max(2, w * .08), Math.max(1, w * .05)]);
    ctx.beginPath();
    if (st === 'open' || st === 'scared' || st === 'cry') {
      ctx.ellipse(w * .5, h * .52, w * (st === 'scared' ? .18 : .24), h * .23, 0, 0, Math.PI * 2);
    } else if (st === 'angry') {
      ctx.moveTo(w * .18, h * .68); ctx.lineTo(w * .82, h * .34);
    } else if (st === 'sleep') {
      ctx.moveTo(w * .26, h * .52); ctx.lineTo(w * .74, h * .52);
    } else {
      ctx.moveTo(w * .16, h * .4);
      ctx.quadraticCurveTo(w * .5, h * .76, w * .84, h * .4);
    }
    ctx.stroke();
  };
}

function drawFreckles(palette, side) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    ctx.fillStyle = palette.sunflower;
    [[.25, .38], [.52, .58], [.75, .34]].forEach(function (point, index) {
      ctx.beginPath();
      ctx.arc(w * point[0], h * point[1], Math.max(1.2, w * (.035 + index * .005)), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = palette.thread;
      ctx.lineWidth = Math.max(.7, w * .018);
      ctx.stroke();
    });
  };
}

function drawToken(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    feltFill(sketch, function () {
      ctx.beginPath();
      ctx.arc(w * .5, h * .5, w * .39, 0, Math.PI * 2);
    }, palette.sunflower, palette.thread, { fibers: 12, edgeWidth: .05 });
    ctx.strokeStyle = variant.accentIndex % 2 ? palette.tomato : palette.plum;
    ctx.lineWidth = Math.max(1.2, w * .055);
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (variant.tokenGlyph === 'thread') {
      ctx.moveTo(w * .27, h * .64);
      ctx.bezierCurveTo(w * .2, h * .2, w * .76, h * .2, w * .7, h * .68);
    } else if (variant.tokenGlyph === 'star') {
      ctx.moveTo(w * .5, h * .2); ctx.lineTo(w * .58, h * .42); ctx.lineTo(w * .8, h * .5); ctx.lineTo(w * .58, h * .58); ctx.lineTo(w * .5, h * .8); ctx.lineTo(w * .42, h * .58); ctx.lineTo(w * .2, h * .5); ctx.lineTo(w * .42, h * .42); ctx.closePath();
    } else {
      ctx.arc(w * .5, h * .5, w * .16, 0, Math.PI * 2);
    }
    ctx.stroke();
  };
}

function drawLantern(palette, variant) {
  return function (sketch) {
    const ctx = sketch.ctx;
    const w = sketch.w;
    const h = sketch.h;
    const glow = ctx.createRadialGradient(w * .5, h * .58, 0, w * .5, h * .58, w * .48);
    glow.addColorStop(0, rgba(palette.sunflower, .62));
    glow.addColorStop(1, rgba(palette.sunflower, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, h * .12, w, h * .84);
    feltFill(sketch, function () {
      roundedRect(ctx, w * .22, h * .28, w * .56, h * .58, w * .14);
    }, palette.sage, palette.thread, { fibers: 16, edgeWidth: .045 });
    ctx.strokeStyle = palette.thread;
    ctx.lineWidth = Math.max(1.2, w * .045);
    ctx.beginPath();
    ctx.moveTo(w * .3, h * .32);
    ctx.quadraticCurveTo(w * .5, h * .03, w * .7, h * .32);
    ctx.stroke();
    ctx.strokeStyle = palette.sunflower;
    ctx.setLineDash([variant.stitchSpacing, variant.stitchSpacing * .7]);
    ctx.beginPath();
    ctx.moveTo(w * .33, h * .52); ctx.lineTo(w * .67, h * .52);
    ctx.moveTo(w * .33, h * .67); ctx.lineTo(w * .67, h * .67);
    ctx.stroke();
  };
}

function buildFeltLayout(recipe, visual) {
  const variant = visual.variant;
  const scale = U * .4 * variant.stature;
  const headWidth = scale * .76 * variant.headRound;
  const bodyTop = scale * .43;
  const bodyHeight = scale * .84;
  const legLength = scale * .34;
  const floorY = bodyTop + bodyHeight + legLength;
  const halfWidth = headWidth * .72;
  const turn = variant.leanSide * .1;
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
    media: { id: SUNPATCH_FELT_MEDIA_ID },
    L: { skullTop: [0, -scale * .71], hatX: turn * headWidth * .14, hatY: -scale * .75 },
    B: {
      quad: false,
      sit: false,
      dir: variant.leanSide,
      cx: 0,
      top: bodyTop,
      bot: bodyTop + bodyHeight,
      h: bodyHeight,
      halfW: halfWidth,
      shoulderY: bodyTop + bodyHeight * .2,
      shoulderX: halfWidth * .92,
      hipY: bodyTop + bodyHeight * .78,
      hipX: halfWidth * .48,
      floorY: floorY,
      gripR: scale * .075,
      grip: function (side) { return [side * halfWidth * 1.25, bodyTop + bodyHeight * .58]; }
    }
  };
}

function addFeltPart(face, spec) {
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

export function buildSunpatchFeltCharacter(recipe, renderer) {
  const visual = sunpatchFeltVisualRecord(recipe, renderer);
  if (!visual) throw new Error('Unsupported Sunpatch renderer: ' + (renderer && renderer.id || 'missing'));
  const layout = buildFeltLayout(recipe, visual);
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
  const headW = layout.w * 2.62 / U;
  const headH = scale * 1.52 / U;
  const bodyW = body.halfW * 2.76 / U;
  const bodyH = body.h * 1.14 / U;
  const shoulderY = -body.shoulderY / U;
  const hipY = -body.hipY / U;

  addFeltPart(face, { contentId: 'felt-shadow', animId: 'shadow', label: 'soft felt contact shadow', region: 'body', order: -6, wU: bodyW * 1.2, hU: .24, x: 0, y: -body.floorY / U + .04, draw: drawShadow(palette) });
  addFeltPart(face, { contentId: 'felt-body', animId: 'torso', label: 'rounded felt body', region: 'body', order: -2, wU: bodyW, hU: bodyH, x: 0, y: -(body.top + body.h * .5) / U, draw: drawBody(palette) });
  addFeltPart(face, { contentId: 'felt-scallop-cape', animId: 'mantle', label: 'scalloped applique cape', region: 'body', order: -1, wU: bodyW * 1.18, hU: bodyH * .9, x: 0, y: -(body.top + body.h * .46) / U, draw: drawCape(palette, variant) });
  addFeltPart(face, { contentId: 'felt-belly-patch', animId: 'belly', label: 'belly applique patch', region: 'body', order: 1, wU: bodyW * .58, hU: bodyH * .58, x: 0, y: -(body.top + body.h * .55) / U, draw: drawBelly(palette, variant) });

  [-1, 1].forEach(function (side) {
    addFeltPart(face, { contentId: 'felt-feet', animId: 'legs', label: 'soft felt foot', region: 'body', order: -3, side: side, wU: .31, hU: scale * .48 / U, pivot: [.5, .06], x: side * body.hipX / U, y: hipY, draw: drawLimb(palette, 'foot', side) });
    addFeltPart(face, { contentId: 'felt-arms', animId: 'arms', label: 'soft felt arm', region: 'body', order: 2, side: side, wU: .32, hU: scale * .66 / U, pivot: [.5, .06], x: side * body.shoulderX / U, y: shoulderY, draw: drawLimb(palette, 'arm', side) });
  });

  addFeltPart(face, { contentId: 'felt-blanket-collar', animId: 'collar', label: 'blanket stitch collar', region: 'body', order: 3, wU: bodyW * .68, hU: .24, x: 0, y: -(body.top + scale * .015) / U, draw: drawCollar(palette) });
  addFeltPart(face, { contentId: 'felt-pocket', animId: 'pocket', label: 'utility patch pocket', region: 'body', order: 4, wU: .22, hU: .23, x: variant.pocketSide * body.halfW * .43 / U, y: -(body.top + body.h * .55) / U, draw: drawPocket(palette, variant) });
  addFeltPart(face, { contentId: 'felt-sun-token', animId: 'waymark', label: 'sunpatch token', region: 'body', order: 5, wU: .18, hU: .18, x: -variant.pocketSide * body.halfW * .38 / U, y: -(body.top + body.h * .37) / U, draw: drawToken(palette, variant) });

  addFeltPart(face, { contentId: 'felt-thread-aura', animId: 'thread-aura', label: 'loose thread aura', order: -5, depth: -.38, wU: headW * 1.22, hU: headH * 1.18, x: 0, y: 0, draw: drawAura(palette, variant) });
  addFeltPart(face, { contentId: 'felt-hair-patch', animId: 'hair', label: 'scalloped hair patch', order: -2, depth: -.16, wU: headW * .98, hU: headH * .86, x: 0, y: .02, draw: drawHair(palette, variant) });
  addFeltPart(face, { contentId: 'felt-head', animId: 'skull', label: 'rounded felt head', order: 0, wU: headW, hU: headH, x: 0, y: 0, draw: drawHead(palette, variant) });

  [-1, 1].forEach(function (side) {
    addFeltPart(face, { contentId: 'felt-ears', animId: 'ears', label: recipe.species + ' felt ear', order: -1, side: side, depth: -.08, wU: .28, hU: .42, x: side * layout.w * .96 / U, y: -scale * .03 / U, draw: drawEar(palette, recipe.species, side) });
    addFeltPart(face, { contentId: 'felt-button-eyes', animId: 'eyes', label: 'button eye', order: 3, side: side, depth: .12, states: FELT_STATES.eyes, wU: .2, hU: .18, x: side * layout.w * .38 / U + layout.turn * .03, y: scale * .01 / U, draw: drawEye(palette, variant) });
    addFeltPart(face, { contentId: 'felt-thread-brows', animId: 'brows', label: 'thread brow', order: 4, side: side, depth: .18, states: FELT_STATES.brows, wU: .25, hU: .13, x: side * layout.w * .39 / U + layout.turn * .03, y: scale * .2 / U, draw: drawBrow(palette, side) });
    addFeltPart(face, { contentId: 'felt-freckle-knots', animId: 'cheek-knots', label: 'freckle knots', order: 5, side: side, depth: .2, wU: .22, hU: .17, x: side * layout.w * .57 / U, y: -scale * .29 / U, draw: drawFreckles(palette, side) });
  });

  addFeltPart(face, { contentId: 'felt-patch-nose', animId: 'nose', label: 'felt patch nose', order: 4, depth: .22, wU: .15, hU: .15, x: layout.turn * .05, y: -scale * .16 / U, draw: drawNose(palette, variant) });
  addFeltPart(face, { contentId: 'felt-stitched-mouth', animId: 'mouth', label: 'stitched mouth', order: 5, depth: .24, states: FELT_STATES.mouth, wU: .32, hU: .19, x: layout.turn * .05, y: -scale * .39 / U, draw: drawMouth(palette) });
  addFeltPart(face, { contentId: 'felt-hood', animId: 'crest', label: 'rounded felt hood', order: 7, depth: .31, wU: headW * .94, hU: .48, x: 0, y: scale * .64 / U, draw: drawHood(palette, variant) });

  const grip = body.grip(1);
  addFeltPart(face, { contentId: 'felt-spool-lantern', animId: 'held', label: 'spool lantern', region: 'body', order: 3, side: 1, wU: .42, hU: .6, pivot: [.5, .08], x: grip[0] / U, y: -grip[1] / U, draw: drawLantern(palette, variant) });

  const featurePlanes = Object.fromEntries(SUNPATCH_FELT_FEATURES.map(function (id) {
    return [id, entries.filter(function (entry) { return entry.contentPartId === id; }).length];
  }));
  face.rendererAudit = Object.freeze({
    rendererId: SUNPATCH_FELT_RENDERER_ID,
    independent: true,
    mediaId: SUNPATCH_FELT_MEDIA_ID,
    visiblePartPlanes: entries.length,
    authoredPartPlanes: entries.filter(function (entry) { return entry.authoredBy === SUNPATCH_FELT_RENDERER_ID; }).length,
    upstreamVisiblePartPlanes: entries.filter(function (entry) { return !entry.authoredBy; }).length,
    featurePlanes: featurePlanes
  });
  return face;
}
