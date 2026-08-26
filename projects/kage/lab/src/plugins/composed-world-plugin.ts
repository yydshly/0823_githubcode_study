import * as THREE from 'three';
import type { ComposedSceneRecipe } from '../experience/schema';
import type { PluginContext, RuntimeFrame, ScenePlugin } from '../runtime/plugin-contract';
import type { EffectiveQuality } from '../runtime/quality';

const qualityScale: Readonly<Record<EffectiveQuality, number>> = { high: 1, balanced: .68, low: .38 };

export class ComposedWorldPlugin implements ScenePlugin {
  readonly id = 'composed-world';
  private readonly group = new THREE.Group();
  private readonly fieldGroup = new THREE.Group();
  private readonly disposables: Array<{ dispose: () => void }> = [];
  private context!: PluginContext;
  private recipe!: ComposedSceneRecipe;
  private hero!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  private field: THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | null = null;
  private halo: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial> | null = null;
  private quality: EffectiveQuality = 'balanced';
  private instanceCount = 0;

  initialize(context: PluginContext): void {
    if (!context.definition.recipe) throw new Error('composed-world requires a scene recipe.');
    this.context = context;
    this.recipe = context.definition.recipe;
    context.scene.background = new THREE.Color(context.theme.deep);
    context.scene.fog = new THREE.FogExp2(context.theme.deep, .022 * this.recipe.atmosphere.fogScale);
    context.root.add(this.group);
    this.group.add(this.fieldGroup);

    const ambient = new THREE.HemisphereLight(context.theme.text, context.theme.deep, 1.35);
    const key = new THREE.DirectionalLight(context.theme.accentSoft, 3.6);
    key.position.set(5, 8, 6);
    const rim = new THREE.PointLight(context.theme.accent, 10, 24, 1.8);
    rim.position.set(-5, 2, -4);
    this.group.add(ambient, key, rim);

    const geometry = createHeroGeometry(this.recipe.hero.form);
    const material = createHeroMaterial(this.recipe.hero.material, context);
    this.hero = new THREE.Mesh(geometry, material);
    this.hero.position.y = this.recipe.atmosphere.floor ? 1.5 : .6;
    this.hero.castShadow = true;
    this.hero.receiveShadow = true;
    this.group.add(this.hero);
    this.disposables.push(geometry, material);

    if (this.recipe.atmosphere.halo) {
      const haloGeometry = new THREE.TorusGeometry(this.recipe.hero.scale * 1.45, .018, 6, 128);
      const haloMaterial = new THREE.MeshBasicMaterial({ color: context.theme.accent, transparent: true, opacity: .48, blending: THREE.AdditiveBlending, depthWrite: false });
      this.halo = new THREE.Mesh(haloGeometry, haloMaterial);
      this.halo.position.copy(this.hero.position);
      this.halo.rotation.set(1.1, .25, .15);
      this.group.add(this.halo);
      this.disposables.push(haloGeometry, haloMaterial);
    }

    if (this.recipe.atmosphere.floor) {
      const floorGeometry = new THREE.CircleGeometry(this.recipe.field.radius * 1.35, 64);
      const floorMaterial = new THREE.MeshStandardMaterial({ color: context.theme.surface, roughness: .84, metalness: .08, transparent: true, opacity: .62 });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -.05;
      floor.receiveShadow = true;
      this.group.add(floor);
      this.disposables.push(floorGeometry, floorMaterial);
    }

    this.buildField();
  }

  setQuality(quality: EffectiveQuality): void {
    if (this.quality === quality) return;
    this.quality = quality;
    this.buildField();
  }

  update({ state, elapsed, pointer }: RuntimeFrame): void {
    const motion = this.recipe.motion;
    this.group.rotation.y = elapsed * motion.rotation * .12 * state.energy;
    this.group.position.x = pointer.x * motion.pointer * .42;
    this.group.position.y = pointer.y * motion.pointer * .18;
    this.fieldGroup.rotation.y = -elapsed * motion.drift * .08;
    this.fieldGroup.position.y = Math.sin(elapsed * .32) * motion.drift * .2;
    this.fieldGroup.scale.setScalar(.35 + state.assembly * .65);
    if (this.field) {
      this.field.material.opacity = .18 + state.density * .68;
      this.field.material.emissive.lerp(state.accent, .035);
    }
    this.hero.rotation.x = elapsed * motion.rotation * .2;
    this.hero.rotation.y = elapsed * motion.rotation * .34;
    const pulse = 1 + Math.sin(elapsed * (1.1 + motion.pulse)) * .035 * motion.pulse * state.energy;
    this.hero.scale.setScalar(this.recipe.hero.scale * (.42 + state.assembly * .58) * pulse);
    this.hero.material.emissive.lerp(state.accent, .04);
    this.hero.material.emissiveIntensity = .12 + state.energy * .72;
    if (this.halo) {
      this.halo.rotation.z = elapsed * motion.rotation * .28;
      this.halo.scale.setScalar(.55 + state.assembly * .45);
      this.halo.material.opacity = .12 + state.energy * .48;
      this.halo.material.color.lerp(state.accent, .04);
    }
    if (this.context.scene.fog instanceof THREE.FogExp2) {
      this.context.scene.fog.density = (.007 + state.fog * .038) * this.recipe.atmosphere.fogScale;
    }
  }

