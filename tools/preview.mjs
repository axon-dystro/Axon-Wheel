// Optional browser QA: npm install --no-save playwright@1.51.1; npx playwright install chromium
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
const {defaultWheel,emptyRecord}=await import('../scripts/core/model.js');
const {WheelManager}=await import('../scripts/ui/manager.js');
const draft=defaultWheel('preview');
const records=[emptyRecord(draft),emptyRecord({...structuredClone(draft),id:'second',name:'Schätze der Taverne'})];
globalThis.game={user:{isGM:true},system:{id:'dnd5e',version:'6.0.6'},users:[],scenes:{get:()=>null},
 settings:{get:()=>({ids:['a','b']})},journal:{get:id=>({getFlag:(_ns,k)=>k==='kind'?'wheel':k==='record'?JSON.stringify(records[id==='a'?0:1]):null})}};
const manager=new WheelManager({});manager.draft=draft;manager.record=records[0];
const root=process.cwd();
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){
   manager.tab=url.searchParams.get('tab')??'segments';
   const css=await Promise.all(['styles/arcane-wheels.css'].map(p=>readFile(p,'utf8')));
   const html=await manager.html();
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#0b1013;font-family:system-ui;padding:12px}*{box-sizing:border-box}.aw-manager{width:min(1120px,100%);height:calc(100dvh - 24px);margin:auto;display:flex;flex-direction:column}.window-content{flex:1;min-height:0}button{cursor:pointer}img{max-width:100%}${css.join('\n')}</style><section class="arcane-wheels aw-manager"><div class="window-header">Axon´s Glücksrad</div><div class="window-content"><section class="aw-root">${html}</section></div></section>`);
  }else{
   const file=path.resolve(root,'.'+url.pathname.replace('/modules/arcane-wheels',''));
   if(!file.startsWith(root+path.sep))throw new Error('Bad path');
   res.setHeader('Content-Type',file.endsWith('.svg')?'image/svg+xml':file.endsWith('.js')?'text/javascript':'application/octet-stream');res.end(await readFile(file));
  }
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();await mkdir('dist',{recursive:true});
 for(const width of [1280,900,600]){
  await page.setViewportSize({width,height:920});
  for(const tab of ['manager','segments','design','rules','placements','operation','advanced']){
   await page.goto(`http://127.0.0.1:${server.address().port}/?tab=${tab}`);
   await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode().catch(()=>{}))));
   const errors=await page.evaluate(()=>{
    const result=[];
    for(const e of document.querySelectorAll('.aw-editor,.aw-card,.aw-field,.aw-footer,.aw-root')){
     if(e.scrollWidth>e.clientWidth+2)result.push(`${e.className}: ${e.scrollWidth}>${e.clientWidth}`);
    }
    const footer=document.querySelector('.aw-footer').getBoundingClientRect();
    if(footer.bottom>innerHeight+1)result.push('Save bar outside viewport');
    return result;
   });
   if(errors.length)throw new Error(`${width}/${tab}: ${errors.join('; ')}`);
   if(tab==='segments'&&width===1280)await page.screenshot({path:'dist/manager-preview.png'});
  }
 }
 // Exercise the actual player click/keyboard handlers and check the full URL on narrow screens.
 for(const width of [320,600,1280]){
  await page.setViewportSize({width,height:920});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
   globalThis.foundry={applications:{api:{ApplicationV2:class{}}}};
   globalThis.game={settings:{get:()=>false}};
   const {PlayerWheel}=await import('/scripts/ui/wheel.js');
   const {defaultWheel,publicWheel}=await import('/scripts/core/model.js');
   const player=new PlayerWheel({view:publicWheel(defaultWheel('speech-preview'))});
   const root=document.createElement('section');root.className='arcane-wheels aw-overlay';
   root.innerHTML=await player.html();document.body.replaceChildren(root);player.element=root;
   player.refreshAvailability=()=>{};await player.bind();
  });
  for(const [ghost,text] of [['ghost','Buuuh!'],['panda','Habt ihr PandaMaru gesehen …?'],['credit','Hol dein eigenes Modul auf']]){
   await page.locator(`[data-easter="${ghost}"]`).evaluate(el=>el.click());
   const result=await page.locator('.aw-speech').evaluate((bubble,text)=>{
    if(!bubble.textContent.startsWith(text))return 'Wrong ghost dialogue';
    const box=bubble.getBoundingClientRect();
    if(box.left<0||box.right>innerWidth||box.top<0||box.bottom>innerHeight)return 'Bubble outside viewport';
    const url=bubble.querySelector('.aw-speech-url');
    if(url){
     const rect=url.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(url);
     const textRect=range.getBoundingClientRect(),sentence=document.createRange();sentence.selectNode(bubble.firstChild);
     if(url.textContent!=='re-quested.de'||range.getClientRects().length!==1||textRect.left<box.left||textRect.right>box.right||rect.top<sentence.getBoundingClientRect().bottom)return 'URL clipped, wrapped or not below sentence';
    }
    return null;
   },text);
   if(result)throw new Error(`${width}/${ghost}: ${result}`);
  }
 }
 await writeFile('dist/visual-check.txt','21 rendered layouts: 7 panels at 1280, 900 and 600 px; no panel/field/card overflow; save bar visible. 9 ghost interactions at 320, 600 and 1280 px; advertising URL fully visible on its own line. Browser fixture, not a live Foundry session.\n');
 console.log('21 browser layout checks passed.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
