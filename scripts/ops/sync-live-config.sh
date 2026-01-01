#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="${LIBRECHAT_CONFIG_DIR:-/home/danielv/librechat-config}"
TARGET_DIR="${LIBRECHAT_ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SYNC_DELETE="${SYNC_DELETE:-true}"

SOURCE_CONFIG="${SOURCE_DIR}/librechat.yaml"
TARGET_CONFIG="${TARGET_DIR}/librechat.yaml"
SOURCE_MCP="${SOURCE_DIR}/mcp-servers"
TARGET_MCP="${TARGET_DIR}/mcp-servers"

if [[ ! -f "${SOURCE_CONFIG}" ]]; then
  echo "Missing source config: ${SOURCE_CONFIG}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
if [[ "$(realpath "${SOURCE_CONFIG}")" == "$(realpath "${TARGET_CONFIG}")" ]]; then
  echo "Config already synced: ${TARGET_CONFIG}"
else
  cp "${SOURCE_CONFIG}" "${TARGET_CONFIG}"
  echo "Synced config: ${SOURCE_CONFIG} -> ${TARGET_CONFIG}"
fi

if [[ -d "${SOURCE_MCP}" ]]; then
  if [[ "$(realpath "${SOURCE_MCP}")" == "$(realpath "${TARGET_MCP}")" ]]; then
    echo "MCP servers already synced: ${TARGET_MCP}"
  else
    mkdir -p "${TARGET_MCP}"
    if command -v rsync >/dev/null 2>&1; then
      if [[ "${SYNC_DELETE}" == "true" ]]; then
        rsync -a --delete "${SOURCE_MCP}/" "${TARGET_MCP}/"
      else
        rsync -a "${SOURCE_MCP}/" "${TARGET_MCP}/"
      fi
    else
      cp -a "${SOURCE_MCP}/." "${TARGET_MCP}/"
    fi
    echo "Synced MCP servers: ${SOURCE_MCP} -> ${TARGET_MCP}"
  fi
else
  echo "Missing source mcp-servers directory: ${SOURCE_MCP}" >&2
fi
