#!/usr/bin/env python3
"""Adapt user-visible Zen branding in the checked-out Firefox/Zen engine.

Only English Fluent strings, legacy .properties values and desktop launcher
labels are edited. Internal zen.* preferences, CSS selectors, code symbols,
URLs, browser executable names, Mozilla IDs, and upstream legal notices are
untouched. Source edits are intentionally idempotent.
"""
from __future__ import annotations
import re
import sys
from pathlib import Path

ENGINE = Path("engine")
LOCALE_ROOTS = (
    ENGINE / "browser" / "locales",
    ENGINE / "browser" / "branding",
    ENGINE / "zen",
    ENGINE / "toolkit" / "locales",
)
ASSIGN = re.compile(r"^(\s*[-.\w][-.\w]*\s*=\s*)(.*)$")
ZEN_BROWSER = re.compile(r"(?<![\\w./@-])Zen Browser(?![\\w./@-])", re.IGNORECASE)
ZEN = re.compile(r"(?<![\\w./@-])Zen(?![\\w./@-])", re.IGNORECASE)
PLACEABLE = re.compile(r"(\{[^{}]*\})")


def replace_text(value: str) -> str:
    # Never edit URLs or Fluent selectors/variables.
    pieces = PLACEABLE.split(value)
    for index in range(0, len(pieces), 2):
        piece = pieces[index]
        if "zen-browser." in piece or "github.com/" in piece or "https://" in piece:
            continue
        pieces[index] = ZEN.sub("Vela", ZEN_BROWSER.sub("Vela", piece))
    return "".join(pieces)


def convert_locale(content: str) -> str:
    result = []
    for line in content.splitlines(keepends=True):
        if not re.search(r"zen", line, re.IGNORECASE) or line.lstrip().startswith("#"):
            result.append(line)
            continue
        match = ASSIGN.match(line)
        if match:
            result.append(match.group(1) + replace_text(match.group(2)))
        elif line.startswith((" ", "\t")) and not line.lstrip().startswith(("{", "#")):
            # Indented Fluent message values and plural/select branches.
            result.append(replace_text(line))
        else:
            result.append(line)
    return "".join(result)


def locale_files():
    found = set()
    for root in LOCALE_ROOTS:
        if not root.exists():
            continue
        for ext in ("*.ftl", "*.properties"):
            for path in root.rglob(ext):
                if "en-US" not in path.parts or "/obj-" in str(path):
                    continue
                found.add(path)
    return sorted(found)


def launcher_files():
    roots = [ENGINE / "browser" / "branding", ENGINE / "distribution"]
    return sorted({p for root in roots if root.exists() for p in root.rglob("*.desktop")})


def convert_launcher(content: str) -> str:
    result = []
    for line in content.splitlines(keepends=True):
        match = re.match(r"^((?:Name|GenericName|Comment)(?:\[[^]]+\])?=)(.*)$", line)
        if match and re.search(r"zen", match.group(2), re.IGNORECASE):
            line = match.group(1) + replace_text(match.group(2))
        result.append(line)
    return "".join(result)


def main():
    if not ENGINE.is_dir():
        raise SystemExit("Run from the Proairetos-Browser root with engine checked out.")
    audit = "--audit" in sys.argv
    changed, remaining = [], []
    for path in locale_files():
        original = path.read_text(encoding="utf-8")
        updated = convert_locale(original)
        if updated != original:
            changed.append(path)
            if not audit:
                path.write_text(updated, encoding="utf-8")
        if "Zen Browser" in updated or re.search(r"(?m)^\s*[-.\w]+\s*=\s*Zen\b", updated):
            remaining.append(path)
    for path in launcher_files():
        original = path.read_text(encoding="utf-8")
        updated = convert_launcher(original)
        if updated != original:
            changed.append(path)
            if not audit:
                path.write_text(updated, encoding="utf-8")
    verb = "Would update" if audit else "Updated"
    print(f"Vela branding: {verb.lower()} {len(changed)} user-visible locale/launcher files.")
    for path in changed[:40]:
        print("  ", path)
    if len(changed) > 40:
        print(f"  ... and {len(changed) - 40} more files")
    for path in remaining[:20]:
        print("Unresolved visible name:", path)
    if remaining and not audit:
        print("Review unresolved lines manually; source references and URLs are left alone.")


if __name__ == "__main__":
    main()
