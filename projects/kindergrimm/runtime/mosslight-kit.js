import { U } from '../upstream/src/part.js';

export const MOSSLIGHT_V06_FEATURES = Object.freeze([
  'mosslight-halo',
  'mosslight-waymark',
  'mosslight-fireflies',
  'mosslight-ground-bloom',
  'mosslight-leaf-crown',
  'mosslight-mantle',
  'mosslight-cheek-sprigs',
  'mosslight-eye-glints',
  'mosslight-seed-charm',
  'mosslight-route-ribbons',
  'mosslight-moss-footing',
  'mosslight-paper-flecks'
]);

export const MOSSLIGHT_V06_EXTRA_PARTS = Object.freeze(MOSSLIGHT_V06_FEATURES.slice(3));

const hexRgb = value => {
  const hex = String(value || '#000000').replace('#', '');
  const full = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex.padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map(index => Number.parseInt(full.slice(index, index + 2), 16));
};

const rgba = (rgb, alpha) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

export function mosslightV06Variant(rng) {
  return {
    crownLeaves: rng.ri(4, 7),
    mantleStyle: rng.pick(['petal', 'fern', 'fold']),
    sprigSide: rng.chance(.5) ? -1 : 1,
    glintShape: rng.pick(['dot', 'star', 'slit']),
    charmShape: rng.pick(['seed', 'moon', 'lamp']),
    groundTufts: rng.ri(4, 7),
    ribbonCount: rng.ri(2, 4),
    footingClusters: rng.ri(3, 5),
    paperFlecks: rng.ri(16, 24)
  };
}

