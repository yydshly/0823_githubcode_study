export type Vec3 = readonly [number, number, number];
export type NodeLayout = 'left' | 'right' | 'center';
export type TransitionKind = 'glide' | 'cut' | 'fade' | 'morph';
export type OverlayKind = 'metric' | 'quote' | 'diagram';
export type DriverKind = 'scroll' | 'timeline' | 'choice' | 'explore';

export interface ThemeTokens {
  deep: string;
  surface: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
}

export interface CameraShot {
  eye: Vec3;
  look: Vec3;
  fov: number;
  portrait?: {
    eye: Vec3;
    look: Vec3;
    fov: number;
  };
  transition?: TransitionKind;
}

export interface SceneStateValue {
  assembly: number;
  energy: number;
  density: number;
  fog: number;
  accent: string;
  focus?: string;
}

export interface TrackKeyframe<T> {
  at: number;
  value: T;
  easing?: 'linear' | 'smoothstep' | 'smootherstep';
}

export interface CameraTrackDefinition {
  id: string;
  keyframes: readonly TrackKeyframe<CameraShot>[];
}

export interface SceneTrackDefinition {
  id: string;
  keyframes: readonly TrackKeyframe<SceneStateValue>[];
}

export interface NodeContent {
  navLabel?: string;
  kicker?: string;
  title: string;
  paragraphs: readonly string[];
  overlay?: {
    kind: OverlayKind;
    value?: string;
    caption: string;
  };
}

export interface ExperienceNode {
  id: string;
  type: 'hero' | 'story' | 'transition' | 'showcase' | 'comparison' | 'interaction' | 'choice' | 'cta' | 'credits';
  content: NodeContent;
  layout: NodeLayout;
  span: {
    mode: 'viewport' | 'time' | 'content' | 'adaptive';
    value?: number;
  };
  tracks: {
    camera?: string;
    scene?: string;
  };
  sceneId?: string;
  effectIds?: readonly string[];
}

export type FlowTrigger =
  | { type: 'scroll-complete' }
  | { type: 'choice'; value: string; isDefault?: boolean }
  | { type: 'timeout'; milliseconds: number }
  | { type: 'event'; name: string };

export interface ExperienceFlow {
  id: string;
  from: string;
  to: string;
  trigger: FlowTrigger;
  transition?: {
    type: TransitionKind;
    duration?: number;
  };
}

export interface DriverDefinition {
  id: string;
  type: DriverKind;
  primary?: boolean;
}

export interface SceneAssetReference {
  id: string;
  role: string;
  modality: 'image' | 'texture' | 'sprite' | 'model-3d' | 'avatar' | 'environment' | 'audio' | 'video' | 'font';
  uri: string;
  source: 'model-generated' | 'user-provided' | 'licensed-library' | 'procedural';
  qualityLevel: 'L0-missing' | 'L1-placeholder' | 'L2-inspectable' | 'L3-presentable' | 'L4-cinematic' | 'L5-production';
  payloadBytes: number;
  required?: boolean;
  experience?: {
    anchor: number;
    function: 'establish' | 'develop' | 'transform' | 'resolve' | 'persistent';
    visualState: string;
    continuity: string;
    integration: 'alpha-subject' | 'full-bleed-environment' | 'seamless-field' | 'spatial-object' | 'native-media';
  };
}

export interface PostprocessDefinition {
  type: 'bloom';
  strength: number;
  radius: number;
  threshold: number;
}

export interface SceneDefinition {
  id: string;
  plugin: string;
  preset: string;
  seed: number;
  effectPlugins?: readonly string[];
  recipe?: ComposedSceneRecipe;
  assets?: readonly SceneAssetReference[];
  postprocess?: PostprocessDefinition;
}

export interface ComposedSceneRecipe {
  version: 1;
  sourceEffectSpecId: string;
  hero: {
    form: 'orb' | 'crystal' | 'monolith' | 'knot';
    material: 'glass' | 'metal' | 'emissive' | 'matte';
    scale: number;
  };
  field: {
    form: 'rings' | 'constellation' | 'stream' | 'grid';
    count: number;
    radius: number;
  };
  atmosphere: {
    floor: boolean;
    halo: boolean;
    fogScale: number;
  };
  motion: {
    rotation: number;
    pulse: number;
    drift: number;
    pointer: number;
  };
  omittedAssetRequirements: number;
}

export interface ExperienceManifest {
  schemaVersion: 2;
  id: string;
  title: string;
  summary: string;
  audience: string;
  entryNodeId: string;
  presentation?: {
    brandLabel: string;
    footerLabel: string;
    footerCopy: string;
  };
  theme: ThemeTokens;
  nodes: Readonly<Record<string, ExperienceNode>>;
  flows: readonly ExperienceFlow[];
  drivers: readonly DriverDefinition[];
  scenes: Readonly<Record<string, SceneDefinition>>;
  cameraTracks: Readonly<Record<string, CameraTrackDefinition>>;
  sceneTracks: Readonly<Record<string, SceneTrackDefinition>>;
  accessibility: {
    fallbackMode: 'semantic-dom';
    reducedMotion: 'static-shot' | 'limited';
  };
}

export interface ExperienceDiagnostic {
  level: 'error' | 'warning';
  code: string;
  path: string;
  message: string;
}
