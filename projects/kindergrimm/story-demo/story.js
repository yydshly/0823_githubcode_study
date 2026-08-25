import { buildAssetTypeRecipes } from '../runtime/asset-types.js';
import { listPropStyleGrammars, getPropStyleGrammar } from '../runtime/prop-style-grammars.js';
import { renderPropAsset } from '../runtime/prop-renderer.js';
import { buildSceneComponentRecipes, renderSceneComponent } from '../runtime/scene-components.js';
import {
  STORY_CAST,
  STORY_CHAPTERS,
  STORY_ENDINGS,
  createStoryState,
  availableStoryActions,
  storyCommand,
  storyView,
  validateStoryState
} from '../runtime/story-reply-before-storm.js';

const STYLE_DOM_NAMES = {
  'mosslight-prop-gouache': 'mosslight',
  'moonharbor-inkcut-props': 'inkcut',
  'sunpatch-felt-props': 'felt'
};
const ITEM_LABELS = { scroll: '路线回信', satchel: '信使包', lantern: '提灯', waymark: '路标记忆', charm: '旧护符' };
const HISTORY_LABELS = {
  accept_letter: '从奥伦手中接过没有收件人的回信。',
  light_lantern: '点亮提灯，第一次让黑暗中的路可见。',
  repair_waymark: '扶正路标，恢复一项公共方向设施。',
  guide_family: '花费时间，把米娅一家带过岔路。',
  continue_gate: '赶到旧水闸，面对信的归属问题。',
  unseal_route: '用护符解封路线，确认它覆盖所有街区。',
  signal_public: '敲响旧钟，把路线公开给整座城。',
  deliver_council: '按流程把信交给闸门管理员。'
};
const HOTSPOTS = {
  accept_letter: { x: 50, y: 60, label: '领取回信' },
  light_lantern: { x: 28, y: 66, label: '点亮提灯' },
  repair_waymark: { x: 72, y: 56, label: '扶正路标' },
  guide_family: { x: 34, y: 52, label: '帮助米娅' },
  continue_gate: { x: 78, y: 42, label: '前往水闸' },
  unseal_route: { x: 50, y: 56, label: '解开封蜡' },
  signal_public: { x: 72, y: 37, label: '敲响旧钟' },
  deliver_council: { x: 34, y: 51, label: '交付管理员' }
};

const dom = {
  canvas: document.querySelector('#story-scene'),
  fallback: document.querySelector('#canvas-fallback'),
  frame: document.querySelector('#scene-frame'),
  hotspotLayer: document.querySelector('#hotspot-layer'),
  chapterEyebrow: document.querySelector('#chapter-eyebrow'),
  chapterTitle: document.querySelector('#chapter-title'),
  speakerName: document.querySelector('#speaker-name'),
  speakerRole: document.querySelector('#speaker-role'),
  dialogueText: document.querySelector('#dialogue-text'),
  objective: document.querySelector('#objective-text'),
  portrait: document.querySelector('#portrait'),
  actionList: document.querySelector('#action-list'),
  inventory: document.querySelector('#inventory-list'),
  inventoryCount: document.querySelector('#inventory-count'),
  trust: document.querySelector('#trust-value'),
  storm: document.querySelector('#storm-value'),
  trustDots: document.querySelector('#trust-dots'),
  stormDots: document.querySelector('#storm-dots'),
  history: document.querySelector('#history-list'),
  historyCount: document.querySelector('#history-count')
};

const allProps = buildAssetTypeRecipes(240824, 15);
const propByArchetype = new Map(allProps.map(recipe => [recipe.archetype, recipe]));
const sceneRecipes = buildSceneComponentRecipes(240824, 6);
const castById = new Map(STORY_CAST.map(person => [person.id, person]));
let story = createStoryState();
let style = listPropStyleGrammars()[0];
let canvasAvailable = true;

function sceneRecipeForChapter(chapter) {
  const archetype = STORY_CHAPTERS[chapter].id;
  return sceneRecipes.find(recipe => recipe.archetype === archetype) || sceneRecipes[chapter];
}

function canvasContext(canvas) {
  try { return canvas?.getContext?.('2d') || null; } catch { return null; }
}

