const style = document.createElement('style');
style.id = 'cot-visual-layer-lab-reduced-motion-r9';
style.textContent = `
  @media (prefers-reduced-motion: reduce) {
    #cot-visual-layer-lab {
      -webkit-backdrop-filter: none !important;
      backdrop-filter: none !important;
    }
  }
`;
document.body.appendChild(style);

export const VISUAL_LAYER_LAB_REFINEMENT_VERSION = 9;
