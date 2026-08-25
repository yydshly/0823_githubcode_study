const lab = window.__COT_VISUAL_LAYER_LAB;
const isLayerLab = new URLSearchParams(location.search).get('lab') === 'layers';

if (lab && isLayerLab) {
  const baseRestore = lab.restore.bind(lab);
  const originalActorVisibility = new Map();

  function heroActor() {
    return lab.actors.find((actor) => actor.name === 'red-lead') || lab.actors[0] || null;
  }

  function isolateHero() {
    const hero = heroActor();
    if (!hero) return null;
    for (const actor of lab.actors) {
      const root = actor.visual?.root;
      if (!root) continue;
      if (!originalActorVisibility.has(root)) originalActorVisibility.set(root, root.visible);
      root.visible = actor === hero;
    }
    return hero;
  }

  lab.rememberMaterials = function rememberHeroMaterials() {
    const hero = isolateHero();
    hero?.visual?.root?.traverse((object) => {
      if (object.isMesh && object.material && !this.originalMaterials.has(object)) {
        this.originalMaterials.set(object, object.material);
      }
    });
  };

  lab.restore = function restoreSingleHeroLab() {
    for (const [root, visible] of originalActorVisibility) root.visible = visible;
    originalActorVisibility.clear();
    baseRestore();
  };

  lab.r3 = {
    version: 3,
    mode: 'single-hero',
    originalActorVisibility,
    isolateHero,
  };
}

export const VISUAL_LAYER_LAB_REFINEMENT_VERSION = 3;
