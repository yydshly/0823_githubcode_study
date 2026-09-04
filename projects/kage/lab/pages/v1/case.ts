import catalog from '../../cases/catalog.json'

const params = new URLSearchParams(window.location.search)
const caseId = params.get('id') ?? ''
const selected = catalog.cases.find((item) => item.id === caseId)
const app = document.querySelector<HTMLElement>('#app')

// Keep the frozen catalog and the runnable package inventory in sync. Vite
// resolves these imports at build time, so the GitHub Pages archive remains a
// static site while every catalogued V1 case can still start its own module.
const styleModules = import.meta.glob('../../cases/runs/*/src/page.css')
const experienceModules = import.meta.glob('../../cases/runs/*/src/experience.ts')

function loaderFor(id: string, file: 'page.css' | 'experience.ts'): (() => Promise<unknown>) | undefined {
  const key = `../../cases/runs/${id}/src/${file}`
  return file === 'page.css' ? styleModules[key] : experienceModules[key]
}

async function start() {
  const style = loaderFor(caseId, 'page.css')
  const experience = loaderFor(caseId, 'experience.ts')
  if (!app || !selected || !style || !experience) {
    if (app) {
      app.innerHTML = '<section class="case-error"><h1>案例未找到</h1><p>这个地址没有对应的 V1 归档结果，请返回案例目录重新选择。</p><a href="./">返回 V1 案例目录</a></section>'
    }
    return
  }

  document.title = `${selected.title} · Kage V1`
  await style()
  await experience()
}

void start().catch((error: unknown) => {
  console.error(error)
  if (app) {
    app.innerHTML = '<section class="case-error"><h1>案例启动失败</h1><p>归档文件存在，但浏览器未能启动当前体验。请查看控制台获得具体错误。</p><a href="./">返回 V1 案例目录</a></section>'
  }
})
