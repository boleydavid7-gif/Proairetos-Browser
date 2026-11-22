#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v rsvg-convert >/dev/null || { echo "Install librsvg2-bin first" >&2; exit 1; }
brand=engine/browser/branding/unofficial
test -f "$brand/locales/en-US/brand.ftl"
python3 - "$brand/locales/en-US/brand.ftl" <<'PY'
import pathlib,re,sys
p=pathlib.Path(sys.argv[1])
s=p.read_text()
for key in ("brand-shorter-name","brand-short-name","brand-full-name","brand-product-name"):
    s=re.sub(r"(?m)^-"+key+r"\s*=.*$", "-"+key+" = Vela",s)
p.write_text(s)
PY
for size in 16 22 24 32 48 64 128 256 512; do
  if test -f "$brand/default$size.png"; then
    rsvg-convert -w "$size" -h "$size" scripts/vela.svg -o "$brand/default$size.png"
  fi
done
for size in 512 1024; do
  target="$brand/content/about-logo.png"
  if test "$size" = 1024; then target="$brand/content/about-logo@2x.png"; fi
  if test -f "$target"; then
    rsvg-convert -w "$size" -h "$size" scripts/vela.svg -o "$target"
  fi
done
(cd engine && python3 ./mach build faster -j2)
