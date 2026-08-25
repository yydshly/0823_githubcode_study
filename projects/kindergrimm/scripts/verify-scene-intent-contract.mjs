import assert from 'node:assert/strict';
import {
  SCENE_INTENT_PRESETS,
  compileSceneIntent,
  buildAssetResolutionPlan,
  reviseSceneIntent,
  validateSceneIntentContract
} from '../runtime/scene-intent-compiler.js';

const results=[];
function check(name,fn){try{fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.message});}}
const preset=id=>SCENE_INTENT_PRESETS.find(item=>item.id===id).intent;

check('intent.flood-warning',()=>{
  const contract=compileSceneIntent(preset('flood-warning'));
  assert.equal(contract.scene.id,'trail-shrine');
  assert.equal(contract.style.id,'mosslight-prop-gouache');
  assert.equal(contract.narrativeGoal,'public-warning');
  assert.equal(contract.audience,'children');
  assert.equal(contract.mood,'urgent');
  assert.ok(contract.props.some(item=>item.id==='lantern'));
  assert.ok(contract.props.some(item=>item.id==='waymark'));
  assert.ok(contract.characters.some(item=>item.id==='family'));
  assert.ok(validateSceneIntentContract(contract).ok);
});

check('intent.moonharbor-letter',()=>{
  const contract=compileSceneIntent(preset('moonharbor-letter'));
  assert.equal(contract.scene.id,'waystation-display');
  assert.equal(contract.style.id,'moonharbor-inkcut-props');
  assert.equal(contract.narrativeGoal,'delivery');
  assert.ok(contract.props.some(item=>item.id==='scroll'));
  assert.ok(contract.characters.some(item=>item.id==='gatekeeper'));
});

check('intent.sunny-wayfinding',()=>{
  const contract=compileSceneIntent(preset('sunny-wayfinding'));
  assert.equal(contract.scene.id,'trail-shrine');
  assert.equal(contract.style.id,'sunpatch-felt-props');
  assert.equal(contract.mood,'hopeful');
  assert.ok(contract.props.some(item=>item.id==='charm'));
});

check('intent.capability-gap-is-truthful',()=>{
  const contract=compileSceneIntent('做一个夜晚港口场景，信使坐着小船带小狗穿过木桥，使用墨刻风格。');
  const plan=buildAssetResolutionPlan(contract);
  assert.deepEqual(contract.requestedGaps.map(item=>item.id),['boat','bridge','dog']);
  assert.equal(plan.counts.capabilityGap,3);
  assert.ok(plan.items.filter(item=>item.status==='capability-gap').every(item=>item.provenance==='unresolved-no-asset-generated'));
});

check('intent.revision-updates-style',()=>{
  const revised=reviseSceneIntent(preset('flood-warning'),'felt');
  const contract=compileSceneIntent(revised);
  assert.equal(contract.style.id,'sunpatch-felt-props');
  assert.ok(revised.includes('毛毡'));
});

check('intent.deterministic',()=>{
  const one=compileSceneIntent(preset('flood-warning'));
  const two=compileSceneIntent(preset('flood-warning'));
  assert.deepEqual(one,two);
  assert.deepEqual(buildAssetResolutionPlan(one),buildAssetResolutionPlan(two));
});

check('intent.invalid-input',()=>assert.throws(()=>compileSceneIntent('做场景')));

check('intent.provenance-boundary',()=>{
  for(const presetItem of SCENE_INTENT_PRESETS){
    const contract=compileSceneIntent(presetItem.intent);
    assert.equal(contract.intentAdapter,'local-explainable-rules');
    assert.equal(contract.provenance.runtimeLlmCalls,0);
    assert.equal(contract.provenance.cloudApiCalls,0);
  }
});

for(const result of results)console.log(`${result.ok?'PASS':'FAIL'} ${result.name}${result.error?': '+result.error:''}`);
const passed=results.filter(item=>item.ok).length;console.log(`SCENE INTENT ${passed}/${results.length}`);if(passed!==results.length)process.exitCode=1;
