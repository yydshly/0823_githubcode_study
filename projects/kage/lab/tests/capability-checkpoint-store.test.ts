import { beforeEach, describe, expect, it, vi } from 'vitest';
import { experiences } from '../src/experience/fixtures';
import {
  listCapabilityCheckpoints,
  loadCapabilityCheckpoint,
  removeCapabilityCheckpoint,
  saveCapabilityCheckpoint
} from '../src/generation/capability-checkpoint-store';

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string, value: string): void { this.data.set(key, value); }
}

describe('capability checkpoint store', () => {
  beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));

  it('saves, lists, loads and removes a runnable result without a model call', () => {
    const saved = saveCapabilityCheckpoint({
      label: '声之形',
      brief: '为一款声学设备构建产品网页',
      quality: 'high',
      provider: 'codex:gpt-5.4',
      model: 'gpt-5.4',
      seed: 17,
      runId: 'run-acoustic',
      selectedId: 'candidate-acoustic',
      scenePlugin: 'composed-world',
      productionStatus: 'adapted',
      manifest: experiences[0]
    });

    expect(listCapabilityCheckpoints()).toHaveLength(1);
    expect(loadCapabilityCheckpoint(saved.id)?.manifest.id).toBe(experiences[0].id);
    expect(removeCapabilityCheckpoint(saved.id)).toBe(true);
    expect(listCapabilityCheckpoints()).toEqual([]);
  });

  it('rejects corrupted or traversing checkpoint ids', () => {
    expect(loadCapabilityCheckpoint('../secret')).toBeNull();
    expect(removeCapabilityCheckpoint('../secret')).toBe(false);
  });
});
