#!/usr/bin/env bash
set -Eeuo pipefail

: "${RELAMPO_DOWNLOADS_BUCKET:?RELAMPO_DOWNLOADS_BUCKET is required}"
: "${AWS_REGION:?AWS_REGION is required}"
: "${RELEASE_VERSION:?RELEASE_VERSION is required}"
: "${ARCHIVE_PATH:?ARCHIVE_PATH is required}"
: "${ARCHIVE_SHA_PATH:?ARCHIVE_SHA_PATH is required}"

if [[ ! "$RELEASE_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  printf 'Invalid editor version: %s\n' "$RELEASE_VERSION" >&2
  exit 1
fi
[[ -f "$ARCHIVE_PATH" ]] || { printf 'Archive not found: %s\n' "$ARCHIVE_PATH" >&2; exit 1; }
[[ -f "$ARCHIVE_SHA_PATH" ]] || { printf 'Archive checksum not found: %s\n' "$ARCHIVE_SHA_PATH" >&2; exit 1; }

release_tmp_dir="$(mktemp -d)"
trap 'rm -rf -- "$release_tmp_dir"' EXIT

put_immutable() {
  local -r source_path="$1"
  local -r object_key="$2"
  local -r content_type="$3"
  local -r put_error="$release_tmp_dir/put-error"

  if aws s3api put-object \
    --bucket "$RELAMPO_DOWNLOADS_BUCKET" \
    --key "$object_key" \
    --body "$source_path" \
    --if-none-match '*' \
    --region "$AWS_REGION" \
    --server-side-encryption AES256 \
    --content-type "$content_type" > /dev/null 2> "$put_error"; then
    printf 'Published s3://%s/%s\n' "$RELAMPO_DOWNLOADS_BUCKET" "$object_key"
    return 0
  fi

  if ! grep -Eq 'PreconditionFailed|HTTP status code: 412|status code: 412' "$put_error"; then
    cat "$put_error" >&2
    return 1
  fi

  local -r existing_path="$release_tmp_dir/$(basename "$object_key")"
  aws s3 cp \
    "s3://$RELAMPO_DOWNLOADS_BUCKET/$object_key" \
    "$existing_path" \
    --region "$AWS_REGION" > /dev/null

  local source_sha existing_sha
  source_sha="$(sha256sum "$source_path" | awk '{print $1}')"
  existing_sha="$(sha256sum "$existing_path" | awk '{print $1}')"
  if [[ "$source_sha" != "$existing_sha" ]]; then
    printf 'Refusing to overwrite immutable editor object s3://%s/%s\n' \
      "$RELAMPO_DOWNLOADS_BUCKET" "$object_key" >&2
    return 1
  fi

  printf 'Reusing identical s3://%s/%s\n' "$RELAMPO_DOWNLOADS_BUCKET" "$object_key"
}

release_prefix="editor/$RELEASE_VERSION"
put_immutable "$ARCHIVE_PATH" "$release_prefix/dist.tar.gz" application/gzip
put_immutable "$ARCHIVE_SHA_PATH" "$release_prefix/dist.tar.gz.sha256" text/plain
