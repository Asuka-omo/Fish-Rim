export function connectHost(app){
 const params=new URLSearchParams(location.search),token=params.get('token');if(params.get('embedded')!=='1'||!token||window.parent===window)return;
 const post=type=>window.parent.postMessage({type,token},location.origin);
 window.addEventListener('fatfish:handoff',()=>post('fatfish:done'),{once:true});
 window.addEventListener('message',e=>{if(e.source===window.parent&&e.origin===location.origin&&e.data?.token===token&&e.data?.type==='fatfish:dispose')void app.exit('plugin-disposed');},{signal:app.abort.signal});
 app.readyPromise.then(()=>{if(!app.closed)requestAnimationFrame(()=>{if(!app.closed)post('fatfish:ready');});});
}
