import { describe, expect, it } from 'vitest';
import { assertGeneratedExperienceBundle, generatedBundleSummary } from '../src/generation/generated-experience-bundle';

const validBundle = {
  schemaVersion: 1 as const,
  id: 'fluid-fashion-release',
  runId: 'run-fashion-17',
  effectSpecId: 'effect-fashion-17',
  kind: 'dedicated-module' as const,
  entry: 'src/experience.ts' as const,
  files: [
    { path: 'src/experience.ts', language: 'typescript' as const, content: "import { defineExperience } from '@signal-lab/experience-sdk';\nexport default defineExperience({});" },
    { path: 'src/scene.ts', language: 'typescript' as const, content: "import * as THREE from 'three';\nexport const scene = new THREE.Scene();" },
    { path: 'src/director.ts', language: 'typescript' as const, content: 'export const update = (progress: number) => progress;' },
    { path: 'src/page.css', language: 'css' as const, content: ':root { color: white; background: black; }' },
    { path: 'src/shaders/fluid.frag', language: 'glsl' as const, content: 'void main(){ gl_FragColor = vec4(1.0); }' }
  ],
  assets: [],
  contract: {
    sdkVersion: 1 as const,
    imports: ['three', '@signal-lab/experience-sdk'] as const,
    lifecycle: ['mount', 'update', 'resize', 'dispose'] as const,
    network: 'disabled' as const,
    deterministicTimeline: true
  }
};

describe('GeneratedExperienceBundle', () => {
  it('accepts a dedicated page module and reports its production shape', () => {
    const bundle = assertGeneratedExperienceBundle(validBundle);
    expect(generatedBundleSummary(bundle)).toMatchObject({ files: 5, assets: 0, hasShaders: true });
  });

  it('rejects missing lifecycle files and network-capable source', () => {
    expect(() => assertGeneratedExperienceBundle({ ...validBundle, files: validBundle.files.filter((file) => file.path !== 'src/director.ts') })).toThrow('src/director.ts');
    const files = validBundle.files.map((file) => file.path === 'src/scene.ts' ? { ...file, content: "fetch('https://example.com')" } : file);
    expect(() => assertGeneratedExperienceBundle({ ...validBundle, files })).toThrow('不允许的运行能力');
  });

  it('rejects path traversal before materialization', () => {
    const files = [...validBundle.files, { path: 'src/../secrets.ts', language: 'typescript' as const, content: 'export {}' }];
    expect(() => assertGeneratedExperienceBundle({ ...validBundle, files })).toThrow();
  });
});
