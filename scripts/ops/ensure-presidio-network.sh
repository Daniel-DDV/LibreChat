#!/usr/bin/env bash
set -euo pipefail

NETWORK="${PRESIDIO_NETWORK:-librechat_default}"
CONTAINERS=("presidio-analyzer" "presidio-anonymizer")

if ! docker network inspect "${NETWORK}" >/dev/null 2>&1; then
  echo "Docker network not found: ${NETWORK}" >&2
  exit 1
fi

for container in "${CONTAINERS[@]}"; do
  if ! docker inspect "${container}" >/dev/null 2>&1; then
    echo "Container not found: ${container} (skipping)"
    continue
  fi

  if docker inspect -f '{{json .NetworkSettings.Networks}}' "${container}" | grep -q "\"${NETWORK}\""; then
    echo "${container} already attached to ${NETWORK}"
    continue
  fi

  docker network connect "${NETWORK}" "${container}"
  echo "Attached ${container} to ${NETWORK}"
done
