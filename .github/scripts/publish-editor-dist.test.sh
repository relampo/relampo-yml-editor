#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
publisher="$repo_root/.github/scripts/publish-editor-dist.sh"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

printf 'new archive\n' > "$work_dir/dist.tar.gz"
sha256sum "$work_dir/dist.tar.gz" | awk '{print $1}' > "$work_dir/dist.tar.gz.sha256"
mkdir -p "$work_dir/bin" "$work_dir/remote"

cat > "$work_dir/bin/aws" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$AWS_CALL_LOG"

if [[ "$1 $2" == "s3api put-object" ]]; then
  if [[ "${AWS_OBJECT_EXISTS:-false}" == "true" ]]; then
    printf 'PreconditionFailed: At least one of the pre-conditions you specified did not hold\n' >&2
    exit 255
  fi
  exit 0
fi

if [[ "$1 $2" == "s3 cp" ]]; then
  if [[ "$3" == *.sha256 ]]; then
    cp "$AWS_REMOTE_CHECKSUM" "$4"
  else
    cp "$AWS_REMOTE_ARCHIVE" "$4"
  fi
  exit 0
fi

printf 'unexpected aws call: %s\n' "$*" >&2
exit 2
EOF
chmod +x "$work_dir/bin/aws"

export PATH="$work_dir/bin:$PATH"
export AWS_CALL_LOG="$work_dir/aws.log"
export AWS_REMOTE_ARCHIVE="$work_dir/remote/dist.tar.gz"
export AWS_REMOTE_CHECKSUM="$work_dir/remote/dist.tar.gz.sha256"

run_publisher() {
  RELAMPO_DOWNLOADS_BUCKET=test-bucket \
  AWS_REGION=us-east-2 \
  RELEASE_VERSION=v0.3.58 \
  ARCHIVE_PATH="$work_dir/dist.tar.gz" \
  ARCHIVE_SHA_PATH="$work_dir/dist.tar.gz.sha256" \
    bash "$publisher"
}

: > "$AWS_CALL_LOG"
AWS_OBJECT_EXISTS=false run_publisher
if [[ "$(grep -c -- '--if-none-match \*' "$AWS_CALL_LOG")" -ne 2 ]]; then
  printf 'new release did not use conditional writes for both objects\n' >&2
  exit 1
fi

cp "$work_dir/dist.tar.gz" "$AWS_REMOTE_ARCHIVE"
cp "$work_dir/dist.tar.gz.sha256" "$AWS_REMOTE_CHECKSUM"
: > "$AWS_CALL_LOG"
AWS_OBJECT_EXISTS=true run_publisher

printf 'different archive\n' > "$AWS_REMOTE_ARCHIVE"
: > "$AWS_CALL_LOG"
if AWS_OBJECT_EXISTS=true run_publisher; then
  printf 'publisher accepted different bytes for an existing version\n' >&2
  exit 1
fi

if grep -q 's3 cp .* s3://' "$AWS_CALL_LOG"; then
  printf 'publisher used an unconstrained upload\n' >&2
  exit 1
fi
