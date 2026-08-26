import type { ExperienceManifest } from '../experience/schema';
import { assertExperienceManifest } from '../experience/validator';

const prefix = 'signal-lab:checkpoint:v1:';
const indexKey = `${prefix}index`;
const maxEntries = 12;

export interface CapabilityCheckpoint {
  version: 1;
  id: string;
  savedAt: string;
  label: string;
  brief: string;
  quality: 'high' | 'balanced' | 'low';
  provider: string;
  model: string | null;
  seed: number;
  runId: string;
  selectedId: string;
  scenePlugin: string;
  productionStatus: string;
  manifest: ExperienceManifest;
}

export type CapabilityCheckpointInput = Omit<CapabilityCheckpoint, 'version' | 'id' | 'savedAt'>;

export function saveCapabilityCheckpoint(input: CapabilityCheckpointInput): CapabilityCheckpoint {
  const manifest = assertExperienceManifest(input.manifest);
  const id = checkpointId(input.runId, input.selectedId);
  const record: CapabilityCheckpoint = {
    ...input,
    version: 1,
    id,
    savedAt: new Date().toISOString(),
    manifest
  };
  localStorage.setItem(`${prefix}${id}`, JSON.stringify(record));
  const index = readIndex().filter((item) => item !== id);
  index.unshift(id);
  const trimmed = index.slice(0, maxEntries);
  index.slice(maxEntries).forEach((item) => localStorage.removeItem(`${prefix}${item}`));
  localStorage.setItem(indexKey, JSON.stringify(trimmed));
  return record;
}

export function listCapabilityCheckpoints(): CapabilityCheckpoint[] {
  return readIndex().flatMap((id) => {
    const checkpoint = loadCapabilityCheckpoint(id);
    return checkpoint ? [checkpoint] : [];
  });
}

export function loadCapabilityCheckpoint(id: string): CapabilityCheckpoint | null {
  if (!validId(id)) return null;
  try {
    const raw = localStorage.getItem(`${prefix}${id}`);
    if (!raw) return null;
    const value = JSON.parse(raw) as CapabilityCheckpoint;
    if (value.version !== 1 || value.id !== id || !value.runId || !value.selectedId || !value.brief) return null;
    if (!['high', 'balanced', 'low'].includes(value.quality)) return null;
    return { ...value, manifest: assertExperienceManifest(value.manifest) };
  } catch (error) {
    console.warn('[signal-lab] Invalid capability checkpoint ignored.', error);
    return null;
  }
}

export function removeCapabilityCheckpoint(id: string): boolean {
  if (!validId(id)) return false;
  const existed = localStorage.getItem(`${prefix}${id}`) !== null;
  localStorage.removeItem(`${prefix}${id}`);
  localStorage.setItem(indexKey, JSON.stringify(readIndex().filter((item) => item !== id)));
  return existed;
}

function checkpointId(runId: string, selectedId: string): string {
  const value = `saved-${runId.replace(/^run-/, '')}-${selectedId.slice(-14)}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return value.slice(0, 120);
}

function validId(id: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{0,119}$/.test(id);
}

function readIndex(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(indexKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string' && validId(item)) : [];
  } catch {
    return [];
  }
}
