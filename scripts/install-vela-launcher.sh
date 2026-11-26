#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
test -x "$root/engine/obj-x86_64-pc-linux-gnu/dist/bin/zen"
data="${XDG_DATA_HOME:-$HOME/.local/share}"
bin="$HOME/.local/bin"
mkdir -p "$bin" "$data/applications" "$data/icons/hicolor/scalable/apps"
install -m644 scripts/vela.svg "$data/icons/hicolor/scalable/apps/vela-browser.svg"
python3 - "$root" "$bin/vela-browser" "$data/applications/zen-unofficial.desktop" <<'PY'
import pathlib,shlex,sys
root,wrapper,desktop=map(pathlib.Path,sys.argv[1:])
# The locally built browser, in a profile of its own (Vela's look and settings are compiled in).
profile=pathlib.Path.home()/".local/share/vela/profile"
wrapper.write_text("#!/bin/bash\nset -euo pipefail\nmkdir -p "+shlex.quote(str(profile))+"\nexec "+shlex.quote(str(root/"engine/obj-x86_64-pc-linux-gnu/dist/bin/zen"))+" --profile "+shlex.quote(str(profile))+" \"$@\"\n")
wrapper.chmod(0o755)
# Desktop Entry Exec quoting is independent of shell quoting.
exe=str(wrapper).replace("\\","\\\\").replace('"','\\"').replace('$','\\$').replace('`','\\`')
desktop.write_text('[Desktop Entry]\nType=Application\nName=Vela\nGenericName=Web Browser\nComment=Browse the web with Vela\nExec="'+exe+'" %u\nIcon=vela-browser\nTerminal=false\nCategories=Network;WebBrowser;\nStartupNotify=true\nStartupWMClass=zen-unofficial\nMimeType=x-scheme-handler/http;x-scheme-handler/https;text/html;\n')
PY
rm -f "$data/applications/vela-browser.desktop"
install -m644 scripts/vela.svg "$data/icons/hicolor/scalable/apps/zen-unofficial.svg"
if command -v update-desktop-database >/dev/null; then update-desktop-database "$data/applications"; fi
echo "Vela launcher installed. Find Vela in your application menu."
