import catalog from '../../cases/catalog.json'

const grid = document.querySelector<HTMLDivElement>('#case-grid')

if (!grid) throw new Error('Missing case grid')

const tones = ['violet', 'amber', 'sky', 'cyan', 'dawn', 'rain']

grid.innerHTML = catalog.cases
  .map(
    (item, index) => `
      <article class="case-card tone-${tones[index % tones.length]}">
        <a href="./case.html?id=${encodeURIComponent(item.id)}" aria-label="打开 ${item.title}">
          <div class="case-visual">
            <span class="index">${String(index + 1).padStart(2, '0')}</span>
            <span class="stage">${item.stage === 'featured' ? 'FEATURED' : 'REFINED'}</span>
            <div class="orb" aria-hidden="true"></div>
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

