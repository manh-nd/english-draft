#!/usr/bin/env bash

set -euo pipefail

storybook_url="http://127.0.0.1:6006"
storybook_log="/tmp/english-draft-storybook.log"

bun run build-storybook --quiet
bunx http-server storybook-static -a 0.0.0.0 -p 6006 --silent \
  >"$storybook_log" 2>&1 &
storybook_pid=$!

cleanup() {
  kill "$storybook_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT

storybook_ready=false
for _ in $(seq 1 60); do
  if ! kill -0 "$storybook_pid" >/dev/null 2>&1; then
    break
  fi

  if bun -e "fetch('$storybook_url/index.json').then(response => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"; then
    storybook_ready=true
    break
  fi

  sleep 1
done

if [[ $storybook_ready != true ]]; then
  cat "$storybook_log" >&2
  echo "Visual tests could not start the required Storybook server at $storybook_url." >&2
  exit 1
fi

test_arguments=(--url "$storybook_url" --maxWorkers=1 --no-cache)
if [[ ${UPDATE_SNAPSHOTS:-0} == 1 ]]; then
  test_arguments+=(--updateSnapshot)
fi

bun run test-storybook -- "${test_arguments[@]}"
