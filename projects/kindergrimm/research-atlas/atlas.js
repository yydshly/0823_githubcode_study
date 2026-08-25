const PROOFS={
  menu:{name:'完整能力菜单',kind:'UPSTREAM INDEX',file:'index.html',src:'../upstream/index.html',summary:'源库把三个游戏、原始 2D、Voxel、Gloss、Object、Styles 与实验入口并列展示。'},
  editor:{name:'2D Recipe 编辑器',kind:'DRAWN · 2D',file:'editor.html · src/editor.js',src:'../upstream/editor.html',summary:'选择 Seed、Medium 和 Species，点击部件调参、重投或锁定，并直接查看可复现 JSON Recipe。'},
  styles:{name:'九种历史风格',kind:'STYLE SYSTEM',file:'styles.html · src/styles/*',src:'../upstream/styles.html?style=cubism&n=5',summary:'Gothic、Renaissance、Baroque、Ukiyo-e、Impressionism、Expressionism、Cubism、Dadaism、Surrealism 使用共享 Style Contract。'},
  items:{name:'Toy Shop 物品系统',kind:'ITEM SYSTEM',file:'items.html · src/items/*',src:'../upstream/items.html',summary:'13 个 Item Family × 4 个 Rank 的原生审查表；同一对象参数驱动画法、数值和游戏行为。'},
  voxel:{name:'Voxel 角色实验室',kind:'VOXEL · 3D',file:'voxel.html · src/voxel/*',src:'../upstream/voxel.html',summary:'真正的 Three.js 体素实体，可旋转、缩放、选部件、重投、锁定和播放面部/呼吸状态。'},
  gloss:{name:'Gloss 角色实验室',kind:'GLOSS · 3D',file:'gloss.html · src/gloss/*',src:'../upstream/gloss.html',summary:'程序化实体几何 Chibi，独立控制物种、身体、姿态、颜色、材质和表情。'},
  objects:{name:'Objects 植物实验室',kind:'OBJECT · 3D',file:'objects.html · src/obj/*',src:'../upstream/objects.html',summary:'Grass、Plant、Tree、Flower 四种程序化实体植物，拥有 Seed、Species、Palette 与 Material。'},
  game:{name:'The Dark Floor',kind:'APPLICATION / GAME',file:'game.html · src/game.js',src:'../upstream/game.html',summary:'生成角色和物品进入真实移动端导向玩法：光决定视野，角色只攻击看得见的目标。'}
};
const frame=document.querySelector('#upstream-frame');const fallback=document.querySelector('#embed-fallback');const embedOff=new URLSearchParams(location.search).has('embed-off');
function selectProof(id,focusFrame=false){const proof=PROOFS[id]||PROOFS.menu;document.querySelectorAll('[data-proof]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.proof===id)));document.querySelector('#proof-kind').textContent=proof.kind;document.querySelector('#proof-name').textContent=proof.name;document.querySelector('#proof-summary').textContent=proof.summary;document.querySelector('#proof-file').textContent=proof.file;const open=document.querySelector('#proof-open');open.href=proof.src;if(!embedOff){frame.src=proof.src;frame.hidden=false;fallback.hidden=true;}else{frame.hidden=true;fallback.hidden=false;}window.__researchAtlasState={proofId:id,proof,embedOff,upstreamCommit:'5857b1e1',frameSrc:embedOff?null:frame.getAttribute('src')};if(focusFrame&&!embedOff)frame.focus();}
document.querySelectorAll('[data-proof]').forEach(button=>button.addEventListener('click',()=>selectProof(button.dataset.proof)));
selectProof('menu');
window.__researchAtlas=Object.freeze({select:selectProof,snapshot:()=>JSON.parse(JSON.stringify(window.__researchAtlasState)),proofs:()=>JSON.parse(JSON.stringify(PROOFS))});
