#!/usr/bin/env bash
# Shows Vela's look without building Firefox: downloads the official Zen release Vela is based on, puts Vela into a
# copy of its app archive the way apply-vela-native.sh puts it into the build (files under chrome://browser/content/,
# browser.xhtml linking vela-styles.css and vela-native.js, vela-home.css at the end of the new tab stylesheets),
# and starts it with Vela's settings in its own profile. Nothing outside .vela-preview/ is changed.
#
#   scripts/vela-preview.sh                      start it on this screen
#   scripts/vela-preview.sh --shot out.png       start it on a virtual screen (Xvfb) and save a picture after 15 s
#   ZEN_VERSION=1.24.3b scripts/vela-preview.sh  another Zen release (Linux x86-64)
#
# Needs curl, unzip, zip and python3; --shot also needs Xvfb and ImageMagick's import.
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
version="${ZEN_VERSION:-1.24.3b}"
work="$root/.vela-preview"
shot=""
if [ "${1:-}" = "--shot" ]; then shot="${2:?--shot needs a file name}"; fi
for tool in curl unzip zip python3; do command -v "$tool" >/dev/null || { echo "Missing: $tool" >&2; exit 1; }; done

mkdir -p "$work"
if [ ! -x "$work/zen-$version/zen" ]; then
  echo "Downloading Zen $version (official release, about 110 MB)…"
  curl -fL --proto '=https' -o "$work/zen.tar.xz" \
    "https://github.com/zen-browser/desktop/releases/download/$version/zen.linux-x86_64.tar.xz"
  rm -rf "$work/zen-$version" "$work/unpack"
  mkdir -p "$work/unpack"
  tar -xJf "$work/zen.tar.xz" -C "$work/unpack"
  mv "$work/unpack/zen" "$work/zen-$version"
  rm -rf "$work/unpack" "$work/zen.tar.xz"
  cp "$work/zen-$version/browser/omni.ja" "$work/omni-$version.ja"
fi

# A fresh copy of the release's archive each time, with Vela put in.
omni="$work/omni"
rm -rf "$omni"; mkdir -p "$omni"
(cd "$omni" && unzip -q "$work/omni-$version.ja" 2>/dev/null) || true
test -f "$omni/chrome/browser/content/browser/browser.xhtml" || { echo "Could not read Zen's app archive." >&2; exit 1; }
python3 "$root/scripts/build-vela-home.py" "$work/vela-home.css"
python3 - "$root" "$omni" "$work/vela-home.css" <<'PY'
import re, shutil, sys
from pathlib import Path
root, omni, home = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
content = omni / "chrome/browser/content/browser"
(content / "vela-icons").mkdir(exist_ok=True)
for icon in (root / "scripts/vela-icons").glob("*.svg"):
    shutil.copyfile(icon, content / "vela-icons" / icon.name)
(content / "fonts").mkdir(exist_ok=True)
shutil.copyfile(root / "scripts/fonts/eb-garamond-500.woff2", content / "fonts/eb-garamond-500.woff2")
shutil.copyfile(root / "scripts/vela.svg", content / "vela-logo.svg")
shutil.copyfile(root / "scripts/vela-native.js", content / "vela-native.js")
(content / "vela-styles.css").write_bytes((root / "scripts/vela-chrome.css").read_bytes() + b"\n" +
                                          (root / "scripts/vela-curated-mods.css").read_bytes())
xhtml = content / "browser.xhtml"
s = xhtml.read_text()
anchors = list(re.finditer(r'<script\b[^>]*src="chrome://browser/content/browser-main\.js"[^>]*(?:/>|>\s*</script>)', s))
if len(anchors) != 1:
    raise SystemExit("Browser script anchor not found in this Zen release.")
s = s[:anchors[0].end()] + ('\n  <link rel="stylesheet" href="chrome://browser/content/vela-styles.css" />'
                           '\n  <script src="chrome://browser/content/vela-native.js"></script>') + s[anchors[0].end():]
xhtml.write_text(s)
for sheet in (omni / "chrome/browser/builtin-addons/newtab").rglob("activity-stream.css"):
    sheet.write_text(sheet.read_text() + "\n" + home.read_text())
PY
rm -f "$work/zen-$version/browser/omni.ja"
(cd "$omni" && zip -q -r -0 "$work/zen-$version/browser/omni.ja" .)

# Vela's settings, which the build compiles in from prefs/: here they go into the preview profile.
profile="$work/profile"
mkdir -p "$profile"
python3 - "$root" "$profile/user.js" <<'PY'
import json, re, sys
from pathlib import Path
root, out = Path(sys.argv[1]), Path(sys.argv[2])
names = {"zen.urlbar.replace-newtab", "zen.view.use-single-toolbar", "zen.view.sidebar-expanded", "zen.view.show-newtab-button-top",
         "zen.urlbar.behavior", "zen.welcome-screen.seen", "browser.newtabpage.activity-stream.feeds.topsites"}
lines = ['user_pref("browser.shell.checkDefaultBrowser", false);']
for path in sorted((root / "prefs").rglob("*.yaml")):
    for name, value in re.findall(r"- name: (\S+)\n(?:  (?!value)\w+: .*\n)*  value: (.*)", path.read_text()):
        if name.startswith("vela.") or name in names or path.name == "vela.yaml":
            value = value.strip()
            if value[:1] == "'" and value[-1:] == "'":
                value = json.dumps(value[1:-1])
            elif not (value in ("true", "false") or re.fullmatch(r"-?\d+", value) or value[:1] == '"'):
                value = json.dumps(value)
            lines.append(f'user_pref("{name}", {value});')
out.write_text("\n".join(lines) + "\n")
PY

if [ -z "$shot" ]; then
  exec "$work/zen-$version/zen" --no-remote --profile "$profile" "about:home"
fi
command -v Xvfb >/dev/null && command -v import >/dev/null || { echo "--shot needs Xvfb and ImageMagick." >&2; exit 1; }
Xvfb :87 -screen 0 1600x940x24 >/dev/null 2>&1 & xvfb=$!
trap 'kill "$browser" "$xvfb" 2>/dev/null || true' EXIT
DISPLAY=:87 "$work/zen-$version/zen" --no-remote --profile "$profile" --width 1560 --height 900 "about:home" >/dev/null 2>&1 & browser=$!
sleep 15
DISPLAY=:87 import -window root "$shot"
echo "Saved $shot"
