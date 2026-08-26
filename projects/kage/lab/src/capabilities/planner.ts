import type { ExperienceForPlanning, BudgetProfile, CapabilityCatalog, CapabilityPlan, ExperienceCapabilityUsage, PlanContext } from './schema';

const budgetProfiles: Readonly<Record<PlanContext['quality'], BudgetProfile>> = {
  high: { quality: 'high', maxGpu: 12, maxCpu: 12, maxMemory: 12, maxDrawCalls: 36 },
  balanced: { quality: 'balanced', maxGpu: 9, maxCpu: 9, maxMemory: 9, maxDrawCalls: 24 },
  low: { quality: 'low', maxGpu: 6, maxCpu: 7, maxMemory: 7, maxDrawCalls: 16 }
};

export function collectCapabilityUsage(experience: ExperienceForPlanning): ExperienceCapabilityUsage {
  const scenes = Object.values(experience.scenes);
  return {
    scenePlugins: [...new Set(scenes.map((scene) => `scene:${scene.plugin}`))],
    effectPlugins: [...new Set(scenes.flatMap((scene) => scene.effectPlugins ?? []).map((id) => `effect:${id}`))],
    drivers: [...new Set(experience.drivers.map((driver) => driver.type))],
    outputs: [`output:${experience.accessibility.fallbackMode}`]
  };
}

export function planCapabilities(experience: ExperienceForPlanning, catalog: CapabilityCatalog, context: PlanContext): CapabilityPlan {
  const usage = collectCapabilityUsage(experience);
  const selected = [...usage.scenePlugins, ...usage.effectPlugins, ...usage.drivers.map((id) => `driver:${id}`), ...usage.outputs];
  const missing = selected.filter((id) => !catalog.capabilities[id]);
  const capabilities = selected.flatMap((id) => catalog.capabilities[id] ? [catalog.capabilities[id]] : []);
  const estimated = capabilities.reduce((total, capability) => ({
    gpu: total.gpu + capability.cost.gpu,
    cpu: total.cpu + capability.cost.cpu,
    memory: total.memory + capability.cost.memory,
    drawCalls: total.drawCalls + capability.cost.drawCalls
  }), { gpu: 0, cpu: 0, memory: 0, drawCalls: 0 });
  const budget = budgetProfiles[context.quality];
  const decisions: string[] = [];

  if (context.renderer === 'none') {
    decisions.push('renderer=none，跳过 WebGL 能力并保留语义 DOM。');
    return { experienceId: experience.id, status: 'fallback', selected, missing, estimated, budget, decisions, fallback: 'semantic-dom' };
  }
  if (missing.length) decisions.push(`能力目录缺少：${missing.join(', ')}。`);
  if (context.motion === 'reduce') decisions.push('减弱动效：轨道冻结到稳定构图，插件只渲染请求帧。');
  const unsupportedQuality = capabilities.filter((capability) => !capability.supports.qualities.includes(context.quality));
  if (unsupportedQuality.length) decisions.push(`当前画质不受支持：${unsupportedQuality.map((item) => item.id).join(', ')}。`);
  const overBudget = estimated.gpu > budget.maxGpu || estimated.cpu > budget.maxCpu || estimated.memory > budget.maxMemory || estimated.drawCalls > budget.maxDrawCalls;
  if (overBudget) decisions.push('估算超出预算，运行时必须使用质量降级参数。');
  const status = missing.length ? 'fallback' : overBudget || unsupportedQuality.length ? 'degraded' : 'fit';
  return { experienceId: experience.id, status, selected, missing, estimated, budget, decisions, fallback: missing.length ? 'semantic-dom' : null };
}
