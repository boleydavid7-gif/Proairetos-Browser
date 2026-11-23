#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
from pathlib import Path
p=Path("engine/browser/base/content/browser.xhtml")
j=Path("engine/browser/base/jar.mn")
s=p.read_text()
m=j.read_text()
tag='<script src="chrome://browser/content/vela-native.js"></script>'
style='<link rel="stylesheet" href="chrome://browser/content/vela-styles.css" />'
if tag not in s or style not in s:
    import re
    matches=list(re.finditer(r'<script\b[^>]*src="chrome://browser/content/browser-main\.js"[^>]*(?:/>|>\s*</script>)',s))
    if len(matches)!=1:
        raise SystemExit("Browser script anchor not found; no source modified.")
    insert="".join("\n  "+item for item in (style,tag) if item not in s)
    s=s[:matches[0].end()]+insert+s[matches[0].end():]
assets = [
    ("vela-native.js", "vela-native.js"),
    ("vela-logo.svg", "vela.svg"),
    ("vela-styles.css", None),
]
lines=m.splitlines(keepends=True)
indexes=[i for i,l in enumerate(lines) if "content/browser/browser.js" in l and "(content/browser.js)" in l]
if len(indexes)!=1:
    raise SystemExit("Browser manifest anchor not found; no source modified.")
for name, source in assets:
    entry=f"    content/browser/{name} (content/{name})"
    if entry not in m:
        lines.insert(indexes[0]+1, entry+"\n")
m="".join(lines)
p.write_text(s)
j.write_text(m)
for name, source in assets:
    if source:
        payload=Path("scripts").joinpath(source).read_bytes()
    else:
        # The browser's default stylesheet AND curated mods are embedded in
        # the Firefox chrome archive: no extension, Sine, or user profile needed.
        payload=(Path("scripts/vela-chrome.css").read_bytes()+b"\n"+
                 Path("scripts/vela-curated-mods.css").read_bytes())
    p.with_name(name).write_bytes(payload)
PY
bash scripts/apply-vela-branding.sh
