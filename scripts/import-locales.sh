#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

source_dir="locales/en-US/browser/browser"
target_dir="engine/browser/locales/en-US/browser"

test -d "$source_dir"
test -d "$target_dir"

cp -an "$source_dir/." "$target_dir/"

test -f "$target_dir/zen-library.ftl"

echo "English localization resources imported."
