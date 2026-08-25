const style = document.createElement('style');
style.id = 'cot-visual-layer-lab-tools-layout-fix-r2';
style.textContent = `
  @media (min-width: 901px) {
    #cot-visual-layer-lab[data-tools-open="true"] {
      right: 404px !important;
    }
  }
`;
document.head.appendChild(style);
