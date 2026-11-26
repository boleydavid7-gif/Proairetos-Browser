#!/usr/bin/env bash
# Puts Vela into the checked-out engine before a build (run after `npm run init`, before `npm run build`):
#   - browser.xhtml links vela-styles.css (vela-chrome.css + vela-curated-mods.css) and vela-native.js after
#     browser-main.js, and jar.mn packages them with the logo, the icons and the serif under chrome://browser/content/;
#   - the new tab page's stylesheets get vela-home.css (with the logo and wordmark inside it, build-vela-home.py)
#     between marker comments, replaced on every run;
# then brands the build as Vela (apply-vela-branding.sh). Safe to run again: nothing is added twice.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/build-vela-home.py engine/.vela-home.css
python3 - <<'PY'
import re
import shutil
from pathlib import Path

content = Path("engine/browser/base/content")
xhtml = content / "browser.xhtml"
jar = Path("engine/browser/base/jar.mn")
s = xhtml.read_text()
m = jar.read_text()

tag = '<script src="chrome://browser/content/vela-native.js"></script>'
style = '<link rel="stylesheet" href="chrome://browser/content/vela-styles.css" />'
if tag not in s or style not in s:
    anchors = list(re.finditer(r'<script\b[^>]*src="chrome://browser/content/browser-main\.js"[^>]*(?:/>|>\s*</script>)', s))
    if len(anchors) != 1:
        raise SystemExit("Browser script anchor not found; no source modified.")
    insert = "".join("\n  " + item for item in (style, tag) if item not in s)
    s = s[:anchors[0].end()] + insert + s[anchors[0].end():]

# Files under chrome://browser/content/: (packaged name, source in scripts/, or None for the joined stylesheet).
assets = [("vela-native.js", "vela-native.js"), ("vela-logo.svg", "vela.svg"), ("vela-styles.css", None),
          ("fonts/eb-garamond-500.woff2", "fonts/eb-garamond-500.woff2")]
assets += [("vela-icons/" + icon.name, "vela-icons/" + icon.name) for icon in sorted(Path("scripts/vela-icons").glob("*.svg"))]

lines = m.splitlines(keepends=True)
def anchor_index():
    found = [i for i, line in enumerate(lines) if "content/browser/browser.js" in line and "(content/browser.js)" in line]
    if len(found) != 1:
        raise SystemExit("Browser manifest anchor not found; no source modified.")
    return found[0]
anchor_index()
# Entries from an earlier run whose files are gone (renamed icons) are taken out.
wanted = {f"    content/browser/{name} (content/{name})\n" for name, _ in assets}
lines = [line for line in lines if not (line.strip().startswith("content/browser/vela") and line not in wanted)]
at = anchor_index()
for name, _ in reversed(assets):
    entry = f"    content/browser/{name} (content/{name})\n"
    if entry not in lines:
        lines.insert(at + 1, entry)
xhtml.write_text(s)
jar.write_text("".join(lines))

shutil.rmtree(content / "vela-icons", ignore_errors=True)
for name, source in assets:
    target = content / name
    target.parent.mkdir(parents=True, exist_ok=True)
    if source:
        shutil.copyfile(Path("scripts") / source, target)
    else:
        # The window's stylesheet and the curated mods, embedded in Firefox's own files:
        # no extension, Sine, or user profile stylesheet needed.
        target.write_bytes(Path("scripts/vela-chrome.css").read_bytes() + b"\n" +
                           Path("scripts/vela-curated-mods.css").read_bytes())

# The new tab page (about:home, about:newtab) loads its own stylesheets; Vela's goes at their end.
begin, end = "/* vela-home begin */", "/* vela-home end */"
home = Path("engine/.vela-home.css").read_text()
sheets = sorted(Path("engine/browser/extensions/newtab").rglob("activity-stream.css"))
sheets = [sheet for sheet in sheets if "test" not in sheet.parts and "obj-" not in str(sheet)]
if not sheets:
    raise SystemExit("New tab stylesheet not found; the Vela home page was not added.")
for sheet in sheets:
    text = sheet.read_text()
    text = re.sub(re.escape("\n" + begin) + r".*?" + re.escape(end) + r"\n?", "", text, flags=re.S)
    sheet.write_text(text.rstrip("\n") + "\n\n" + begin + "\n" + home + end + "\n")
    print("Vela home page added to", sheet)
PY
bash scripts/apply-vela-branding.sh
