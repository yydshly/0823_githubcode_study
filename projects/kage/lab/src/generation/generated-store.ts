import type { ExperienceManifest } from '../experience/schema';
import { assertExperienceManifest } from '../experience/validator';

const prefix = 'signal-lab:generated:v1:';
const indexKey = `${prefix}index`;
const maxEntries = 12;

interface StoredExperience {
  version: 1;
  savedAt: string;
  manifest: ExperienceManifest;
}

export function persistGeneratedExperience(manifest: ExperienceManifest): string {
  const valid = assertExperienceManifest(manifest);
  const payload: StoredExperience = { version: 1, savedAt: new Date().toISOString(), manifest: valid };
  localStorage.setItem(`${prefix}${valid.id}`, JSON.stringify(payload));
  const index = readIndex().filter((id) => id !== valid.id);
  index.unshift(valid.id);
  const trimmed = index.slice(0, maxEntries);
  index.slice(maxEntries).forEach((id) => localStorage.removeItem(`${prefix}${id}`));
  localStorage.setItem(indexKey, JSON.stringify(trimmed));
  return valid.id;
}

export function loadGeneratedExperience(id: string): ExperienceManifest | null {
  if (!/^[a-z0-9][a-z0-9:_-]*$/.test(id)) return null;
  try {
    const raw = localStorage.getItem(`${prefix}${id}`);
    if (!raw) return null;
    const payload = JSON.parse(raw) as StoredExperience;
    if (payload.version !== 1) return null;
    return assertExperienceManifest(payload.manifest);
  } catch (error) {
    console.warn('[signal-lab] Invalid generated experience ignored.', error);
    return null;
  }
}

function readIndex(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(indexKey) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}
