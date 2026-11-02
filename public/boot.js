const token = new URLSearchParams(location.search).get('token');


const abort = new AbortController();
let movieURL;
let context, loading = false, replaying = false, closed = false, timer;
const tell = type => window.parent.postMessage({type, token}, location.origin);
function release() {
  if (closed) return;
  closed = true;
  clearTimeout(timer);
  abort.abort();
  if(movieURL) URL.revokeObjectURL(movieURL);
  if (!window.app) void context?.close().catch(() => {});
  tell('fatfish:done');
}
addEventListener('keydown', e => {
  if (e.key === 'Escape' && !window.app) release();
}, {signal:abort.signal});
addEventListener('fatfish:handoff', e => {
  if (replaying) e.stopImmediatePropagation();
  else release();
}, {capture:true, signal:abort.signal});
document.getElementById('replay').addEventListener('click', e => {
  e.stopImmediatePropagation();
  replaying = true;
  tell('fatfish:restarting');
  location.reload();
}, true);
async function get(url) {
  const response = await fetch(url, {signal:abort.signal});
  if (!response.ok) throw Error('Missing splash asset: '+url);
  return response;
}
async function enter() {
  if (closed || loading) return;
  loading = true;

  timer = setTimeout(release, 20000);
  try {
    const manifest = await (await get('manifest.json')).json();
    const audio = {};
    await Promise.all(Object.entries(manifest.sounds).map(async ([key,url]) => {
      audio[key] = await (await get(url)).arrayBuffer();
    }));
    if (closed) return;
    // The desktop carrier can lose Range semantics across a hold/seek. Decode the
    // exact approved file through a local blob, as in the reviewed single HTML.
    const movie = await (await get(manifest.assets['media/user-cut.mp4'])).blob();
    if(closed) return;
    movieURL = URL.createObjectURL(movie);
    manifest.assets['media/user-cut.mp4'] = movieURL;
    window.FFW = {audioContext:context, assets:manifest.assets, audio, land:manifest.land};
    document.getElementById('experience').hidden = false;
    const script = document.createElement('script');
    script.src = 'scene.js';
    await new Promise((resolve,reject) => {
      script.onload = resolve; script.onerror = reject; document.head.append(script);
    });
    await window.app.readyPromise;
    if (closed || app.closed) return release();
    FFW.audio = {};
    clearTimeout(timer);

  } catch { release(); }
}
try {
  context = new AudioContext({sampleRate:48000,latencyHint:'interactive'});
  const unlock = () => { if(context.state === 'suspended') void context.resume().catch(() => {}); };
  addEventListener('pointerdown',unlock,{capture:true,signal:abort.signal});
  addEventListener('keydown',unlock,{capture:true,signal:abort.signal});
  unlock();
  void enter();
} catch { release(); }

