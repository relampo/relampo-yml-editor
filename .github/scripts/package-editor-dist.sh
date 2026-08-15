#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 2 ]]; then
  printf 'Usage: %s BUILD_DIR OUTPUT_ARCHIVE\n' "$0" >&2
  exit 1
fi

build_dir="$1"
output_archive="$2"
[[ -f "$build_dir/index.html" ]] || {
  printf 'Editor build does not contain index.html: %s\n' "$build_dir" >&2
  exit 1
}

package_tmp_dir="$(mktemp -d)"
trap 'rm -rf -- "$package_tmp_dir"' EXIT
staged_build="$package_tmp_dir/build"
mkdir -p "$staged_build"
cp -R "$build_dir/." "$staged_build/"

# A fixed timestamp plus a sorted file list makes the gzip bytes reproducible
# across reruns of the same build. gzip -n removes its own timestamp and name.
find "$staged_build" -type f -exec chmod 0644 {} +
find "$staged_build" -type f -exec env TZ=UTC touch -t 200001010000 {} +
uncompressed_archive="$package_tmp_dir/dist.tar"
tar_owner_args=(--owner=0 --group=0 --numeric-owner)
if tar --version 2>/dev/null | grep -q '^bsdtar'; then
  tar_owner_args=(--uid 0 --gid 0 --uname root --gname root)
fi
(
  cd "$staged_build"
  find . -type f -print0 \
    | LC_ALL=C sort -z \
    | tar --format=ustar "${tar_owner_args[@]}" --null -T - -cf "$uncompressed_archive"
)
gzip -n -c "$uncompressed_archive" > "$output_archive"
