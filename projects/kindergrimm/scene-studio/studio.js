import { buildAssetTypeRecipes } from '../runtime/asset-types.js';
import { getPropStyleGrammar } from '../runtime/prop-style-grammars.js';
import { renderPropAsset } from '../runtime/prop-renderer.js';
import { buildSceneComponentRecipes, renderSceneComponent } from '../runtime/scene-components.js';
import {
  SCENE_INTENT_PRESETS,
  compileSceneIntent,
  buildAssetResolutionPlan,
  reviseSceneIntent,
  validateSceneIntentContract
} from '../runtime/scene-intent-compiler.js';

const dom = {
  form: document.querySelector('#intent-form'),
  input: document.querySelector('#scene-brief'),
  count: document.querySelector('#character-count'),
  error: document.querySelector('#intent-error'),
  revision: document.querySelector('#revision-section'),
  canvas: document.querySelector('#scene-canvas'),
  empty: document.querySelector('#scene-empty'),
  fallback: document.querySelector('#canvas-fallback'),
  stage: document.querySelector('#scene-stage'),
  hotspots: document.querySelector('#scene-hotspots'),
  badges: document.querySelector('#scene-badges'),
  identity: document.querySelector('#build-identity'),
  matched: document.querySelector('#matched-count'),
  variant: document.querySelector('#variant-count'),
  gap: document.querySelector('#gap-count'),
  buildTime: document.querySelector('#build-time'),
  fingerprint: document.querySelector('#contract-fingerprint'),
  contractFields: document.querySelector('#contract-fields'),
  plan: document.querySelector('#asset-plan'),
  gapBacklog: document.querySelector('#gap-backlog'),
  gapList: document.querySelector('#gap-list'),
  download: document.querySelector('#download-contract')
};

const props = buildAssetTypeRecipes(240824, 15);
const propById = new Map(props.map(recipe => [recipe.archetype, recipe]));
const scenes = buildSceneComponentRecipes(240824, 6);
const presetById = new Map(SCENE_INTENT_PRESETS.map(preset => [preset.id, preset]));
const styleDom = { 'mosslight-prop-gouache': 'mosslight', 'moonharbor-inkcut-props': 'inkcut', 'sunpatch-felt-props': 'felt' };
const interactionLabels = {
  'light-lantern': '点亮提灯',
  'repair-waymark': '扶正路标',
  'guide-family': '引导家庭',
  'deliver-letter': '交付回信',
  'signal-public': '发出预警',
  'inspect-scene': '查看场景'
};
const hotspotPositions = [[24,62],[70,53],[39,48],[57,67],[78,35],[50,50]];
let current = null;
let currentPlan = null;
let canvasAvailable = !new URLSearchParams(location.search).has('canvas-off');

function updateCount() {
  dom.count.textContent = dom.input.value.length + ' / 320';
}

function context2d(canvas) {
  if (!canvasAvailable) return null;
  try { return canvas.getContext('2d'); } catch { return null; }
}

function sceneRecipe(id) {
  return scenes.find(recipe => recipe.archetype === id) || scenes[0];
}