  snapshot() {
    return {
      id: this.id,
      metrics: {
        sourceEffectSpecId: this.recipe.sourceEffectSpecId,
        heroForm: this.recipe.hero.form,
        heroMaterial: this.recipe.hero.material,
        fieldForm: this.recipe.field.form,
        instances: this.instanceCount,
        omittedAssets: this.recipe.omittedAssetRequirements,
        preset: this.context.definition.preset
      }
    };
  }

  dispose(): void {
    this.clearField();
    this.disposables.forEach((item) => item.dispose());
    this.disposables.length = 0;
    this.group.removeFromParent();
  }

  private buildField(): void {
    this.clearField();
    this.instanceCount = Math.max(12, Math.round(this.recipe.field.count * qualityScale[this.quality]));
    const geometry = new THREE.OctahedronGeometry(.12, this.quality === 'high' ? 1 : 0);
    const material = new THREE.MeshStandardMaterial({ color: this.context.theme.accentSoft, emissive: this.context.theme.accent, emissiveIntensity: .28, roughness: .38, metalness: .22, transparent: true, opacity: .72 });
    const field = new THREE.InstancedMesh(geometry, material, this.instanceCount);
    const random = seededRandom(this.context.definition.seed);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const accent = new THREE.Color(this.context.theme.accent);
    const soft = new THREE.Color(this.context.theme.accentSoft);
    for (let index = 0; index < this.instanceCount; index += 1) {
      const position = fieldPosition(this.recipe.field.form, index, this.instanceCount, this.recipe.field.radius, random);
      dummy.position.copy(position);
      dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      dummy.scale.setScalar(.55 + random() * 1.7);
      dummy.updateMatrix();
      field.setMatrixAt(index, dummy.matrix);
      field.setColorAt(index, color.copy(accent).lerp(soft, random()));
    }
    field.instanceMatrix.needsUpdate = true;
    if (field.instanceColor) field.instanceColor.needsUpdate = true;
    this.field = field;
    this.fieldGroup.add(field);
  }

  private clearField(): void {
    if (!this.field) return;
    this.field.geometry.dispose();
    this.field.material.dispose();
    this.field.removeFromParent();
    this.field = null;
  }
}

function createHeroGeometry(form: ComposedSceneRecipe['hero']['form']): THREE.BufferGeometry {
  if (form === 'crystal') return new THREE.OctahedronGeometry(1, 2);
  if (form === 'monolith') return new THREE.BoxGeometry(.85, 1.7, .72, 4, 8, 4);
  if (form === 'knot') return new THREE.TorusKnotGeometry(.72, .22, 128, 20);
  return new THREE.IcosahedronGeometry(1, 3);
}

function createHeroMaterial(material: ComposedSceneRecipe['hero']['material'], context: PluginContext): THREE.MeshPhysicalMaterial {
  if (material === 'glass') return new THREE.MeshPhysicalMaterial({ color: context.theme.accentSoft, emissive: context.theme.accent, emissiveIntensity: .14, roughness: .12, metalness: .05, transmission: .55, thickness: 1.2, transparent: true, opacity: .84 });
  if (material === 'metal') return new THREE.MeshPhysicalMaterial({ color: context.theme.surface, emissive: context.theme.accent, emissiveIntensity: .18, roughness: .24, metalness: .88, clearcoat: .7 });
  if (material === 'emissive') return new THREE.MeshPhysicalMaterial({ color: context.theme.accent, emissive: context.theme.accent, emissiveIntensity: .8, roughness: .3, metalness: .18 });
  return new THREE.MeshPhysicalMaterial({ color: context.theme.accentSoft, emissive: context.theme.accent, emissiveIntensity: .12, roughness: .72, metalness: .08 });
}

function fieldPosition(
  form: ComposedSceneRecipe['field']['form'],
  index: number,
  count: number,
  radius: number,
  random: () => number
): THREE.Vector3 {
  const progress = index / Math.max(1, count - 1);
  if (form === 'grid') {
    const side = Math.ceil(Math.sqrt(count));
    const x = ((index % side) / Math.max(1, side - 1) - .5) * radius * 1.8;
    const z = (Math.floor(index / side) / Math.max(1, side - 1) - .5) * radius * 1.8;
    return new THREE.Vector3(x, .18 + random() * 1.6, z);
  }
  if (form === 'stream') {
    const x = (progress - .5) * radius * 2.2;
    return new THREE.Vector3(x, 1.2 + Math.sin(progress * Math.PI * 5) * 1.2, Math.cos(progress * Math.PI * 4) * radius * .42);
  }
  if (form === 'constellation') {
    const longitude = progress * Math.PI * 8 + random() * .6;
    const latitude = Math.acos(2 * random() - 1);
    const distance = radius * (.38 + random() * .62);
    return new THREE.Vector3(Math.sin(latitude) * Math.cos(longitude) * distance, Math.cos(latitude) * distance + 1.4, Math.sin(latitude) * Math.sin(longitude) * distance);
  }
  const angle = progress * Math.PI * 8;
  const ringRadius = radius * (.45 + (index % 4) * .14);
  return new THREE.Vector3(Math.cos(angle) * ringRadius, .6 + (index % 5) * .42, Math.sin(angle) * ringRadius);
}

function seededRandom(seed: number): () => number {
  let value = seed || 1;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}
