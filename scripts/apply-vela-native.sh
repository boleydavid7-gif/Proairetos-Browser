#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 - <<'PY'
from pathlib import Path
p=Path("engine/browser/base/content/browser.xhtml")
j=Path("engine/browser/base/jar.mn")
s=p.read_text()
m=j.read_text()
tag='<script src="chrome://browser/content/vela-native.js"/>'
if tag not in s:
    import re
    matches=list(re.finditer(r'<script\b[^>]*src="chrome://browser/content/browser\.js"[^>]*(?:/>|>\s*</script>)',s))
    if len(matches)!=1:
        raise SystemExit("Browser script anchor not found; no source modified.")
    s=s[:matches[0].end()]+"\n  "+tag+s[matches[0].end():]
entry="    content/browser/vela-native.js (content/vela-native.js)"
if entry not in m:
    lines=m.splitlines(keepends=True)
    indexes=[i for i,l in enumerate(lines) if "content/browser/browser.js" in l and "(content/browser.js)" in l]
    if len(indexes)!=1:
        raise SystemExit("Browser manifest anchor not found; no source modified.")
    lines.insert(indexes[0]+1,entry+"\n")
    m="".join(lines)
p.write_text(s)
j.write_text(m)
p.with_name("vela-native.js").write_bytes(Path("scripts/vela-native.js").read_bytes())
PY
bash scripts/apply-vela-branding.sh
