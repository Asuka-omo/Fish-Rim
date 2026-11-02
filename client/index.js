(()=>{
const KEY='ff8:desktop-boot';
function shouldPlay(storage,id,enabled=true){if(!enabled||!id)return false;try{if(storage?.getItem(KEY)===id)return false;storage?.setItem(KEY,id);}catch{}return true;}
function installDesktop(ctx,config=window.__FF8_BOOT__){
 const cover=claim=>window.__ff8Cover?.end(claim);let storage;try{storage=sessionStorage;}catch{}if(!config||window.__ff8Active||!shouldPlay(storage,config.bootId,config.enabled)){cover();return()=>{};}
 const token=crypto.randomUUID();let frame,closed=false,timer;const cleanup=()=>{if(closed)return;closed=true;clearTimeout(timer);window.removeEventListener('message',message);window.removeEventListener('keydown',escape,true);document.removeEventListener('DOMContentLoaded',start);if(frame){try{frame.contentWindow?.postMessage({type:'fatfish:dispose',token},location.origin);}catch{}frame.remove();}delete window.__ff8Active;cover();};
 const message=e=>{if(e.source!==frame?.contentWindow||e.origin!==location.origin||e.data?.token!==token)return;if(e.data.type==='fatfish:restarting'){clearTimeout(timer);timer=setTimeout(cleanup,12000);}if(e.data.type==='fatfish:ready'){clearTimeout(timer);cover();frame.contentWindow.focus();}if(e.data.type==='fatfish:done')cleanup();};const escape=e=>{if(e.key==='Escape'){e.preventDefault();cleanup();}};
 const start=()=>{if(closed)return;try{frame=document.createElement('iframe');frame.id='fatfish-v8-frame';frame.title='Fat Fish Deployment Protocol';frame.allow='autoplay';const caption=document.documentElement.hasAttribute('data-windows-titlebar')?36:0;Object.assign(frame.style,{position:'fixed',inset:`${caption}px 0 0`,width:'100%',height:`calc(100% - ${caption}px)`,border:'0',zIndex:'2147481999',background:'#080f15'});const u=new URL('index.html',new URL(config.base,location.href));u.searchParams.set('embedded','1');u.searchParams.set('token',token);u.searchParams.set('volume',String(config.volume));frame.src=u.href;window.addEventListener('message',message);window.addEventListener('keydown',escape,true);document.body.append(frame);timer=setTimeout(cleanup,12000);}catch{cleanup();}};
 window.__ff8Active={dispose:cleanup};ctx.on('dispose',cleanup);if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});return cleanup;
}

// Same ModuleLoader contract as the verified v1, separate package id.
if(window.__ModuleLoader__?.load)window.__ModuleLoader__.load({id:'fat-fish-deployment-protocol',factory:()=>({name:'fat-fish-v8-client',apply(ctx){installDesktop(ctx);}})});else window.__ff8Cover?.end(true);

})();