import { readFile, copyFile, mkdir, access } from 'node:fs/promises';
import { build } from 'esbuild';
const manifest=JSON.parse(await readFile('public/manifest.json','utf8'));
for(const path of [...Object.values(manifest.assets),...Object.values(manifest.sounds)]){
  try { await access('public/'+path); }
  catch { throw Error('Missing public/'+path+'. Import the media from your local plugin package as described in the README.'); }
}
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/app.js'],bundle:true,format:'iife',target:'es2022',minify:true,outfile:'public/scene.js'});
await copyFile('client/index.js','dist/client.js');

