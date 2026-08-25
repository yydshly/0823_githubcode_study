import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const playwrightPath=path.resolve(project,'..','kage','lab','node_modules','playwright','index.mjs');
const {chromium}=await import(pathToFileURL(playwrightPath));
const url='http://127.0.0.1:8882/projects/kindergrimm/scene-studio/';
const evidenceDir=path.join(project,'evidence');
const errors=[];

async function open(context,label,suffix=''){
  const page=await context.newPage();
  page.on('console',message=>{if(message.type()==='error')errors.push({label,message:message.text()});});
  page.on('pageerror',error=>errors.push({label,message:error.message}));
  await page.goto(url+suffix,{waitUntil:'networkidle'});await page.waitForFunction(()=>Boolean(window.__sceneStudio));return page;
}
async function compile(page){await page.locator('.compile-button').click();await page.waitForFunction(()=>Boolean(window.__sceneStudio.snapshot().contract));}
async function choosePreset(page,id){await page.locator(`[data-preset="${id}"]`).click();}

const browser=await chromium.launch({headless:true});

const desktopContext=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});
const desktop=await open(desktopContext,'desktop');
const idle=await desktop.evaluate(()=>({
  state:document.querySelector('#scene-stage').dataset.state,
  emptyVisible:!document.querySelector('#scene-empty').hidden,
  contract:window.__sceneStudio.snapshot().contract,
  inputLength:document.querySelector('#scene-brief').value.length
}));
await compile(desktop);
const flood=await desktop.evaluate(()=>({
  snapshot:window.__sceneStudio.snapshot(),
  viewport:innerWidth,
  scrollWidth:document.documentElement.scrollWidth,
  sceneRect:document.querySelector('#scene-stage').getBoundingClientRect().toJSON(),
  planItems:document.querySelectorAll('.plan-item').length,
  hotspots:document.querySelectorAll('.scene-hotspot').length,
  downloadEnabled:!document.querySelector('#download-contract').disabled
}));
await desktop.screenshot({path:path.join(evidenceDir,'scene-studio-desktop-flood.png'),fullPage:true});
const gapIntent='做一个夜晚港口场景，信使坐着小船带小狗穿过木桥，使用墨刻风格。';
await desktop.locator('#scene-brief').fill(gapIntent);await compile(desktop);
const gap=await desktop.evaluate(()=>({
  snapshot:window.__sceneStudio.snapshot(),
  gapCards:document.querySelectorAll('.plan-item[data-status="capability-gap"]').length,
  backlogVisible:!document.querySelector('#gap-backlog').hidden,
  gapBadge:Array.from(document.querySelectorAll('#scene-badges span')).find(node=>node.textContent.startsWith('GAP'))?.textContent
}));
await desktop.screenshot({path:path.join(evidenceDir,'scene-studio-capability-gap.png'),fullPage:true});
await choosePreset(desktop,'flood-warning');await compile(desktop);await desktop.locator('[data-revision="felt"]').click();
const revised=await desktop.evaluate(()=>window.__sceneStudio.snapshot());
await desktop.screenshot({path:path.join(evidenceDir,'scene-studio-felt-revision.png'),fullPage:true});
await desktopContext.close();

const tabletContext=await browser.newContext({viewport:{width:1024,height:900},deviceScaleFactor:1});
const tabletPage=await open(tabletContext,'tablet');await choosePreset(tabletPage,'moonharbor-letter');await compile(tabletPage);
const tablet=await tabletPage.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,snapshot:window.__sceneStudio.snapshot(),columns:getComputedStyle(document.querySelector('.studio-shell')).gridTemplateColumns}));
await tabletPage.screenshot({path:path.join(evidenceDir,'scene-studio-tablet.png'),fullPage:true});await tabletContext.close();

const mobileContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const mobilePage=await open(mobileContext,'mobile');await choosePreset(mobilePage,'sunny-wayfinding');await compile(mobilePage);
const mobile=await mobilePage.evaluate(()=>({
  viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,snapshot:window.__sceneStudio.snapshot(),
  inputTop:Math.round(document.querySelector('#scene-brief').getBoundingClientRect().top+scrollY),
  sceneTop:Math.round(document.querySelector('#scene-stage').getBoundingClientRect().top+scrollY),
  planTop:Math.round(document.querySelector('#asset-plan').getBoundingClientRect().top+scrollY),
  compileVisible:Boolean(document.querySelector('.compile-button'))
}));
await mobilePage.screenshot({path:path.join(evidenceDir,'scene-studio-mobile.png'),fullPage:true});await mobileContext.close();

const keyboardContext=await browser.newContext({viewport:{width:1280,height:800}});
const keyboardPage=await open(keyboardContext,'keyboard');
await keyboardPage.locator('#scene-brief').focus();await keyboardPage.locator('#scene-brief').fill('做一个儿童森林指路场景，信使拿着路标和护符，使用毛毡风格。');await keyboardPage.keyboard.press('Tab');
const focusedBefore=await keyboardPage.evaluate(()=>({tag:document.activeElement.tagName,className:document.activeElement.className,outline:getComputedStyle(document.activeElement).outlineWidth}));
await keyboardPage.keyboard.press('Enter');await keyboardPage.waitForFunction(()=>Boolean(window.__sceneStudio.snapshot().contract));
await keyboardPage.locator('[data-revision="urgent"]').focus();const revisionOutline=await keyboardPage.evaluate(()=>getComputedStyle(document.activeElement).outlineWidth);await keyboardPage.keyboard.press('Enter');
const keyboardState=await keyboardPage.evaluate(()=>({snapshot:window.__sceneStudio.snapshot(),activeTag:document.activeElement.tagName}));
const keyboard={...keyboardState,focusedBefore,revisionOutline};
await keyboardContext.close();

const errorContext=await browser.newContext({viewport:{width:1280,height:800}});const errorPage=await open(errorContext,'error');await errorPage.locator('#scene-brief').fill('');await errorPage.locator('.compile-button').click();
const errorState=await errorPage.evaluate(()=>({message:document.querySelector('#intent-error').textContent,visible:!document.querySelector('#intent-error').hidden,focused:document.activeElement.id,state:document.querySelector('#scene-stage').dataset.state}));await errorContext.close();

const reducedContext=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});const reducedPage=await open(reducedContext,'reduced');const reduced=await reducedPage.evaluate(()=>({matched:matchMedia('(prefers-reduced-motion: reduce)').matches,duration:getComputedStyle(document.querySelector('.compile-button')).transitionDuration}));await reducedContext.close();

const fallbackContext=await browser.newContext({viewport:{width:1280,height:800}});const fallbackPage=await open(fallbackContext,'canvas-off','?canvas-off');await compile(fallbackPage);
const canvasOff=await fallbackPage.evaluate(()=>({snapshot:window.__sceneStudio.snapshot(),fallbackVisible:!document.querySelector('#canvas-fallback').hidden,canvasHidden:document.querySelector('#scene-canvas').hidden,planItems:document.querySelectorAll('.plan-item').length,downloadEnabled:!document.querySelector('#download-contract').disabled}));
await fallbackPage.screenshot({path:path.join(evidenceDir,'scene-studio-canvas-off.png'),fullPage:true});await fallbackContext.close();

await browser.close();
const report={schemaVersion:'kindergrimm-scene-studio-browser-review/1.0',canonicalUrl:url,capturedAt:new Date().toISOString(),idle,flood,gap,revised,tablet,mobile,keyboard,errorState,reduced,canvasOff,consoleErrors:errors,evidence:[
  'evidence/scene-studio-desktop-flood.png','evidence/scene-studio-capability-gap.png','evidence/scene-studio-felt-revision.png','evidence/scene-studio-tablet.png','evidence/scene-studio-mobile.png','evidence/scene-studio-canvas-off.png'
]};
await fs.writeFile(path.join(project,'analysis','scene-studio-browser-review.json'),JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report,null,2));
