#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
root="$PWD"
test "$(dpkg --print-architecture)" = amd64
version=0.1.0~dev1
icon="$root/configs/branding/release/logo256.png"
test -f "$icon"
(cd engine && python3 ./mach package)
dist="$root/engine/obj-x86_64-pc-linux-gnu/dist"
archive=$(find "$dist" -maxdepth 1 -name 'zen-*.en-US.linux-x86_64.tar.xz' -printf '%T@ %p\n' | sort -nr | sed -n '1s/^[^ ]* //p')
test -f "$archive"
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
pkg="$stage/pkg"
mkdir -p "$pkg"/{DEBIAN,opt/ProairetosBrowser,usr/bin,usr/share/applications,usr/share/icons/hicolor/256x256/apps,usr/share/doc/proairetos-browser-dev}
tar -xJf "$archive" -C "$pkg/opt/ProairetosBrowser" --strip-components=1
test -x "$pkg/opt/ProairetosBrowser/zen"
install -m644 "$icon" "$pkg/usr/share/icons/hicolor/256x256/apps/com.proairetos.NativeBrowser.png"
install -m644 LICENSE "$pkg/usr/share/doc/proairetos-browser-dev/copyright"
mkdir -p "$pkg/opt/ProairetosBrowser/distribution"
cat > "$pkg/opt/ProairetosBrowser/distribution/policies.json" <<'EOF'
{"policies":{"DisableAppUpdate":true}}
EOF
cat > "$pkg/usr/bin/proairetos-browser-dev" <<'EOF'
#!/bin/sh
set -eu
umask 077
profile="${XDG_DATA_HOME:-$HOME/.local/share}/proairetos-browser-dev/profile"
mkdir -p "$profile"
exec /opt/ProairetosBrowser/zen --profile "$profile" "$@"
EOF
chmod 755 "$pkg/usr/bin/proairetos-browser-dev"
cat > "$pkg/usr/share/applications/com.proairetos.NativeBrowser.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=Vela (Development)
GenericName=Web Browser
Exec=proairetos-browser-dev %u
Icon=com.proairetos.NativeBrowser
Terminal=false
Categories=Network;WebBrowser;
StartupWMClass=zen
EOF
cat > "$pkg/DEBIAN/control" <<EOF
Package: proairetos-browser-dev
Version: $version
Architecture: amd64
Maintainer: ProairetOS
Depends: libgtk-3-0 | libgtk-3-0t64, libdbus-glib-1-2, libnss3, libasound2 | libasound2t64
Description: Vela browser, development build
 Vela, the ProairetOS browser, built on Zen and Firefox; for local testing only.
EOF
mkdir -p "$root/release"
out="$root/release/proairetos-browser-dev_${version}_amd64.deb"
dpkg-deb --build --root-owner-group "$pkg" "$out"
printf '\nDevelopment package: %s\n' "$out"
