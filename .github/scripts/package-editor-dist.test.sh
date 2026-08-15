#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
packager="$repo_root/.github/scripts/package-editor-dist.sh"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

mkdir -p "$work_dir/first/assets" "$work_dir/second/assets"
printf '<html></html>\n' > "$work_dir/first/index.html"
printf 'console.log("ok")\n' > "$work_dir/first/assets/app.js"
cp -R "$work_dir/first/." "$work_dir/second/"
touch -t 202001010101 "$work_dir/first/index.html" "$work_dir/first/assets/app.js"
touch -t 202512312359 "$work_dir/second/index.html" "$work_dir/second/assets/app.js"
chmod 0600 "$work_dir/first/index.html" "$work_dir/first/assets/app.js"
chmod 0755 "$work_dir/second/index.html" "$work_dir/second/assets/app.js"

bash "$packager" "$work_dir/first" "$work_dir/first.tar.gz"
bash "$packager" "$work_dir/second" "$work_dir/second.tar.gz"

if ! cmp -s "$work_dir/first.tar.gz" "$work_dir/second.tar.gz"; then
  printf 'packaging depends on source file metadata\n' >&2
  exit 1
fi

tar -tzf "$work_dir/first.tar.gz" | grep -qx './index.html'
tar -tzf "$work_dir/first.tar.gz" | grep -qx './assets/app.js'
