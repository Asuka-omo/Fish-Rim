import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {firstFrameScript,assetHandler} from '../plugin/index.js';

const root=await readFile('dist/client.js','utf8');
const server=createServer((req,res)=>{
 if(req.url.startsWith('/fat-fish-v8/')) return assetHandler(req,res);
 res.writeHead(200,{'content-type':'text/html'});
 res.end('<!doctype html><head><script>'+firstFrameScript({enabled:true,volume:.72,bootId:'gate-test',base:'/fat-fish-v8/'})+'</script></head><body>Host<button id="host">Home</button><script>window.__ModuleLoader__={load(e){e.factory().apply({on(){}})}};'+root+'</script></body>');
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1366,height:768}});
const results=[];
try{
 await page.goto('http://127.0.0.1:'+server.address().port);
 const iframe=page.frameLocator('#fatfish-v8-frame');
 await iframe.locator('#stage').waitFor();
 const frame=page.frames().find(f=>f.url().includes('/fat-fish-v8/index.html'));
 assert.equal(await frame.locator('#boot,#webStart').count(),0);
 const cdp=await page.context().newCDPSession(page);
 const {windowId}=await cdp.send('Browser.getWindowForTarget');
 await frame.waitForFunction(()=>window.app?.playhead>1);
 const before=await frame.evaluate(()=>({t:app.video.currentTime,wall:performance.now(),q:app.video.getVideoPlaybackQuality()}));
 // Exercise movement and short-lived focus changes while decoding real media.
 await frame.evaluate(()=>window.dispatchEvent(new Event('blur')));
 for(let i=0;i<45;i++){await cdp.send('Browser.setWindowBounds',{windowId,bounds:{left:30+(i%12)*8,top:30+(i%8)*4}});await page.waitForTimeout(33);}
 const after=await frame.evaluate(()=>({t:app.video.currentTime,wall:performance.now(),paused:app.video.paused,
    dropped:app.video.getVideoPlaybackQuality().droppedVideoFrames,total:app.video.getVideoPlaybackQuality().totalVideoFrames,
    rect:app.video.getBoundingClientRect().width, opacity:getComputedStyle(app.video).opacity}));
 assert.equal(after.paused,false);assert.ok(after.t-before.t>1);assert.ok(after.rect>500);assert.equal(after.opacity,'1');
 const bounds=(await cdp.send('Browser.getWindowBounds',{windowId})).bounds;
 const manual=process.argv.includes('--manual');
 const receipt={};
 await frame.evaluate(()=>window.addEventListener('fatfish:handoff',()=>{parent.testEvents=app.events;},{capture:true}));
 for(const [mode,button,at] of [['WAIT_HEAD','head',15.25],['WAIT_BAY','launch',28.1]]){
   await frame.waitForFunction(mode=>window.app?.mode===mode,mode,{timeout:40000});
   await page.waitForTimeout(manual?900:2850);
   assert.equal(await frame.evaluate(()=>app.playhead),at);
   if(manual)await iframe.locator('#'+button).click();
   await frame.waitForFunction(t=>app.playing && app.playhead>t+.1,at,{timeout:6000});
   receipt[button]=await frame.evaluate(button=>{
      const input=app.events.find(e=>e.type==='command-input'&&e.which===button);
      const wait=app.events.find(e=>e.type==='log'&&e.tag==='WAIT'&&e.media===input.media);
      return {ms:input.wall-wait.wall,input:input.input,count:app.events.filter(e=>e.type==='command-accepted'&&e.which===button).length};
   },button);
   const gate=receipt[button];assert.equal(gate.count,1);assert.equal(gate.input,manual?'pointer':'timeout');
   assert.ok(manual?gate.ms<3000:(gate.ms>=3980&&gate.ms<4300));
 }
 await page.locator('#fatfish-v8-frame').waitFor({state:'detached',timeout:26000});
 const closing=await page.evaluate(()=>{const e=window.testEvents;const t=name=>e.find(x=>x.type===name).wall;
 return{motionMs:t('shutter-closed')-t('shutter-start'),totalMs:t('exit')-t('shutter-start'),reason:e.at(-1).reason}});
 assert.equal(closing.reason,'complete');assert.ok(closing.totalMs>=1490&&closing.totalMs<1650);
 await page.locator('#host').click();
 const report={mode:manual?'manual':'timeout',gates:receipt,closing,move:{before,after,bounds}};
 await writeFile('dist/timing-'+report.mode+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();server.closeAllConnections();server.close();}

