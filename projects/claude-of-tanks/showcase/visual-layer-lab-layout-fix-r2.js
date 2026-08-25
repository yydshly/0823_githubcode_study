const style = document.createElement('style');
style.id = 'cot-visual-layer-lab-layout-fix-r2';
style.textContent = `
  #cot-visual-layer-lab {
    box-sizing: border-box !important;
    width: min(360px, calc(100vw - 28px)) !important;
    right: 14px !important;
    top: 14px !important;
  }

  @media (max-width: 720px) {
    #cot-visual-layer-lab {
      top: auto !important;
      right: 8px !important;
      bottom: 8px !important;
      left: auto !important;
      width: calc(100vw - 16px) !important;
      max-height: 48vh !important;
    }
  }
`;
document.head.appendChild(style);
