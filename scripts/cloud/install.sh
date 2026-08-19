#!/usr/bin/env bash
# Cloud Agent `install` phase: idempotent repository/dependency setup.
# System packages (docker.io, supabase CLI) are normally already present in the
# environment build snapshot; the guards below only install them on a cold VM.
set -euo pipefail

cd "$(dirname "$0")/../.."

log() { printf '\n=== %s ===\n' "$1"; }

apt_install() {
  # Retry apt a few times: the archive mirror behind the egress proxy can
  # intermittently return transient 4xx errors.
  local i
  for i in 1 2 3 4 5; do
    sudo apt-get update -y || true
    if sudo DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        -o Dpkg::Options::=--force-confold "$@"; then
      return 0
    fi
    echo "apt install failed (attempt $i), retrying..."
    sleep $((i * 3))
  done
  return 1
}

log "System dependencies (docker, fuse-overlayfs, supabase CLI)"
if ! command -v docker >/dev/null 2>&1; then
  apt_install docker.io fuse-overlayfs uidmap iptables
fi

if ! command -v supabase >/dev/null 2>&1; then
  VER="$(curl -fsSL https://api.github.com/repos/supabase/cli/releases/latest \
        | grep -oP '"tag_name": "\K[^"]+')"
  curl -fsSL "https://github.com/supabase/cli/releases/download/${VER}/supabase_${VER#v}_linux_amd64.deb" \
    -o /tmp/supabase.deb
  sudo dpkg -i /tmp/supabase.deb
fi

log "Docker daemon storage driver (fuse-overlayfs for the nested VM)"
sudo mkdir -p /etc/docker
echo '{"storage-driver":"fuse-overlayfs"}' | sudo tee /etc/docker/daemon.json >/dev/null

log "Node dependencies (npm ci)"
npm ci

log "install.sh complete"
