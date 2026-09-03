import { capabilityCatalog } from '../capabilities/catalog.ts';
import { planCapabilities } from '../capabilities/planner.ts';
import { planCapabilityProposals } from '../capabilities/proposal.ts';
import type { PlanContext } from '../capabilities/schema.ts';
import { compileDirectionManifest } from './manifest-compiler.ts';
import { compileBlueprintManifest } from './experience-blueprint.ts';
import { stableHash } from './stable-hash.ts';
import { planAssets } from './asset-plan.ts';
import { compileCompatibilityEffectSpec } from './effect-spec.ts';
import type { BriefInterpreter, CreativeBrief, CreativeRun } from './schema.ts';
import { createProductionCapabilityProfile, type IntegratedProductionCapabilities } from './production-capabilities.ts';
import { planCreativeProduction } from './production-plan.ts';
import { selectPresentationStrategy } from './presentation-strategy.ts';

export async function generateCreativeRun(
  brief: CreativeBrief,
  provider: BriefInterpreter,
  context: PlanContext,
  integratedCapabilities: IntegratedProductionCapabilities = []
): Promise<CreativeRun> {
  const interpretation = await provider.interpret(brief);
  if (interpretation.directions.length < 1) throw new Error('解释器至少需要返回一个可执行方向。');
  if (interpretation.effectSpecs && interpretation.effectSpecs.length !== interpretation.directions.length) {
    throw new Error('模型效果方案与运行时兼容方向数量不一致。');
  }
  if (interpretation.experienceBlueprints && interpretation.experienceBlueprints.length !== interpretation.directions.length) {
    throw new Error('模型页面蓝图与运行时兼容方向数量不一致。');
  }
  const ids = new Set<string>();
  const productionProfile = createProductionCapabilityProfile(interpretation.provenance.selected, interpretation.provenance.model, integratedCapabilities);
  const candidates = interpretation.directions.map((direction, index) => {
    if (ids.has(direction.id)) throw new Error(`候选方向 id 重复：${direction.id}`);
    ids.add(direction.id);
    const effectSpec = interpretation.effectSpecs?.[index] ?? compileCompatibilityEffectSpec(brief, interpretation, direction);
    const assetPlan = planAssets(effectSpec);
    const experienceBlueprint = interpretation.experienceBlueprints?.[index] ?? null;
    const manifest = experienceBlueprint ? compileBlueprintManifest(brief, interpretation, direction, effectSpec, experienceBlueprint) : compileDirectionManifest(brief, interpretation, direction, effectSpec);
    const capabilityPlan = planCapabilities(manifest, capabilityCatalog, context);
    const productionPlan = planCreativeProduction(effectSpec, assetPlan, productionProfile);
    const presentationStrategy = selectPresentationStrategy(effectSpec, assetPlan, context);
    if (capabilityPlan.missing.length) throw new Error(`候选 ${direction.id} 缺少能力：${capabilityPlan.missing.join(', ')}`);
    return { id: manifest.id, direction, effectSpec, experienceBlueprint, assetPlan, productionPlan, presentationStrategy, manifest, capabilityPlan };
  });
  const capabilityProposals = planCapabilityProposals(interpretation.capabilityGaps, capabilityCatalog);
  return { id: `run-${stableHash(`${brief.text}|${brief.seed ?? 0}|${provider.id}`)}`, brief, interpretation, candidates, capabilityProposals, productionProfile, context };
}
