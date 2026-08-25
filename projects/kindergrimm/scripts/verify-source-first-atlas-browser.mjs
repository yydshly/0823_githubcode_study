import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const r=JSON.parse(await fs.readFile(path.join(project,'analysis','source-first-atlas-browser-review.json'),'utf8'));const checks=[];const check=(id,ok,evidence={})=>checks.push({id,ok:Boolean(ok),evidence});
check('atlas.hero-source-first',r.hero.title.includes('先看清源库')&&r.hero.counts.join(',')==='135,18,13,9'&&r.hero.commit==='5857b1e1'&&r.hero.sourceCard,r.hero);
check('atlas.desktop',r.hero.viewport===1440&&r.hero.scrollWidth===1440,r.hero);
check('atlas.live-styles',r.styles.snapshot.proofId==='styles'&&r.styles.frameTitle.includes('styles')&&r.styles.selected.join(',')==='styles',r.styles);
check('atlas.live-voxel',r.voxel.snapshot.proofId==='voxel'&&r.voxel.frameTitle.includes('voxel lab')&&r.voxel.openHref.includes('voxel.html'),r.voxel);
check('atlas.lineage',r.lineage.rows===7&&r.lineage.reassess===2&&r.lineage.applications===2&&r.lineage.roadmap===5&&r.lineage.capabilities===9,r.lineage);
check('atlas.tablet',r.tablet.viewport===1024&&r.tablet.scrollWidth===1024&&r.tablet.capabilityColumns.split(' ').length===2,r.tablet);
check('atlas.mobile',r.mobile.viewport===390&&r.mobile.scrollWidth===390&&r.mobile.snapshot.proofId==='items'&&r.mobile.tabsScrollable&&r.mobile.frameWidth<=390&&r.mobile.openVisible,r.mobile);
check('atlas.keyboard',r.keyboard.snapshot.proofId==='styles'&&r.keyboard.activeRole==='tab'&&r.keyboard.outline==='3px',r.keyboard);
check('atlas.reduced-motion',r.reduced.matched&&r.reduced.scrollBehavior==='auto',r.reduced);
check('atlas.embed-fallback',r.embedOff.snapshot.embedOff&&r.embedOff.frameHidden&&r.embedOff.fallbackVisible&&r.embedOff.openHref.includes('gloss.html'),r.embedOff);
check('atlas.console',r.consoleErrors.length===0,r.consoleErrors);
const evidence=await Promise.all(r.evidence.map(async relative=>{try{const stat=await fs.stat(path.join(project,relative));return{relative,bytes:stat.size,ok:stat.size>0};}catch(error){return{relative,ok:false,error:error.message};}}));check('atlas.evidence',evidence.every(item=>item.ok),evidence);
for(const item of checks)console.log(`${item.ok?'PASS':'FAIL'} ${item.id}`);const failures=checks.filter(item=>!item.ok);console.log(`SOURCE-FIRST ATLAS BROWSER ${checks.length-failures.length}/${checks.length}`);if(failures.length){console.log(JSON.stringify(failures,null,2));process.exitCode=1;}