function drawGroundBloom(palette, record) {
  const foliage = hexRgb(palette.foliage);
  const shadow = hexRgb(palette.shadow || '#223a2d');
  const glow = hexRgb(palette.glow);
  return sketch => {
    const { ctx, w, h } = sketch;
    const cx = w * .5;
    const floor = h * .7;
    const gradient = ctx.createRadialGradient(cx, floor, 0, cx, floor, w * .45);
    gradient.addColorStop(0, rgba(shadow, .34));
    gradient.addColorStop(.56, rgba(foliage, .18));
    gradient.addColorStop(1, rgba(foliage, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(cx, floor, w * .46, h * .24, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'round';
    for (let index = 0; index < record.variant.groundTufts; index++) {
      const t = record.variant.groundTufts === 1 ? .5 : index / (record.variant.groundTufts - 1);
      const x = w * (.18 + t * .64) + sketch.jr(-3, 3);
      const y = floor + sketch.jr(-1, 4);
      const height = h * sketch.jr(.12, .25);
      ctx.strokeStyle = rgba(foliage, sketch.jr(.38, .68));
      ctx.lineWidth = Math.max(1.2, w * .01);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + sketch.jr(-7, 7), y - height * .55, x + sketch.jr(-9, 9), y - height);
      ctx.stroke();
      if (index % 2 === 0) {
        ctx.fillStyle = rgba(glow, .55);
        ctx.beginPath();
        ctx.arc(x + sketch.jr(-8, 8), y - height, Math.max(1.3, w * .012), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };
}

function drawLeafCrown(palette, record) {
  const foliage = hexRgb(palette.foliage);
  const glow = hexRgb(palette.glow);
  const accent = hexRgb(palette.accents[record.variant.paletteIndex] || palette.foliage);
  return sketch => {
    const { ctx, w, h } = sketch;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(foliage, .76);
    ctx.lineWidth = Math.max(1.3, w * .012);
    ctx.beginPath();
    ctx.moveTo(w * .18, h * .7);
    ctx.quadraticCurveTo(w * .5, h * .18, w * .82, h * .7);
    ctx.stroke();
    for (let index = 0; index < record.variant.crownLeaves; index++) {
      const t = (index + .5) / record.variant.crownLeaves;
      const x = w * (.18 + t * .64);
      const arch = 1 - Math.pow((t - .5) * 2, 2);
      const y = h * (.69 - arch * .43) + sketch.jr(-1.5, 1.5);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sketch.jr(-.8, .8));
      ctx.fillStyle = rgba(index % 3 === 0 ? accent : foliage, sketch.jr(.45, .76));
      ctx.beginPath();
      ctx.ellipse(0, 0, w * sketch.jr(.025, .04), h * sketch.jr(.08, .13), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = rgba(glow, .86);
    ctx.beginPath();
    ctx.arc(w * .5, h * .22, Math.max(1.5, w * .014), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
}

function drawMantle(palette, record) {
  const foliage = hexRgb(palette.foliage);
  const paper = hexRgb(palette.paper);
  const accent = hexRgb(palette.accents[record.variant.paletteIndex] || palette.glow);
  return sketch => {
    const { ctx, w, h } = sketch;
    const cx = w * .5;
    const top = h * .2;
    const bottom = h * .86;
    ctx.save();
    ctx.fillStyle = rgba(paper, .52);
    ctx.strokeStyle = rgba(foliage, .72);
    ctx.lineWidth = Math.max(1.2, w * .012);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (record.variant.mantleStyle === 'fern') {
      ctx.moveTo(cx, top);
      ctx.quadraticCurveTo(w * .18, h * .36, w * .2, bottom);
      ctx.quadraticCurveTo(cx, h * .72, w * .8, bottom);
      ctx.quadraticCurveTo(w * .82, h * .36, cx, top);
    } else if (record.variant.mantleStyle === 'fold') {
      ctx.moveTo(cx, top); ctx.lineTo(w * .18, h * .44); ctx.lineTo(w * .3, bottom);
      ctx.lineTo(cx, h * .7); ctx.lineTo(w * .7, bottom); ctx.lineTo(w * .82, h * .44); ctx.closePath();
    } else {
      ctx.moveTo(cx, top);
      ctx.bezierCurveTo(w * .06, h * .34, w * .2, h * .78, w * .32, bottom);
      ctx.quadraticCurveTo(cx, h * .67, w * .68, bottom);
      ctx.bezierCurveTo(w * .8, h * .78, w * .94, h * .34, cx, top);
    }
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = rgba(accent, .58);
    ctx.beginPath();
    ctx.moveTo(cx, top + h * .08); ctx.lineTo(cx, h * .67);
    ctx.stroke();
    ctx.restore();
  };
}

function drawCheekSprigs(palette, record) {
  const foliage = hexRgb(palette.foliage);
  const accent = hexRgb(palette.accents[record.variant.paletteIndex] || palette.glow);
  return sketch => {
    const { ctx, w, h } = sketch;
    const sides = record.variant.sprigSide < 0 ? [-1, 1] : [1, -1];
    ctx.lineCap = 'round';
    sides.forEach((side, index) => {
      const x = w * (side < 0 ? .3 : .7);
      const y = h * (.5 + index * .08);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(side, 1);
      ctx.strokeStyle = rgba(foliage, index === 0 ? .82 : .52);
      ctx.lineWidth = Math.max(1.1, w * .013);
      ctx.beginPath();
      ctx.moveTo(0, h * .12); ctx.quadraticCurveTo(w * .1, 0, w * .16, -h * .18);
      ctx.stroke();
      for (const t of [.38, .7]) {
        ctx.fillStyle = rgba(index ? foliage : accent, index ? .48 : .68);
        ctx.beginPath();
        ctx.ellipse(w * (.035 + t * .1), h * (.07 - t * .2), w * .028, h * .055, -.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  };
}

function drawEyeGlints(palette, record) {
  const glow = hexRgb(palette.glow);
  const paper = hexRgb(palette.paper);
  return sketch => {
    const { ctx, w, h } = sketch;
    for (const x of [w * .33, w * .67]) {
      const y = h * .52 + sketch.jr(-1.2, 1.2);
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = rgba(glow, .95);
      ctx.fillStyle = rgba(paper, .96);
      ctx.lineWidth = Math.max(1, w * .012);
      if (record.variant.glintShape === 'star') {
        ctx.beginPath();
        ctx.moveTo(0, -h * .16); ctx.lineTo(w * .025, -h * .03); ctx.lineTo(w * .1, 0);
        ctx.lineTo(w * .025, h * .03); ctx.lineTo(0, h * .16); ctx.lineTo(-w * .025, h * .03);
        ctx.lineTo(-w * .1, 0); ctx.lineTo(-w * .025, -h * .03); ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else if (record.variant.glintShape === 'slit') {
        ctx.beginPath(); ctx.moveTo(0, -h * .13); ctx.lineTo(0, h * .13); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, Math.max(1.3, w * .025), 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  };
}

function drawSeedCharm(palette, record) {
  const foliage = hexRgb(palette.foliage);
  const glow = hexRgb(palette.glow);
  const bark = hexRgb(palette.bark || '#6a4b3b');
  return sketch => {
    const { ctx, w, h } = sketch;
    const cx = w * .5;
    ctx.strokeStyle = rgba(bark, .78);
    ctx.fillStyle = rgba(glow, .72);
    ctx.lineWidth = Math.max(1.2, w * .018);
    ctx.beginPath();
    ctx.moveTo(cx, h * .06); ctx.quadraticCurveTo(w * .38, h * .27, cx, h * .42); ctx.stroke();
    ctx.beginPath();
    if (record.variant.charmShape === 'moon') {
      ctx.arc(cx, h * .62, w * .18, -.9, Math.PI + .9);
      ctx.quadraticCurveTo(cx + w * .06, h * .62, cx + w * .11, h * .48);
    } else if (record.variant.charmShape === 'lamp') {
      ctx.rect(cx - w * .16, h * .45, w * .32, h * .32);
      ctx.moveTo(cx - w * .1, h * .45); ctx.quadraticCurveTo(cx, h * .27, cx + w * .1, h * .45);
    } else {
      ctx.ellipse(cx, h * .61, w * .15, h * .18, .3, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = rgba(foliage, .88);
    ctx.stroke();
  };
}

function drawRouteRibbons(palette, record) {
  const mist = hexRgb(palette.mist || '#c8d8ce');
  const accents = palette.accents.map(hexRgb);
  return sketch => {
    const { ctx, w, h } = sketch;
    ctx.save();
    ctx.lineCap = 'round';
    for (let index = 0; index < record.variant.ribbonCount; index++) {
      const side = index % 2 ? -1 : 1;
      const y = h * (.24 + index * .17);
      ctx.strokeStyle = rgba(accents[index % accents.length] || mist, .36 + index * .07);
      ctx.lineWidth = Math.max(1.1, w * (.008 + index * .002));
      ctx.beginPath();
      ctx.moveTo(w * .5, y);
      ctx.bezierCurveTo(w * (.5 + side * .18), y - h * .16, w * (.5 + side * .3), y + h * .2, w * (.5 + side * .45), y + h * .04);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(mist, .3);
    ctx.setLineDash([w * .025, w * .02]);
    ctx.beginPath(); ctx.arc(w * .5, h * .5, w * .34, .2, Math.PI * 1.5); ctx.stroke();
    ctx.restore();
  };
}

function drawMossFooting(palette, record) {
  const foliage = hexRgb(palette.foliage);
  const glow = hexRgb(palette.glow);
  return sketch => {
    const { ctx, w, h } = sketch;
    const count = record.variant.footingClusters;
    for (let index = 0; index < count; index++) {
      const t = count === 1 ? .5 : index / (count - 1);
      const x = w * (.2 + t * .6) + sketch.jr(-3, 3);
      const y = h * .72 + sketch.jr(-2, 2);
      const r = w * sketch.jr(.055, .09);
      ctx.fillStyle = rgba(foliage, sketch.jr(.46, .72));
      ctx.beginPath();
      ctx.arc(x - r * .45, y, r * .7, 0, Math.PI * 2);
      ctx.arc(x + r * .25, y - r * .16, r, 0, Math.PI * 2);
      ctx.arc(x + r, y + r * .08, r * .62, 0, Math.PI * 2);
      ctx.fill();
      if (index === Math.floor(count / 2)) {
        ctx.fillStyle = rgba(glow, .72);
        ctx.beginPath(); ctx.arc(x + r * .2, y - r * .55, Math.max(1.2, r * .16), 0, Math.PI * 2); ctx.fill();
      }
    }
  };
}

function drawPaperFlecks(palette, record) {
  const paper = hexRgb(palette.paper);
  const foliage = hexRgb(palette.foliage);
  const accent = hexRgb(palette.accents[record.variant.paletteIndex] || palette.glow);
  return sketch => {
    const { ctx, w, h } = sketch;
    ctx.lineCap = 'round';
    for (let index = 0; index < record.variant.paperFlecks; index++) {
      const x = sketch.jr(w * .12, w * .88);
      const y = sketch.jr(h * .12, h * .88);
      const size = sketch.jr(1, Math.max(1.5, w * .012));
      const color = index % 5 === 0 ? accent : (index % 2 ? foliage : paper);
      ctx.strokeStyle = rgba(color, sketch.jr(.12, .3));
      ctx.lineWidth = Math.max(.8, size * .6);
      ctx.beginPath();
      ctx.moveTo(x - size, y); ctx.lineTo(x + size, y + sketch.jr(-1, 1));
      if (index % 3 === 0) { ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); }
      ctx.stroke();
    }
  };
}

export function mosslightV06Specs(face, record, palette) {
  const F = face.F;
  const top = Math.min(-F.s * 1.08, F.L.skullTop[1] - F.s * .18);
  const bottom = F.B.floorY + F.s * .14;
  const centerY = (top + bottom) * .5;
  const fullHeight = bottom - top;
  const fullWidth = Math.max(F.w * 2.7, F.B.halfW * (F.B.quad ? 3.2 : 2.7), F.s * 1.7);
  const bodyX = F.B.cx / U;
  const bodyCenterY = -(F.B.top + F.B.h * .52) / U;
  const badgeSide = record.variant.sprigSide ?? record.variant.driftSide ?? 1;

  return [
    {
      id: 'mosslight-ground-bloom', label: 'ground bloom', region: 'body', order: -5, depth: -.5,
      wU: fullWidth * 1.08 / U, hU: Math.max(F.s * .62, 34) / U,
      x: bodyX, y: -F.B.floorY / U,
      draw: drawGroundBloom(palette, record)
    },
    {
      id: 'mosslight-leaf-crown', label: 'leaf crown', region: 'head', order: 6, depth: .26,
      wU: Math.max(F.w * 1.7, F.s * 1.16) / U, hU: Math.max(F.s * .68, 32) / U,
      x: F.turn * F.w * .06 / U, y: F.s * .48 / U,
      draw: drawLeafCrown(palette, record)
    },
    {
      id: 'mosslight-mantle', label: 'traveller mantle', region: 'body', order: -1, depth: -.08,
      wU: Math.max(F.B.halfW * 2.35, F.s * 1.08) / U, hU: Math.max(F.B.h * .78, F.s * .72) / U,
      x: bodyX, y: bodyCenterY,
      draw: drawMantle(palette, record)
    },
    {
      id: 'mosslight-cheek-sprigs', label: 'cheek sprigs', region: 'head', order: 5, depth: .24,
      wU: Math.max(F.w * 1.25, F.s * .92) / U, hU: Math.max(F.s * .5, 28) / U,
      x: F.turn * F.w * .08 / U, y: -F.s * .12 / U,
      draw: drawCheekSprigs(palette, record)
    },
    {
      id: 'mosslight-eye-glints', label: 'eye glints', region: 'head', order: 8, depth: .38,
      wU: Math.max(F.w * .94, F.s * .62) / U, hU: Math.max(F.s * .3, 20) / U,
      x: F.turn * F.w * .11 / U, y: F.s * .08 / U,
      draw: drawEyeGlints(palette, record)
    },
    {
      id: 'mosslight-seed-charm', label: 'seed charm', region: 'body', order: 3, depth: .15,
      wU: Math.max(F.s * .32, 20) / U, hU: Math.max(F.s * .58, 32) / U,
      x: (F.B.cx + F.B.halfW * .68 * badgeSide) / U, y: -(F.B.top + F.B.h * .55) / U,
      draw: drawSeedCharm(palette, record)
    },
    {
      id: 'mosslight-route-ribbons', label: 'route ribbons', region: 'head', order: 3, depth: .1,
      wU: Math.max(F.w * 2.1, F.s * 1.5) / U, hU: Math.max(F.s * 1.28, 62) / U,
      x: F.turn * F.w * .04 / U, y: F.s * .03 / U,
      draw: drawRouteRibbons(palette, record)
    },
    {
      id: 'mosslight-moss-footing', label: 'moss footing', region: 'body', order: 1, depth: .04,
      wU: Math.max(F.B.halfW * 2.2, F.s * 1.22) / U, hU: Math.max(F.s * .4, 24) / U,
      x: bodyX, y: -F.B.floorY / U,
      draw: drawMossFooting(palette, record)
    },
    {
      id: 'mosslight-paper-flecks', label: 'paper flecks', region: 'body', order: 6, depth: .31,
      wU: fullWidth / U, hU: fullHeight / U,
      x: (F.B.quad ? F.B.cx * .18 : 0) / U, y: -centerY / U,
      draw: drawPaperFlecks(palette, record)
    }
  ];
}
