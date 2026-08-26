import type { ExperienceFlow, ExperienceManifest, ExperienceNode } from './schema';

export interface FlowPlanOptions {
  choices?: Readonly<Record<string, string>>;
}

export interface FlowPlan {
  id: string;
  nodeIds: readonly string[];
  nodes: readonly ExperienceNode[];
  flowIds: readonly string[];
}

function selectOutgoing(
  manifest: ExperienceManifest,
  nodeId: string,
  choices: Readonly<Record<string, string>>
): ExperienceFlow | undefined {
  const outgoing = manifest.flows.filter((flow) => flow.from === nodeId);
  if (outgoing.length === 0) return undefined;
  const choiceFlows = outgoing.filter((flow) => flow.trigger.type === 'choice');
  if (choiceFlows.length) {
    const selectedValue = choices[nodeId];
    const selected = choiceFlows.find((flow) => flow.trigger.type === 'choice' && flow.trigger.value === selectedValue);
    return selected || choiceFlows.find((flow) => flow.trigger.type === 'choice' && flow.trigger.isDefault) || choiceFlows[0];
  }
  const scrollFlows = outgoing.filter((flow) => flow.trigger.type === 'scroll-complete');
  if (scrollFlows.length > 1) throw new Error(`${nodeId}: scroll flow 不明确，存在 ${scrollFlows.length} 条候选。`);
  return scrollFlows[0] || outgoing[0];
}

export function buildFlowPlan(manifest: ExperienceManifest, options: FlowPlanOptions = {}): FlowPlan {
  const choices = options.choices || {};
  const nodeIds: string[] = [];
  const flowIds: string[] = [];
  const visited = new Set<string>();
  let current: string | undefined = manifest.entryNodeId;

  while (current) {
    if (visited.has(current)) throw new Error(`FlowPlan 检测到循环：${current}`);
    const node = manifest.nodes[current];
    if (!node) throw new Error(`FlowPlan 引用了不存在的节点：${current}`);
    visited.add(current);
    nodeIds.push(current);
    const outgoing = selectOutgoing(manifest, current, choices);
    if (!outgoing) break;
    flowIds.push(outgoing.id);
    current = outgoing.to;
  }

  return {
    id: `${manifest.id}:${nodeIds.join('>')}`,
    nodeIds,
    nodes: nodeIds.map((id) => manifest.nodes[id]),
    flowIds
  };
}
