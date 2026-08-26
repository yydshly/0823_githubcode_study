import catalog from '../../cases/catalog.json'

const params = new URLSearchParams(window.location.search)
const caseId = params.get('id') ?? ''
const selected = catalog.cases.find((item) => item.id === caseId)
const app = document.querySelector<HTMLElement>('#app')

const cases: Record<string, { style: () => Promise<unknown>; experience: () => Promise<unknown> }> = {
  'dedicated-ba4e9d10caaa-depth-field': {
    style: () => import('../../cases/runs/dedicated-ba4e9d10caaa-depth-field/src/page.css'),
    experience: () => import('../../cases/runs/dedicated-ba4e9d10caaa-depth-field/src/experience.ts'),
  },
  'dedicated-r36-delivery-final': {
    style: () => import('../../cases/runs/dedicated-r36-delivery-final/src/page.css'),
    experience: () => import('../../cases/runs/dedicated-r36-delivery-final/src/experience.ts'),
  },
  'dedicated-896cfb7e6657': {
    style: () => import('../../cases/runs/dedicated-896cfb7e6657/src/page.css'),
    experience: () => import('../../cases/runs/dedicated-896cfb7e6657/src/experience.ts'),
  },
  'dedicated-1edb98865f4c': {
    style: () => import('../../cases/runs/dedicated-1edb98865f4c/src/page.css'),
    experience: () => import('../../cases/runs/dedicated-1edb98865f4c/src/experience.ts'),
  },
  'dedicated-8574ee46ab16': {
    style: () => import('../../cases/runs/dedicated-8574ee46ab16/src/page.css'),
    experience: () => import('../../cases/runs/dedicated-8574ee46ab16/src/experience.ts'),
  },
  'dedicated-1b9f0b05107b': {
    style: () => import('../../cases/runs/dedicated-1b9f0b05107b/src/page.css'),
    experience: () => import('../../cases/runs/dedicated-1b9f0b05107b/src/experience.ts'),
  },
}

async function start() {
  const loaders = cases[caseId]
  if (!app || !selected || !loaders) {
    if (app) {
      app.innerHTML = '<section class="case-error"><h1>案例未找到</h1><p>这个地址没有对应的 V1 归档结果，请返回案例目录重新选择。</p><a href="./">返回 V1 案例目录</a></section>'
    }
    return
  }

  document.title = `${selected.title} · Kage V1`
  await loaders.style()
  await loaders.experience()
}

void start().catch((error: unknown) => {
  console.error(error)
  if (app) {
    app.innerHTML = '<section class="case-error"><h1>案例启动失败</h1><p>归档文件存在，但浏览器未能启动当前体验。请查看控制台获得具体错误。</p><a href="./">返回 V1 案例目录</a></section>'
  }
})
