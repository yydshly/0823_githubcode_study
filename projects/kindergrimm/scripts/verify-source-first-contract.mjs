import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const upstream=path.join(project,'upstream');
const results=[];const check=(name,fn)=>{try{fn();results.push({name,ok:true});}catch(error){results.push({name,ok:false,error:error.message});}};
const read=relative=>fs.readFileSync(path.join(upstream,relative),'utf8');

check('source.commit-lock',()=>assert.equal(execFileSync('git',['-C',upstream,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),'5857b1e1cae2713d6714ad7dd7f89626bb242f0f'));
check('source.recipe-is-only-state',()=>{const readme=read('README.md');assert.match(readme,/A face is a \*\*recipe\*\*/);assert.match(readme,/same JSON always redraws the same face/);});
check('source.capability-scale',()=>{
  const js=fs.readdirSync(path.join(upstream,'src'),{recursive:true}).filter(name=>String(name).endsWith('.js')).length;
  const html=fs.readdirSync(upstream).filter(name=>name.endsWith('.html')).length;
  const styles=fs.readdirSync(path.join(upstream,'src','styles')).filter(name=>name.endsWith('.js')&&!['index.js','pigment.js'].includes(name)).length;
  assert.equal(js,135);assert.equal(html,18);assert.equal(styles,9);
});
check('source.item-families',()=>{const source=read('src/items/index.js');const block=source.match(/export const FAMILIES = \[([\s\S]*?)\];/)[1];const names=block.replace(/\/\/.*$/gm,'').match(/[A-Z][A-Za-z]+/g);assert.equal(names.length,13);assert.match(source,/One drawing, three places it can land/);});
check('source.2d-3d-applications',()=>{const index=read('index.html');for(const value of ['drawn · 2d','voxel · 3d','gloss · 3d','object · 3d','class photo','the dark floor','marbles'])assert.ok(index.includes(value));});
check('source.nine-styles',()=>{const source=read('src/styles/index.js');for(const id of ['gothic','renaissance','baroque','ukiyoe','impressionism','expressionism','cubism','dadaism','surrealism'])assert.match(source,new RegExp(`import ${id}`));});
check('source.runtime-model-boundary',()=>{const files=fs.readdirSync(path.join(upstream,'src'),{recursive:true}).filter(name=>String(name).endsWith('.js'));const combined=files.map(name=>fs.readFileSync(path.join(upstream,'src',name),'utf8')).join('\n');assert.doesNotMatch(combined,/openai|anthropic|gemini|api\.openai/i);});
check('atlas.reassignment-is-explicit',()=>{const html=fs.readFileSync(path.join(project,'research-atlas','index.html'),'utf8');assert.match(html,/PARALLEL \/ REASSESS/);assert.match(html,/UPSTREAM ORIGINAL/);assert.match(html,/APPLICATION PROOF/);assert.match(html,/5857b1e1/);});
check('atlas.original-pages-not-recreated',()=>{const js=fs.readFileSync(path.join(project,'research-atlas','atlas.js'),'utf8');assert.match(js,/\.\.\/upstream\/editor\.html/);assert.match(js,/\.\.\/upstream\/voxel\.html/);assert.doesNotMatch(js,/getContext\(|renderProp|renderScene/);});

for(const result of results)console.log(`${result.ok?'PASS':'FAIL'} ${result.name}${result.error?': '+result.error:''}`);const passed=results.filter(item=>item.ok).length;console.log(`SOURCE-FIRST CONTRACT ${passed}/${results.length}`);if(passed!==results.length)process.exitCode=1;
