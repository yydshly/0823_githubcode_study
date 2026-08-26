import type { DriverKind, ExperienceManifest } from '../experience/schema';
import type { EffectiveQuality } from '../runtime/quality';

export type CapabilityKind = 'scene' | 'effect' | 'driver' | 'transition' | 'output';
export type CapabilityCost = 1 | 2 | 3 | 4 | 5;

export interface CapabilityDescriptor {
  id: string;
  kind: CapabilityKind;
  label: string;
  summary: string;
  tags: readonly string[];
  cost: {
    gpu: CapabilityCost;
    cpu: CapabilityCost;
    memory: CapabilityCost;
    drawCalls: number;
  };
  requires?: readonly ('webgl' | 'pointer' | 'motion')[];
  supports: {
    qualities: readonly EffectiveQuality[];
    reducedMotion: boolean;
    semanticFallback: boolean;
  };
}

export interface CapabilityCatalog {
  version: 1;
  capabilities: Readonly<Record<string, CapabilityDescriptor>>;
}

export interface BudgetProfile {
  quality: EffectiveQuality;
  maxGpu: number;
  maxCpu: number;
  maxMemory: number;
  maxDrawCalls: number;
}

export interface CapabilityPlan {
  experienceId: string;
  status: 'fit' | 'degraded' | 'fallback';
  selected: readonly string[];
  missing: readonly string[];
  estimated: { gpu: number; cpu: number; memory: number; drawCalls: number };
  budget: BudgetProfile;
  decisions: readonly string[];
  fallback: 'semantic-dom' | null;
}

export interface PlanContext {
  quality: EffectiveQuality;
  renderer: 'webgl' | 'none';
  motion: 'full' | 'reduce';
}

export interface ExperienceCapabilityUsage {
  scenePlugins: readonly string[];
  effectPlugins: readonly string[];
  drivers: readonly DriverKind[];
  outputs: readonly string[];
}

export type ExperienceForPlanning = Pick<ExperienceManifest, 'id' | 'scenes' | 'drivers' | 'accessibility'>;
