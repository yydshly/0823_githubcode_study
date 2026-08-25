import '/@cot-research/visual-layer-lab-core.js';

const lab = window.__COT_VISUAL_LAYER_LAB;
if (lab) {
  const restore = lab.restore.bind(lab);
  lab.restore = () => {
    if (!lab.originalPostRender || !window.__DEBUG) return;
    restore();
  };
}
