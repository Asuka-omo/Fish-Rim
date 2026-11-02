"""Copy only manifest-listed media from a local DSH plugin archive."""
import argparse, json, shutil, tarfile
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("archive",type=Path)
args=p.parse_args()
public=Path(__file__).resolve().parents[1]/"public"
manifest=json.loads((public/"manifest.json").read_text(encoding="utf8"))
paths=sorted(set(manifest["assets"].values()) | set(manifest["sounds"].values()))
with tarfile.open(args.archive,"r:gz") as archive:
    for rel in paths:
        dest=(public/rel).resolve()
        if public not in dest.parents: raise ValueError(rel)
        member=archive.getmember("package/public/"+rel)
        if not member.isfile(): raise ValueError(member.name)
        dest.parent.mkdir(parents=True,exist_ok=True)
        with archive.extractfile(member) as src, dest.open("wb") as out:
            shutil.copyfileobj(src,out)
print(f"Imported {len(paths)} local media assets.")

