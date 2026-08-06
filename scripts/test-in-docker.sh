#!/usr/bin/env bash

set -euo pipefail

suite=${1:-}
if [[ -z $suite ]]; then
  echo "Usage: test-in-docker.sh <visual|e2e> [--update]" >&2
  exit 2
fi
shift

update_snapshots=false
if [[ ${1:-} == "--update" ]]; then
  update_snapshots=true
  shift
fi

if [[ $# -ne 0 ]]; then
  echo "Usage: bun run test:$suite:docker[:update]" >&2
  exit 2
fi

case $suite in
  visual)
    runtime_label="Visual tests"
    container_command=(/usr/local/bin/run-visual-tests)
    ;;
  e2e)
    runtime_label="End-to-end tests"
    container_command=(bun run test:e2e --)
    if [[ $update_snapshots == true ]]; then
      container_command+=(--update-snapshots)
    fi
    ;;
  *)
    echo "Unknown Docker test suite: $suite" >&2
    exit 2
    ;;
esac

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "$runtime_label require a running Docker daemon." >&2
  echo "Install or start Docker, then run this command again." >&2
  exit 1
fi

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
image="english-draft-visual-test:1.62.1"

cd "$repository_root"
docker build --file Dockerfile.visual-test --tag "$image" .

docker_arguments=(
  run
  --rm
  --init
  --ipc=host
  --volume "$repository_root:/work"
  --volume /work/node_modules
  --workdir /work
)
if [[ $suite == visual && $update_snapshots == true ]]; then
  docker_arguments+=(--env UPDATE_SNAPSHOTS=1)
fi
docker_arguments+=("$image" "${container_command[@]}")

docker "${docker_arguments[@]}"
