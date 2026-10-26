"""Reproducible Foundry runtime package with a versioned release manifest."""
from pathlib import Path
import json, hashlib, zipfile
root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'module.json').read_text())
dist = root / 'dist'
dist.mkdir(exist_ok=True)
name = f"axon-wheel-{manifest['version']}.zip"
files = [root / n for n in ['module.json', 'README.md', 'CHANGELOG.md']]
for folder in ['scripts', 'styles', 'assets', 'lang', 'docs']:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file())
with zipfile.ZipFile(dist / name, 'w', zipfile.ZIP_DEFLATED) as out:
    for file in sorted(files):
        info = zipfile.ZipInfo('arcane-wheels/' + file.relative_to(root).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
        info.external_attr = 0o100644 << 16
        out.writestr(info, file.read_bytes(), compress_type=zipfile.ZIP_DEFLATED)
with zipfile.ZipFile(dist / name) as archive:
    assert archive.testzip() is None
    assert 'arcane-wheels/module.json' in archive.namelist()
    assert not any('/tests/' in p or '/node_modules/' in p or '/development/' in p for p in archive.namelist())
(dist / 'module.json').write_bytes((root / 'module.json').read_bytes())
entries = [f"{hashlib.sha256((dist / n).read_bytes()).hexdigest()}  {n}" for n in [name, 'module.json']]
(dist / 'SHA256SUMS.txt').write_text('\n'.join(entries) + '\n')
print(f'{dist / name}\n{len(files)} runtime files')