function drawPropOn(ctx, archetype, x, y, size, alpha = 1, rotation = 0) {
  const recipe = propByArchetype.get(archetype);
  if (!recipe) return;
  const rendered = renderPropAsset(recipe, style, { size: 320 });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.drawImage(rendered.canvas, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawPerson(ctx, x, y, scale, coat, facing = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);
  ctx.strokeStyle = style.palette.dark;
  ctx.lineWidth = 7;
  ctx.lineJoin = style.family === 'moonharbor-inkcut' ? 'miter' : 'round';
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(-44, 128); ctx.quadraticCurveTo(-34, 25, 0, 18); ctx.quadraticCurveTo(34, 25, 44, 128); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = style.palette.paper;
  ctx.beginPath(); ctx.arc(0, -2, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = style.palette.dark;
  ctx.beginPath(); ctx.arc(8, -6, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawStoryOverlay(ctx) {
  const w = dom.canvas.width;
  const h = dom.canvas.height;
  const accent = style.palette.accent[0];
  if (story.chapter === 0) {
    drawPerson(ctx, w * .23, h * .66, .82, style.palette.bodyAlt, 1);
    drawPerson(ctx, w * .74, h * .68, .92, accent, -1);
    drawPropOn(ctx, 'scroll', w * .5, h * .64, w * .16, 1, -.08);
  } else if (story.chapter === 1) {
    drawPerson(ctx, w * .25, h * .69, .78, accent, 1);
    drawPerson(ctx, w * .37, h * .72, .64, style.palette.bodyAlt, -1);
    drawPropOn(ctx, 'lantern', w * .25, h * .62, w * .16, story.flags.lanternLit ? 1 : .52);
    drawPropOn(ctx, 'waymark', w * .72, h * .62, w * .22, 1, story.flags.waymarkFixed ? 0 : -.33);
    if (story.flags.lanternLit) {
      const glow = ctx.createRadialGradient(w * .25, h * .62, 4, w * .25, h * .62, w * .22);
      glow.addColorStop(0, style.palette.light + 'aa'); glow.addColorStop(1, style.palette.light + '00');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    }
  } else {
    drawPerson(ctx, w * .28, h * .7, .82, accent, 1);
    drawPerson(ctx, w * .73, h * .7, .88, style.palette.bodyAlt, -1);
    drawPropOn(ctx, 'scroll', w * .5, h * .65, w * .16, 1);
    if (story.flags.routeKnown) drawPropOn(ctx, 'charm', w * .62, h * .59, w * .11, 1, .15);
    if (story.ending === 'community') {
      ctx.save();
      ctx.globalAlpha = .2;
      ctx.fillStyle = style.palette.light;
      for (let i = 0; i < 8; i += 1) {
        ctx.beginPath(); ctx.arc(w * (.14 + i * .105), h * (.82 - (i % 2) * .03), 26 + i % 3 * 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  }
  if (story.ending) {
    ctx.fillStyle = 'rgba(12,25,20,.34)'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#f7f0dc'; ctx.textAlign = 'center';
    ctx.font = '900 22px ui-monospace, monospace'; ctx.fillText('ENDING · ' + STORY_ENDINGS[story.ending].title, w/2, h*.18);
  }
}

function renderScene() {
  const ctx = canvasContext(dom.canvas);
  if (!ctx) {
    canvasAvailable = false;
    dom.canvas.hidden = true;
    dom.fallback.hidden = false;
    return;
  }
  canvasAvailable = true;
  dom.canvas.hidden = false;
  dom.fallback.hidden = true;
  try {
    const rendered = renderSceneComponent(sceneRecipeForChapter(story.chapter), allProps, style, { width: 1200 });
    ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
    ctx.drawImage(rendered.canvas, 0, 0, rendered.canvas.width, rendered.canvas.height, 0, 0, dom.canvas.width, dom.canvas.height);
    const stormTint = Math.min(.08 + story.storm * .08, .3);
    ctx.fillStyle = `rgba(22,40,48,${stormTint})`;
    ctx.fillRect(0, 0, dom.canvas.width, dom.canvas.height);
    drawStoryOverlay(ctx);
  } catch {
    canvasAvailable = false;
    dom.canvas.hidden = true;
    dom.fallback.hidden = false;
  }
}

function renderPortrait(person) {
  dom.portrait.replaceChildren();
  if (!canvasAvailable) {
    dom.portrait.textContent = person.name.slice(0, 1);
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 240; canvas.height = 240;
  const ctx = canvasContext(canvas);
  if (!ctx) return;
  const angular = style.family === 'moonharbor-inkcut';
  const felt = style.family === 'sunpatch';
  ctx.fillStyle = style.palette.panel; ctx.fillRect(0,0,240,240);
  ctx.fillStyle = style.palette.accent[(STORY_CAST.indexOf(person) + 1) % 3];
  ctx.beginPath(); ctx.arc(120,260,105,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = style.palette.paper;
  if (angular) { ctx.beginPath(); ctx.moveTo(67,75); ctx.lineTo(164,62); ctx.lineTo(183,140); ctx.lineTo(124,182); ctx.lineTo(67,145); ctx.closePath(); }
  else { ctx.beginPath(); ctx.ellipse(120,124,57,67,0,0,Math.PI*2); }
  ctx.fill(); ctx.strokeStyle=style.palette.dark; ctx.lineWidth=8; ctx.stroke();
  ctx.fillStyle=style.palette.dark;
  ctx.beginPath(); ctx.arc(101,121,5,0,Math.PI*2); ctx.arc(142,121,5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(105,151); ctx.quadraticCurveTo(121,162,140,149); ctx.stroke();
  ctx.font='900 28px Georgia'; ctx.textAlign='center'; ctx.fillText(person.name.slice(0,1),120,45);
  if (felt) { ctx.setLineDash([9,7]); ctx.strokeStyle=style.palette.light; ctx.lineWidth=4; ctx.strokeRect(12,12,216,216); }
  dom.portrait.append(canvas);
  dom.portrait.setAttribute('aria-label', person.name + '，' + person.role + '的程序化肖像');
}

function renderDots(target, value, max) {
  target.replaceChildren(...Array.from({ length:max }, (_, index) => {
    const dot = document.createElement('i');
    if (index < value) dot.className = 'on';
    return dot;
  }));
}

function renderInventory() {
  dom.inventory.replaceChildren();
  dom.inventoryCount.textContent = story.inventory.length + ' / 5';
  if (!story.inventory.length) {
    const empty = document.createElement('p'); empty.textContent = '还没有领取任何东西。'; dom.inventory.append(empty); return;
  }
  story.inventory.forEach(archetype => {
    const article = document.createElement('article'); article.className = 'inventory-item';
    const frame = document.createElement('div');
    const label = document.createElement('span'); label.textContent = ITEM_LABELS[archetype];
    if (canvasAvailable) {
      try { frame.append(renderPropAsset(propByArchetype.get(archetype), style, { size: 256 }).canvas); }
      catch { frame.textContent = ITEM_LABELS[archetype].slice(0,1); }
    } else frame.textContent = ITEM_LABELS[archetype].slice(0,1);
    article.append(frame, label); dom.inventory.append(article);
  });
}

function renderActions() {
  const actions = availableStoryActions(story);
  dom.actionList.replaceChildren();
  dom.hotspotLayer.replaceChildren();
  actions.forEach(action => {
    const button = document.createElement('button');
    button.className = 'action-button'; button.type = 'button'; button.dataset.command = action.id; button.dataset.tone = action.tone;
    const strong = document.createElement('strong'); strong.textContent = action.label;
    const small = document.createElement('small'); small.textContent = action.hint;
    button.append(strong, small); button.addEventListener('click', () => runCommand(action.id, button));
    dom.actionList.append(button);
    const hotspot = HOTSPOTS[action.id];
    if (hotspot && canvasAvailable) {
      const sceneButton = document.createElement('button'); sceneButton.type = 'button'; sceneButton.className = 'hotspot';
      sceneButton.style.left = hotspot.x + '%'; sceneButton.style.top = hotspot.y + '%'; sceneButton.textContent = hotspot.label;
      sceneButton.dataset.command = action.id; sceneButton.addEventListener('click', () => runCommand(action.id, sceneButton));
      dom.hotspotLayer.append(sceneButton);
    }
  });
}

function renderHistory() {
  dom.history.replaceChildren();
  const visible = story.history.filter(command => command !== 'restart');
  dom.historyCount.textContent = String(visible.length);
  if (!visible.length) { const li=document.createElement('li'); li.textContent='故事尚未开始。'; dom.history.append(li); return; }
  visible.forEach(command => { const li=document.createElement('li'); li.textContent=HISTORY_LABELS[command] || command; dom.history.append(li); });
}

function render() {
  const validation = validateStoryState(story);
  if (!validation.ok) throw new Error('Story state invalid: ' + validation.errors.join(','));
  const chapter = STORY_CHAPTERS[story.chapter];
  const view = storyView(story);
  const person = castById.get(view.speaker);
  document.documentElement.dataset.style = STYLE_DOM_NAMES[style.id];
  dom.frame.dataset.mood = view.mood;
  dom.chapterEyebrow.textContent = chapter.eyebrow;
  dom.chapterTitle.textContent = story.ending ? STORY_ENDINGS[story.ending].title : chapter.title;
  dom.speakerName.textContent = person.name;
  dom.speakerRole.textContent = person.role;
  dom.dialogueText.textContent = view.text;
  dom.objective.textContent = view.objective;
  dom.trust.textContent = String(story.trust);
  dom.storm.textContent = story.storm + ' / 3';
  renderDots(dom.trustDots, story.trust, 5);
  renderDots(dom.stormDots, story.storm, 3);
  document.querySelectorAll('[data-chapter]').forEach(node => {
    const index = Number(node.dataset.chapter);
    node.classList.toggle('is-current', index === story.chapter && !story.ending);
    node.classList.toggle('is-complete', index < story.chapter || Boolean(story.ending));
  });
  document.querySelectorAll('[data-style-id]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.styleId === style.id)));
  renderScene();
  renderPortrait(person);
  renderActions();
  renderInventory();
  renderHistory();
}

function runCommand(command, source) {
  story = storyCommand(story, command);
  render();
  const first = dom.actionList.querySelector('button');
  if (first && source) first.focus({ preventScroll: true });
}

function selectStyle(styleId) {
  style = getPropStyleGrammar(styleId);
  render();
}

document.querySelectorAll('[data-style-id]').forEach(button => button.addEventListener('click', () => selectStyle(button.dataset.styleId)));
document.querySelector('#restart-top').addEventListener('click', () => { story = createStoryState(); render(); });

window.__storyDemo = Object.freeze({
  snapshot: () => JSON.parse(JSON.stringify({ story, styleId: style.id, canvasAvailable })),
  command: command => { story = storyCommand(story, command); render(); return story; },
  reset: () => { story = createStoryState(); render(); return story; },
  selectStyle: styleId => { selectStyle(styleId); return style.id; }
});

render();
