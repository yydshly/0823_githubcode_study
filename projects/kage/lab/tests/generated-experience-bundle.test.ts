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

  it('rejects direct access to an embedding workbench origin', () => {
    for (const content of [
      'parent.document.body.innerHTML = "";',
      'top.location.href = "/";',
      'window.parent.document.title = "changed";',
      'self.parent.document.title = "changed";',
      'globalThis.parent.location.href = "/escape";',
      'frameElement?.removeAttribute("sandbox");',
      'document.defaultView?.parent.postMessage("x", "*");',
      'document.domain = "localhost";'
    ]) {
      const files = validBundle.files.map((file) => file.path === 'src/director.ts' ? { ...file, content } : file);
      expect(() => assertGeneratedExperienceBundle({ ...validBundle, files })).toThrow('不允许的运行能力');
    }
  });

  it('allows ordinary object properties that share embedding-global names', () => {
    const content = `
      import * as THREE from 'three';
      const group = new THREE.Group();
      const child = new THREE.Group();
      group.add(child);
      child.parent?.remove(child);
      const bounds = { top: 0 };
      const metadata = { opener: null, frameElement: 'preview' };
      const topEdge = bounds.top;
      const sourceOpener = metadata.opener;
      const sourceFrame = metadata.frameElement;
      export { bounds, metadata, topEdge, sourceOpener, sourceFrame };
    `;
    const files = validBundle.files.map((file) => file.path === 'src/scene.ts' ? { ...file, content } : file);
    expect(() => assertGeneratedExperienceBundle({ ...validBundle, files })).not.toThrow();
  });

  it('rejects CSS imports and remote URL references before materialization', () => {
    for (const content of [
      "@import url('https://fonts.googleapis.com/css2?family=DM+Mono');",
      "@import './theme.css';",
      '.hero { background-image: url("//cdn.example.com/hero.webp"); }',
      '.hero { background-image: url(https\\3a //cdn.example.com/hero.webp); }',
      '.hero { background-image: url("h\\74 tps://cdn.example.com/hero.webp"); }',
      '.hero { background-image: url("blob:https://example.com/generated"); }',
      '.hero { background-image: image-set("https://cdn.example.com/hero.webp" 1x, "./hero@2x.webp" 2x); }',
      ".hero { background-image: -webkit-image-set('//cdn.example.com/hero.webp' 1x); }",
      '.hero { background-image: image("h\\74 tps://cdn.example.com/hero.webp"); }',
      '.hero { background-image: src("https://cdn.example.com/hero.webp"); }'
    ]) {
      const files = validBundle.files.map((file) => file.path === 'src/page.css' ? { ...file, content } : file);
      expect(() => assertGeneratedExperienceBundle({ ...validBundle, files })).toThrow('CSS 网络');
    }
  });

  it('allows data and local CSS resources without mistaking comments or strings for requests', () => {
    const content = `
      /* @import url('https://example.com/not-loaded.css'); */
      .hero { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"); }
      .texture { background-image: url('../assets/texture.webp'); }
      .mask { mask-image: url('/creative-assets/mask.svg#shape'); filter: url('#soft-shadow'); }
      .responsive { background-image: image-set("data:image/webp;base64,UklGRg==" 1x, "../assets/texture@2x.webp" 2x); }
      .fallback { background-image: -webkit-image-set('/creative-assets/texture.webp' 1x); }
      .source { background-image: src("./texture.webp"); }
      .note::after { content: "url(https://example.com/not-a-request.webp)"; }
      .literal::after { content: "image-set(https://example.com/not-a-request.webp)"; }
    `;
    const files = validBundle.files.map((file) => file.path === 'src/page.css' ? { ...file, content } : file);
    expect(() => assertGeneratedExperienceBundle({ ...validBundle, files })).not.toThrow();
  });
});