function drawCharacter(ctx, character, index, contract, style) {
  const x = dom.canvas.width * (.22 + index * .18);
  const y = dom.canvas.height * (.76 - (index % 2) * .035);
  const scale = character.id === 'family' ? .72 : .86;
  const coat = style.palette.accent[(index + 1) % 3];
  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale);
  ctx.strokeStyle = style.palette.dark; ctx.lineWidth = 8; ctx.lineJoin = style.family === 'moonharbor-inkcut' ? 'miter' : 'round';
  ctx.fillStyle = coat;
  ctx.beginPath(); ctx.moveTo(-46,118); ctx.quadraticCurveTo(-32,22,0,18); ctx.quadraticCurveTo(32,22,46,118); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = style.palette.paper; ctx.beginPath(); ctx.arc(0,-5,27,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = style.palette.dark; ctx.beginPath(); ctx.arc(8,-9,3,0,Math.PI*2); ctx.fill();
  if (character.id === 'family') {
    ctx.translate(63,38); ctx.scale(.68,.68); ctx.fillStyle=style.palette.bodyAlt;
    ctx.beginPath(); ctx.moveTo(-38,90); ctx.lineTo(-26,18); ctx.lineTo(26,18); ctx.lineTo(38,90); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle=style.palette.paper; ctx.beginPath(); ctx.arc(0,-3,24,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.fillStyle='rgba(16,30,24,.74)'; ctx.font='800 14px system-ui'; ctx.textAlign='center'; ctx.fillText(character.label,x,y+32); ctx.restore();
}

function drawRequestedProp(ctx, recipe, index, count, style) {
  const rendered = renderPropAsset(recipe, style, { size: 320 });
  const x = dom.canvas.width * (.18 + (index + 1) / (count + 1) * .67);
  const y = dom.canvas.height * .58;
  const size = dom.canvas.width * (recipe.archetype === 'waymark' ? .2 : .145);
  ctx.save();
  if (recipe.archetype === 'lantern') {
    const glow=ctx.createRadialGradient(x,y,0,x,y,size*.82); glow.addColorStop(0,style.palette.light+'88'); glow.addColorStop(1,style.palette.light+'00'); ctx.fillStyle=glow; ctx.fillRect(x-size,y-size,size*2,size*2);
  }
  ctx.drawImage(rendered.canvas,x-size/2,y-size/2,size,size); ctx.restore();
}

function renderCanvas(contract) {
  const ctx = context2d(dom.canvas);
  if (!ctx) {
    canvasAvailable = false;
    dom.canvas.hidden = true; dom.fallback.hidden = false; dom.empty.hidden = true;
    return { rendered:false, representation:'semantic-ui-fallback' };
  }
  const style = getPropStyleGrammar(contract.style.id);
  const requested = contract.props.map(prop => propById.get(prop.id)).filter(Boolean);
  const safeProps = requested.length ? requested : [propById.get('waymark')];
  const scene = renderSceneComponent(sceneRecipe(contract.scene.id), safeProps, style, { width:1200 });
  ctx.clearRect(0,0,dom.canvas.width,dom.canvas.height);
  ctx.drawImage(scene.canvas,0,0,scene.canvas.width,scene.canvas.height,0,0,dom.canvas.width,dom.canvas.height);
  if (contract.time === 'night') {
    ctx.fillStyle='rgba(15,31,47,.36)'; ctx.fillRect(0,0,dom.canvas.width,dom.canvas.height);
    ctx.fillStyle=style.palette.paper; ctx.globalAlpha=.7; ctx.beginPath(); ctx.arc(980,95,42,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
  }
  if (contract.mood === 'urgent') { ctx.fillStyle=`rgba(33,52,58,${.06 + contract.tension*.045})`; ctx.fillRect(0,0,dom.canvas.width,dom.canvas.height); }
  requested.forEach((recipe,index) => drawRequestedProp(ctx,recipe,index,requested.length,style));
  contract.characters.forEach((character,index) => drawCharacter(ctx,character,index,contract,style));
  if (contract.safetyTone === 'gentle') {
    ctx.strokeStyle=style.palette.light; ctx.globalAlpha=.22; ctx.lineWidth=18; ctx.strokeRect(18,18,dom.canvas.width-36,dom.canvas.height-36); ctx.globalAlpha=1;
  }
  return {
    rendered:true,
    representation:'local-authored-procedural-canvas-2d-scene',
    sceneRecipe:scene.recipe.fingerprint,
    styleFingerprint:style.fingerprint,
    embeddedProps:scene.audit.embeddedProps.length,
    requestedProps:requested.map(recipe=>recipe.fingerprint),
    characterTokens:contract.characters.length,
    runtimeLlmCalls:0,
    cloudApiCalls:0
  };
}

function renderHotspots(contract) {
  dom.hotspots.replaceChildren();
  contract.interactions.forEach((interaction,index) => {
    const position=hotspotPositions[index%hotspotPositions.length];
    const marker=document.createElement('span'); marker.className='scene-hotspot'; marker.style.left=position[0]+'%'; marker.style.top=position[1]+'%'; marker.textContent=interactionLabels[interaction]||interaction; dom.hotspots.append(marker);
  });
}

function renderBadges(contract) {
  dom.badges.replaceChildren();
  [contract.scene.label,contract.style.label,contract.audience==='children'?'儿童友好':'通用受众',contract.time==='night'?'夜间':'日间'].forEach(value=>{const span=document.createElement('span');span.textContent=value;dom.badges.append(span);});
  if(contract.requestedGaps.length){const span=document.createElement('span');span.textContent='GAP '+contract.requestedGaps.length+' · 未渲染';dom.badges.append(span);}
}

function renderContract(contract) {
  const fields=[
    ['场景',contract.scene.label],['目标',contract.narrativeGoal],['受众',contract.audience],['情绪',contract.mood+' / '+contract.tension],
    ['时间',contract.time],['平台',contract.platform],['角色',contract.characters.map(item=>item.label).join('、')],['交互',contract.interactions.map(id=>interactionLabels[id]||id).join('、')]
  ];
  dom.contractFields.replaceChildren();
  fields.forEach(([term,value])=>{const div=document.createElement('div');const dt=document.createElement('dt');const dd=document.createElement('dd');dt.textContent=term;dd.textContent=value;dd.title=value;div.append(dt,dd);dom.contractFields.append(div);});
  dom.fingerprint.textContent='R#'+contract.fingerprint;
}

function renderPlan(plan) {
  dom.plan.replaceChildren();
  plan.items.forEach(item=>{
    const article=document.createElement('article');article.className='plan-item';article.dataset.status=item.status;
    const status=document.createElement('span');status.className='plan-status';status.setAttribute('aria-label',item.status);
    const copy=document.createElement('div');copy.className='plan-copy';
    const header=document.createElement('header');const title=document.createElement('strong');title.textContent=item.requirement;const code=document.createElement('code');code.textContent=item.status.toUpperCase();header.append(title,code);
    const p=document.createElement('p');p.textContent=item.resolution;const small=document.createElement('small');small.textContent=item.kind+' · '+item.provenance;
    copy.append(header,p,small);article.append(status,copy);dom.plan.append(article);
  });
  const gaps=plan.items.filter(item=>item.status==='capability-gap');
  dom.gapBacklog.hidden=!gaps.length;dom.gapList.replaceChildren();
  gaps.forEach(item=>{const li=document.createElement('li');li.textContent=item.requirement+' → '+item.targetId;dom.gapList.append(li);});
}

function selectPreset(id) {
  const preset=presetById.get(id); if(!preset)return;
  dom.input.value=preset.intent;updateCount();dom.error.hidden=true;
  document.querySelectorAll('[data-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.preset===id)));
}

function build(intent, reason='compiled') {
  const started=performance.now();
  try {
    const contract=compileSceneIntent(intent);const validation=validateSceneIntentContract(contract);if(!validation.ok)throw new Error(validation.errors.join(', '));
    const plan=buildAssetResolutionPlan(contract);current=contract;currentPlan=plan;
    document.documentElement.dataset.style=styleDom[contract.style.id];
    dom.error.hidden=true;dom.empty.hidden=true;dom.stage.dataset.state=reason;dom.stage.dataset.mood=contract.mood;
    const audit=renderCanvas(contract);renderHotspots(contract);renderBadges(contract);renderContract(contract);renderPlan(plan);
    const elapsed=Math.max(1,Math.round(performance.now()-started));
    dom.matched.textContent=plan.counts.matched;dom.variant.textContent=plan.counts.generatedVariant;dom.gap.textContent=plan.counts.capabilityGap;dom.buildTime.textContent=elapsed+'ms';
    dom.identity.innerHTML=`<span>${reason==='revised'?'已按心智修订':'场景已构建'}</span><code>SCENE R#${contract.fingerprint}</code>`;
    dom.revision.hidden=false;dom.download.disabled=false;
    window.__sceneStudioState={contract,plan,audit,elapsedMs:elapsed,canvasAvailable};
    return window.__sceneStudioState;
  } catch(error) {
    dom.error.textContent=error.message;dom.error.hidden=false;dom.input.focus();
    window.__sceneStudioState={error:error.message,contract:current,plan:currentPlan,canvasAvailable};
    return window.__sceneStudioState;
  }
}

function downloadContract() {
  if(!current||!currentPlan)return;
  const blob=new Blob([JSON.stringify({contract:current,assetPlan:currentPlan},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='kindergrimm-scene-'+current.fingerprint+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
}

dom.form.addEventListener('submit',event=>{event.preventDefault();build(dom.input.value);});
dom.input.addEventListener('input',()=>{updateCount();document.querySelectorAll('[data-preset]').forEach(button=>button.setAttribute('aria-pressed','false'));});
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>selectPreset(button.dataset.preset)));
document.querySelectorAll('[data-revision]').forEach(button=>button.addEventListener('click',()=>{dom.input.value=reviseSceneIntent(dom.input.value,button.dataset.revision);updateCount();build(dom.input.value,'revised');}));
dom.download.addEventListener('click',downloadContract);

selectPreset('flood-warning');
if(!canvasAvailable){dom.canvas.hidden=true;dom.fallback.hidden=false;}
window.__sceneStudio=Object.freeze({
  compile:intent=>build(intent),
  revise:revision=>{dom.input.value=reviseSceneIntent(dom.input.value,revision);updateCount();return build(dom.input.value,'revised');},
  selectPreset,
  snapshot:()=>JSON.parse(JSON.stringify(window.__sceneStudioState||{contract:null,plan:null,canvasAvailable}))
});
