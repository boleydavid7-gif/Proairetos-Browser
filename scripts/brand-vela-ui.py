#!/usr/bin/env python3
"""Safely brand user-facing Zen strings without damaging Fluent localization.

The previous implementation stripped the newline from any Fluent assignment
whose key contained "zen"; e.g. zen-settings-window-* entries were joined into
one unusable message. This version preserves every line ending and repairs
previously damaged tracked localization files from the engine Git HEAD, keeping
a backup of the damaged file.

Only values in en-US .ftl/.properties and desktop launcher descriptions are
rewritten. Keys, Fluent placeables, selectors, engine identifiers, URLs and
legal notices are left intact.
"""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ENGINE = Path("engine")
LOCALE_ROOTS = (
    ENGINE / "browser" / "locales",
    ENGINE / "browser" / "branding",
    ENGINE / "zen",
    ENGINE / "toolkit" / "locales",
)
ASSIGN = re.compile(r"^([ \t]*[-.\w]+[ \t]*=[ \t]*)(.*)$")
ZEN_BROWSER = re.compile(r"(?<![\w./@-])Zen Browser(?![\w./@-])", re.IGNORECASE)
ZEN = re.compile(r"(?<![\w./@-])Zen(?![\w./@-])", re.IGNORECASE)
PLACEABLE = re.compile(r"(\{[^{}]*\})")
# A second zen-settings-window-... = token in an existing message value is
# a reliable signature of the prior newline-stripping bug.
MERGED_FTL_KEYS = re.compile(
    r"(?im)^[ \t]*[-\w]+[ \t]*=[^\r\n]*zen-[a-z0-9-]{3,}[ \t]*="
)
BRAND_KEYS = (
    "brand-shorter-name",
    "brand-short-name",
    "brand-full-name",
    "brand-product-name",
)


def replace_text(value: str) -> str:
    # Interpolation and resource URLs may contain Zen as an identifier.
    pieces = PLACEABLE.split(value)
    for index in range(0, len(pieces), 2):
        piece = pieces[index]
        if any(term in piece for term in ("zen-browser.", "github.com/", "https://")):
            continue
        pieces[index] = ZEN.sub("Vela", ZEN_BROWSER.sub("Vela", piece))
    return "".join(pieces)


def convert_locale(content: str) -> str:
    lines = []
    for line in content.splitlines(keepends=True):
        if "zen" not in line.lower() or line.lstrip().startswith("#"):
            lines.append(line)
            continue
        # Keep CRLF/LF and the presence or absence of a final newline exactly.
        body = line.rstrip("\r\n")
        ending = line[len(body):]
        assignment = ASSIGN.match(body)
        if assignment:
            value = replace_text(assignment.group(2))
            changed = assignment.group(1) + value
            lines.append(changed + ending if changed != body else line)
        elif body.startswith((" ", "\t")) and not body.lstrip().startswith(("{", "#")):
            changed = replace_text(body)
            lines.append(changed + ending if changed != body else line)
        else:
            lines.append(line)
    result = "".join(lines)
    if result.count("\n") != content.count("\n") or result.count("\r") != content.count("\r"):
        raise ValueError("Vela branding must not change localization line endings")
    return result


def is_merged(content: str) -> bool:
    return MERGED_FTL_KEYS.search(content) is not None


def engine_head(path: Path) -> str | None:
    """Read pristine tracked engine content without modifying the Git index."""
    try:
        relative = path.resolve().relative_to(ENGINE.resolve()).as_posix()
    except ValueError:
        return None
    try:
        process = subprocess.run(
            ["git", "-C", str(ENGINE), "show", f"HEAD:{relative}"],
            capture_output=True, check=False, timeout=10,
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if process.returncode:
        return None
    try:
        return process.stdout.decode("utf-8")
    except UnicodeDecodeError:
        return None


def restore_damaged_locale(path: Path, content: str, audit: bool) -> str:
    """Repair only files known to be damaged by the previous Vela script.

    Back up existing content first. Do not rewrite any other engine changes or
    try to guess line separators inside malformed Fluent message values.
    """
    pristine = engine_head(path)
    if pristine is None or is_merged(pristine):
        raise RuntimeError(
            f"{path}: merged Zen settings strings found but no valid tracked "
            "upstream copy is available. Restore only this file from the "
            "engine Git history before rebuilding."
        )
    if not audit:
        backup = path.with_name(path.name + ".vela-damaged-backup")
        if not backup.exists():
            backup.write_text(content, encoding="utf-8")
    print(f"Vela branding: {'would repair' if audit else 'repaired'} broken Fluent file {path}")
    return pristine


def locale_files():
    found = set()
    for root in LOCALE_ROOTS:
        if not root.exists():
            continue
        for ext in ("*.ftl", "*.properties"):
            for path in root.rglob(ext):
                if "en-US" in path.parts and "/obj-" not in str(path):
                    found.add(path)
    return sorted(found)


def launcher_files():
    roots = [ENGINE / "browser" / "branding", ENGINE / "distribution"]
    return sorted({p for root in roots if root.exists() for p in root.rglob("*.desktop")})


def convert_launcher(content: str) -> str:
    result = []
    for line in content.splitlines(keepends=True):
        match = re.match(r"^((?:Name|GenericName|Comment)(?:\[[^]]+\])?=)(.*)$", line)
        if match and "zen" in match.group(2).lower():
            replaced = replace_text(match.group(2))
            line = match.group(1) + replaced
        result.append(line)
    return "".join(result)


def main(argv: list[str] | None = None) -> int:
    if not ENGINE.is_dir():
        raise RuntimeError("Run from the Proairetos-Browser root with engine checked out.")
    audit = "--audit" in (sys.argv[1:] if argv is None else argv)
    changed, repaired = [], 0
    for path in locale_files():
        original = path.read_text(encoding="utf-8")
        clean = original
        if path.suffix == ".ftl" and is_merged(original):
            clean = restore_damaged_locale(path, original, audit)
            repaired += 1
        updated = convert_locale(clean)
        # "Zen Browser" is one user-facing product name, not "Vela Browser".
        # The four official brand.ftl terms are explicitly set to Vela.
        if path.name == "brand.ftl" and "en-US" in path.parts:
            for key in BRAND_KEYS:
                updated = re.sub(
                    r"(?m)^(-" + re.escape(key) + r"[ \t]*=)[^\r\n]*",
                    r"\1 Vela", updated,
                )
        if is_merged(updated):
            raise RuntimeError(f"{path}: malformed localization after branding")
        if updated != original:
            changed.append(path)
            if not audit:
                path.write_text(updated, encoding="utf-8")
    for path in launcher_files():
        original = path.read_text(encoding="utf-8")
        updated = convert_launcher(original)
        if updated != original:
            changed.append(path)
            if not audit:
                path.write_text(updated, encoding="utf-8")
    print(
        f"Vela branding: {'would update' if audit else 'updated'} "
        f"{len(changed)} locale/launcher files; "
        f"{'would repair' if audit else 'repaired'} {repaired} damaged Fluent files."
    )
    for path in changed[:40]:
        print("  ", path)
    if len(changed) > 40:
        print(f"  ... plus {len(changed) - 40} others")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, ValueError) as exc:
        print(f"Vela branding failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
