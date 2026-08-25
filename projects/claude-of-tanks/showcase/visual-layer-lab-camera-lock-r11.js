const params = new URLSearchParams(location.search);
const isCanonicalLab = params.get('showcase') === 'capabilities' && params.get('lab') === 'layers';

function installCameraLock() {
  const lab = window.__COT_VISUAL_LAYER_LAB;
  if (!lab?.r10?.installed || lab.r11?.installed) return false;

  const baseSetCamera = lab.setCamera.bind(lab);
  const baseSetStage = lab.setStage.bind(lab);
  lab.r11 = {
    installed: true,
    cinematicPreset: null,
  };

  lab.setCamera = function setCameraR11(kind) {
    if (kind === 'cinematic' && this.r11.cinematicPreset) {
      this.r2.cameraPresets.cinematic = structuredClone(this.r11.cinematicPreset);
      this.studio.setCamera(this.r11.cinematicPreset);
      return;
    }
    baseSetCamera(kind);
    if (kind === 'cinematic' && this.r2.cameraPresets.cinematic) {
      this.r11.cinematicPreset = structuredClone(this.r2.cameraPresets.cinematic);
    }
  };

  lab.setStage = async function setStageR11(index) {
    const next = Math.max(0, Math.min(6, Number(index) || 0));
    if (next === 6 && !this.r11.cinematicPreset) {
      await baseSetStage(5);
    }
    return baseSetStage(next);
  };
  return true;
}

if (isCanonicalLab && !installCameraLock()) {
  const timer = setInterval(() => {
    if (installCameraLock()) clearInterval(timer);
  }, 50);
  setTimeout(() => clearInterval(timer), 30000);
}

export const VISUAL_LAYER_LAB_REFINEMENT_VERSION = 11;
