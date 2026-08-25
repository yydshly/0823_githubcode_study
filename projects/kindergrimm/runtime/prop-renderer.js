import { makeRng, hashStr } from '../upstream/src/rng.js';
import { assetVisualRecord, validateAssetTypeRecipe } from './asset-types.js';
import { getPropStyleGrammar } from './prop-style-grammars.js';

function roundedRectPath(x, y, width, height, radius) {
  const path = new Path2D();
  const r = Math.min(radius, width / 2, height / 2);
  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  path.closePath();
  return path;
}

function ellipsePath(x, y, rx, ry) {
  const path = new Path2D();
  path.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  return path;
}

function polygonPath(points) {
  const path = new Path2D();
  path.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) path.lineTo(points[index][0], points[index][1]);
  path.closePath();
  return path;
}

function makeBrush(ctx, style, rng, unit) {
  const felt = style.family === 'sunpatch';
  const inkcut = style.family === 'moonharbor-inkcut';
  function texture(bounds, path) {
    ctx.save();
    if (path) ctx.clip(path);
    if (inkcut) {
      ctx.globalAlpha = .24;
      ctx.strokeStyle = style.palette.dark;
      ctx.lineWidth = unit * .006;
      const count = 15;
      for (let index = 0; index < count; index += 1) {
        const y = bounds.y + bounds.height * (index + .5) / count;
        ctx.beginPath();
        ctx.moveTo(bounds.x - unit * .05, y + bounds.height * .18);
        ctx.lineTo(bounds.x + bounds.width + unit * .05, y - bounds.height * .18);
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = felt ? .16 : .1;
      ctx.strokeStyle = felt ? style.palette.paper : style.palette.light;
      ctx.lineWidth = felt ? unit * .005 : unit * .009;
      const count = felt ? 30 : 18;
      for (let index = 0; index < count; index += 1) {
        const x = bounds.x + rng.r(0, bounds.width);
        const y = bounds.y + rng.r(0, bounds.height);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + rng.r(-.018, .018) * unit, y + rng.r(-.01, .02) * unit);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function fill(path, color, bounds, options = {}) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = inkcut || felt ? 1 : .93;
    ctx.fill(path);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = options.stroke || style.palette.dark;
    ctx.lineWidth = (inkcut ? .022 : felt ? .012 : .015) * unit;
    ctx.lineJoin = inkcut ? 'miter' : 'round';
    if (felt) ctx.setLineDash([unit * .026, unit * .018]);
    ctx.stroke(path);
    ctx.restore();
    if (bounds) texture(bounds, path);
  }
  function line(path, color, width = .018, dashed = false) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width * unit * (inkcut ? 1.15 : 1);
    ctx.lineCap = inkcut ? 'square' : 'round';
    ctx.lineJoin = inkcut ? 'miter' : 'round';
    if (felt || dashed) ctx.setLineDash([unit * .03, unit * .018]);
    ctx.stroke(path);
    ctx.restore();
  }
  function mark(x, y, size, detail) {
    ctx.save();
    ctx.translate(x, y);
    const markColor = inkcut ? style.palette.accent[0] : felt ? style.palette.light : style.palette.paper;
    ctx.strokeStyle = markColor;
    ctx.fillStyle = markColor;
    ctx.lineWidth = unit * (inkcut ? .014 : .018);
    ctx.lineCap = inkcut ? 'square' : 'round';
    ctx.lineJoin = inkcut ? 'miter' : 'round';
    if (detail === 'leaf') {
      const leaf = inkcut
        ? polygonPath([[0, -size], [size * .55, 0], [0, size], [-size * .4, 0]])
        : ellipsePath(0, 0, size * .55, size);
      ctx.rotate(-.5);
      ctx.stroke(leaf);
      ctx.beginPath();
      ctx.moveTo(0, -size * .65);
      ctx.lineTo(0, size * .65);
      ctx.stroke();
    } else if (detail === 'route') {
      ctx.beginPath();
      ctx.moveTo(-size, size * .55);
      ctx.lineTo(-size * .2, -size * .55);
      ctx.lineTo(size, size * .2);
      ctx.stroke();
    } else if (detail === 'star') {
      const points = [];
      for (let index = 0; index < 10; index += 1) {
        const radius = index % 2 ? size * .42 : size;
        const angle = -Math.PI / 2 + index * Math.PI / 5;
        points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
      }
      ctx.stroke(polygonPath(points));
    } else {
      if (inkcut) {
        ctx.stroke(polygonPath([[0, -size], [size, 0], [0, size], [-size, 0]]));
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, size * .55, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * size * .75, Math.sin(angle) * size * .75);
        ctx.lineTo(Math.cos(angle) * size * 1.15, Math.sin(angle) * size * 1.15);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  return { felt, inkcut, fill, line, mark };
}

function drawLantern(ctx, recipe, style, brush, drawPart, unit) {
  const body = brush.inkcut
    ? polygonPath([[unit * .34, unit * .29], [unit * .66, unit * .29], [unit * .7, unit * .68], [unit * .3, unit * .68]])
    : roundedRectPath(unit * .32, unit * .31, unit * .36, unit * .4, unit * .08);
  drawPart('body', () => brush.fill(body, style.palette.body, { x: unit * .32, y: unit * .31, width: unit * .36, height: unit * .4 }));
  const frame = new Path2D();
  frame.moveTo(unit * .36, unit * .34); frame.lineTo(unit * .41, unit * .68);
  frame.moveTo(unit * .64, unit * .34); frame.lineTo(unit * .59, unit * .68);
  frame.moveTo(unit * .34, unit * .49); frame.lineTo(unit * .66, unit * .49);
  drawPart('frame', () => brush.line(frame, style.palette.dark, .022));
  const handle = new Path2D();
  handle.arc(unit * .5, unit * .31, unit * .14, Math.PI, Math.PI * 2);
  drawPart('handle', () => brush.line(handle, style.palette.dark, .026));
  drawPart('light', () => {
    const glow = ctx.createRadialGradient(unit * .5, unit * .51, 0, unit * .5, unit * .51, unit * .17);
    glow.addColorStop(0, style.palette.light);
    glow.addColorStop(1, style.palette.light + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(unit * .31, unit * .31, unit * .38, unit * .4);
  });
  drawPart('emblem', () => brush.mark(unit * .5, unit * .52, unit * .055, recipe.variant.detail));
}

function drawSatchel(ctx, recipe, style, brush, drawPart, unit) {
  const body = brush.inkcut
    ? polygonPath([[unit * .3, unit * .36], [unit * .7, unit * .39], [unit * .67, unit * .72], [unit * .31, unit * .69]])
    : roundedRectPath(unit * .28, unit * .39, unit * .44, unit * .32, unit * .07);
  drawPart('body', () => brush.fill(body, style.palette.bodyAlt, { x: unit * .28, y: unit * .39, width: unit * .44, height: unit * .32 }));
  const flap = new Path2D();
  flap.moveTo(unit * .3, unit * .43); flap.quadraticCurveTo(unit * .5, unit * .58, unit * .7, unit * .43); flap.lineTo(unit * .68, unit * .34); flap.lineTo(unit * .32, unit * .34); flap.closePath();
  drawPart('flap', () => brush.fill(flap, style.palette.body, { x: unit * .3, y: unit * .34, width: unit * .4, height: unit * .22 }));
  const strap = new Path2D();
  strap.moveTo(unit * .34, unit * .42); strap.quadraticCurveTo(unit * .43, unit * .15, unit * .68, unit * .32);
  drawPart('strap', () => brush.line(strap, style.palette.dark, .028));
  drawPart('buckle', () => brush.fill(roundedRectPath(unit * .465, unit * .48, unit * .07, unit * .065, unit * .012), style.palette.light, { x: unit * .465, y: unit * .48, width: unit * .07, height: unit * .065 }));
  drawPart('emblem', () => brush.mark(unit * .5, unit * .63, unit * .05, recipe.variant.detail));
}

function drawScroll(ctx, recipe, style, brush, drawPart, unit) {
  const paper = brush.inkcut
    ? polygonPath([[unit * .26, unit * .29], [unit * .74, unit * .33], [unit * .7, unit * .7], [unit * .24, unit * .66]])
    : roundedRectPath(unit * .25, unit * .31, unit * .5, unit * .38, unit * .035);
  drawPart('paper', () => brush.fill(paper, style.palette.paper, { x: unit * .25, y: unit * .31, width: unit * .5, height: unit * .38 }, { stroke: style.palette.body }));
  drawPart('rollers', () => {
    brush.fill(ellipsePath(unit * .25, unit * .5, unit * .045, unit * .22), style.palette.dark, { x: unit * .2, y: unit * .28, width: unit * .1, height: unit * .44 });
    brush.fill(ellipsePath(unit * .75, unit * .5, unit * .045, unit * .22), style.palette.dark, { x: unit * .7, y: unit * .28, width: unit * .1, height: unit * .44 });
  });
  const ribbon = new Path2D();
  ribbon.moveTo(unit * .52, unit * .64); ribbon.lineTo(unit * .61, unit * .77); ribbon.lineTo(unit * .54, unit * .74); ribbon.lineTo(unit * .48, unit * .79); ribbon.closePath();
  drawPart('ribbon', () => brush.fill(ribbon, style.palette.accent[recipe.variant.accentIndex], { x: unit * .48, y: unit * .64, width: unit * .13, height: unit * .15 }));
  drawPart('mark', () => brush.mark(unit * .5, unit * .48, unit * .065, recipe.variant.detail));
  drawPart('seal', () => brush.fill(ellipsePath(unit * .52, unit * .65, unit * .055, unit * .05), style.palette.light, { x: unit * .46, y: unit * .6, width: unit * .12, height: unit * .1 }));
}

function drawWaymark(ctx, recipe, style, brush, drawPart, unit) {
  drawPart('post', () => brush.fill(roundedRectPath(unit * .46, unit * .28, unit * .09, unit * .52, unit * .025), style.palette.dark, { x: unit * .46, y: unit * .28, width: unit * .09, height: unit * .52 }));
  const board = polygonPath([[unit * .2, unit * .3], [unit * .67, unit * .3], [unit * .8, unit * .43], [unit * .67, unit * .56], [unit * .2, unit * .56]]);
  drawPart('board', () => brush.fill(board, style.palette.body, { x: unit * .2, y: unit * .3, width: unit * .6, height: unit * .26 }));
  const arrow = new Path2D();
  arrow.moveTo(unit * .3, unit * .43); arrow.lineTo(unit * .66, unit * .43); arrow.moveTo(unit * .59, unit * .36); arrow.lineTo(unit * .68, unit * .43); arrow.lineTo(unit * .59, unit * .5);
  drawPart('arrow', () => brush.line(arrow, style.palette.paper, .022));
  drawPart('mark', () => brush.mark(unit * .32, unit * .43, unit * .045, recipe.variant.detail));
  drawPart('ground', () => brush.fill(ellipsePath(unit * .5, unit * .82, unit * .2, unit * .04), style.palette.bodyAlt, { x: unit * .3, y: unit * .78, width: unit * .4, height: unit * .08 }, { stroke: style.palette.bodyAlt }));
}

function drawCharm(ctx, recipe, style, brush, drawPart, unit) {
  const token = brush.inkcut
    ? polygonPath([[unit * .5, unit * .28], [unit * .68, unit * .38], [unit * .67, unit * .61], [unit * .5, unit * .72], [unit * .32, unit * .61], [unit * .31, unit * .39]])
    : ellipsePath(unit * .5, unit * .5, unit * .19, unit * .21);
  drawPart('token', () => brush.fill(token, style.palette.body, { x: unit * .31, y: unit * .28, width: unit * .38, height: unit * .44 }));
  drawPart('rim', () => {
    const rim = ellipsePath(unit * .5, unit * .5, unit * .15, unit * .17);
    brush.line(rim, style.palette.light, .025);
  });
  const cord = new Path2D();
  cord.moveTo(unit * .5, unit * .3); cord.quadraticCurveTo(unit * .27, unit * .13, unit * .33, unit * .42);
  cord.moveTo(unit * .5, unit * .3); cord.quadraticCurveTo(unit * .73, unit * .13, unit * .67, unit * .42);
  drawPart('cord', () => brush.line(cord, style.palette.dark, .018));
  drawPart('mark', () => brush.mark(unit * .5, unit * .5, unit * .075, recipe.variant.detail));
  drawPart('tassel', () => {
    const tassel = new Path2D();
    tassel.moveTo(unit * .5, unit * .7); tassel.lineTo(unit * .44, unit * .83);
    tassel.moveTo(unit * .5, unit * .7); tassel.lineTo(unit * .5, unit * .84);
    tassel.moveTo(unit * .5, unit * .7); tassel.lineTo(unit * .56, unit * .83);
    brush.line(tassel, style.palette.accent[recipe.variant.accentIndex], .018);
  });
}

const DRAWERS = { lantern: drawLantern, satchel: drawSatchel, scroll: drawScroll, waymark: drawWaymark, charm: drawCharm };

export function renderPropAsset(recipe, rawStyle, options = {}) {
  const validation = validateAssetTypeRecipe(recipe);
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  const style = getPropStyleGrammar(rawStyle);
  const size = Math.max(128, Math.min(1024, Math.floor(options.size || 512)));
  const canvas = options.canvas || document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const rng = makeRng(hashStr(recipe.fingerprint + ':' + style.fingerprint));
  const brush = makeBrush(ctx, style, rng, size);
  const drawnParts = [];
  function drawPart(id, drawing) {
    drawing();
    drawnParts.push(id);
  }
  ctx.save();
  ctx.translate(size * .5, size * .5);
  ctx.scale(recipe.variant.scale, recipe.variant.scale);
  ctx.translate(-size * .5, -size * .5);
  DRAWERS[recipe.archetype](ctx, recipe, style, brush, drawPart, size);
  ctx.restore();
  const visual = assetVisualRecord(recipe, style);
  return {
    canvas,
    recipe,
    style,
    visual,
    audit: {
      representation: 'local-authored-procedural-canvas-2d',
      assetType: 'prop',
      archetype: recipe.archetype,
      styleId: style.id,
      namedParts: recipe.parts.slice(),
      drawnParts,
      visibleParts: drawnParts.length,
      authoredParts: drawnParts.length,
      upstreamVisibleParts: 0,
      runtimeLlmCalls: 0,
      cloudApiCalls: 0
    }
  };
}

export function renderPropDataUrl(recipe, style, options = {}) {
  return renderPropAsset(recipe, style, options).canvas.toDataURL('image/png');
}
