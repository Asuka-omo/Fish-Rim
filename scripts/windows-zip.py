"""Assemble the Windows release from the verified 2.0.4 plugin and portable scripts."""
import hashlib, json, zipfile
from pathlib import Path
repo=Path(__file__).resolve().parents[1]
out=repo/'dist'
kit=repo/'release-kit'
info=json.loads((kit/'release.json').read_text())
archive=out/info['package']
if hashlib.sha256(archive.read_bytes()).hexdigest()!=info['sha256']:
    raise ValueError('Expected the original verified 2.0.4 package.')
name=f"Fish-Rim-{info['version']}-Windows"
files={f.name:f for f in kit.iterdir() if f.is_file()}
files.update({n:repo/n for n in ['README.md','LICENSE','docs/fat-fish-cover.jpg','docs/CREDITS.md','Font-OFL.txt','vendor/three/LICENSE']})
files[archive.name]=archive
with zipfile.ZipFile(out/(name+'.zip'),'w',zipfile.ZIP_DEFLATED) as z:
    for n,p in sorted(files.items()):
        z.write(p,name+'/'+n,compress_type=zipfile.ZIP_STORED if n.endswith('.tgz') else zipfile.ZIP_DEFLATED)
with zipfile.ZipFile(out/(name+'.zip')) as z:
    assert z.testzip() is None
    for n,p in files.items():
        assert hashlib.sha256(z.read(name+'/'+n)).digest()==hashlib.sha256(p.read_bytes()).digest()
print(name+'.zip', (out/(name+'.zip')).stat().st_size)

