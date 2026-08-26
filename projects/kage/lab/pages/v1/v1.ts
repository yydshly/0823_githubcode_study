import catalog from '../../cases/catalog.json'
import fashionPreview from '../../docs/evidence/cases-r43/3-dedicated-ba4e9d10caaa-depth-field.jpg'
import greenhousePreview from '../../docs/evidence/cases-r43/2-dedicated-r36-delivery-final.jpg'
import observatoryPreview from '../../docs/evidence/cases-r43/5-dedicated-896cfb7e6657.jpg'
import audioPreview from '../../docs/evidence/cases-r43/1-dedicated-1edb98865f4c.jpg'
import dreamPreview from '../../docs/evidence/cases-r43/4-dedicated-8574ee46ab16.jpg'
import rainPreview from '../../docs/evidence/main-loop-r44/rain-recorder-opening.jpg'
import resonancePreview from '../../docs/screenshots/flagship-desktop-hero.png'
import tidalPreview from '../../docs/screenshots/phase11-tidal-archive-desktop.png'
import chromaticPreview from '../../docs/screenshots/phase1-chromatic-tide.png'

const grid = document.querySelector<HTMLDivElement>('#case-grid')
const showcaseGrid = document.querySelector<HTMLDivElement>('#showcase-grid')

if (!grid || !showcaseGrid) throw new Error('Missing V1 gallery regions')

const casePreviews: Record<string, string> = {
  'dedicated-ba4e9d10caaa-depth-field': fashionPreview,
  'dedicated-r36-delivery-final': greenhousePreview,
  'dedicated-896cfb7e6657': observatoryPreview,
  'dedicated-1edb98865f4c': audioPreview,
  'dedicated-8574ee46ab16': dreamPreview,
  'dedicated-1b9f0b05107b': rainPreview,
}

const showcases = [
  {
    id: 'resonance-flagship',
    index: 'A',
    title: '声之形',
    type: 'ASSET-DRIVEN PRODUCT',
    summary: 'ChatGPT 主视觉与深度图进入 Three.js shader，形成指针视差、滚动镜头和受控 Bloom。',
    image: resonancePreview,
  },
  {
    id: 'tidal-archive',
    index: 'B',
    title: '潮汐记忆档案',
    type: 'GENERATED ENVIRONMENT',
    summary: '水下环境与深度素材叠加档案片、关系线和粒子，验证完整空间叙事。',
    image: tidalPreview,
  },
  {
    id: 'chromatic-tide',
    index: 'C',
    title: '流体色场',
    type: 'PROCEDURAL SHADER',
    summary: '不依赖生成图片，以 Shader 光幕、折光核心和编辑化色场验证另一种视觉语法。',
    image: chromaticPreview,
  },
]

showcaseGrid.innerHTML = showcases
  .map(
    (item) => `
      <article class="showcase-card">
        <a href="./showcase/?experience=${item.id}&quality=high&motion=full" target="_blank" rel="noreferrer" aria-label="运行 ${item.title}">
          <img src="${item.image}" alt="${item.title}真实运行画面" loading="lazy" />
          <div class="showcase-shade"></div>
          <span class="index">${item.index}</span>
          <span class="stage">RUNNABLE</span>
          <div class="showcase-copy">
            <p>${item.type}</p>
            <h3>${item.title}</h3>
            <span>${item.summary}</span>
            <b>运行完整效果 ↗</b>
          </div>
        </a>
      </article>
    `,
  )
  .join('')

grid.innerHTML = catalog.cases
  .map(
    (item, index) => `
      <article class="case-card">
        <a href="./case.html?id=${encodeURIComponent(item.id)}" target="_blank" rel="noreferrer" aria-label="打开 ${item.title}">
          <div class="case-visual">
            <img src="${casePreviews[item.id]}" alt="${item.title}真实运行画面" loading="lazy" />
            <div class="case-shade"></div>
            <span class="index">${String(index + 1).padStart(2, '0')}</span>
            <span class="stage">${item.stage === 'featured' ? 'FEATURED' : 'REFINED'}</span>
          </div>
          <div class="case-copy">
            <p class="model">${item.model}</p>
            <h3>${item.title}</h3>
            <p>${item.brief}</p>
            <span class="open">进入完整体验 ↗</span>
          </div>
        </a>
      </article>
    `,
  )
  .join('')
