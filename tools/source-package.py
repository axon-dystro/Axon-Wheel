"""Archive the exact committed source and a self-contained Git bundle."""
from pathlib import Path
import json,subprocess,zipfile,hashlib

root=Path(__file__).resolve().parents[1]
def git(*args):
    return subprocess.check_output(['git','-C',str(root),*args],text=True).strip()
if git('status','--porcelain'):
    raise SystemExit('Commit all source changes before packaging source.')
manifest=json.loads((root/'module.json').read_text())
dist=root/'dist';dist.mkdir(exist_ok=True)
bundle=dist/'arcane-wheels.git.bundle'
git('bundle','create',str(bundle),'--all')
git('bundle','verify',str(bundle))
name=f"arcane-wheels-{manifest['version']}-source.zip"
archive=dist/name
git('archive','--format=zip','--prefix=arcane-wheels/',f'--output={archive}','HEAD')
with zipfile.ZipFile(archive,'a',zipfile.ZIP_DEFLATED) as out:
    out.write(bundle,'arcane-wheels/arcane-wheels.git.bundle')
with zipfile.ZipFile(archive) as out:
    assert out.testzip() is None
checksum=hashlib.sha256(archive.read_bytes()).hexdigest()
with (dist/'SHA256SUMS.txt').open('a') as out:
    out.write(f'{checksum}  {name}\n')
print(f'{archive}\nCommit {git("rev-parse","HEAD")}\nSHA-256 {checksum}')
