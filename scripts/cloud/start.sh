#!/usr/bin/env bash
# Cloud Agent `start` phase: per-boot bring-up of the Docker daemon and the local
# Supabase stack, write .env.local, then launch the Next.js dev server. Idempotent
# and safe to re-run.
set -euo pipefail

cd "$(dirname "$0")/../.."

log() { printf '\n=== %s ===\n' "$1"; }

# --- Nested-VM networking -------------------------------------------------
# Docker (v28+) programs nftables. In this nested VM, routing same-bridge
# container-to-container traffic through nftables silently drops packets, so
# Supabase's containers can't reach its Postgres. Making bridged frames bypass
# netfilter fixes it. br_netfilter must be loaded for the sysctl to exist.
enable_bridge_bypass() {
  sudo modprobe br_netfilter 2>/dev/null || true
  sudo sysctl -w \
    net.bridge.bridge-nf-call-iptables=0 \
    net.bridge.bridge-nf-call-ip6tables=0 \
    net.bridge.bridge-nf-call-arptables=0 >/dev/null 2>&1 || true
}

log "Start Docker daemon"
enable_bridge_bypass
if ! sudo docker info >/dev/null 2>&1; then
  sudo mkdir -p /etc/docker
  echo '{"storage-driver":"fuse-overlayfs"}' | sudo tee /etc/docker/daemon.json >/dev/null
  sudo bash -c 'nohup dockerd >/var/log/dockerd.log 2>&1 &'
  for _ in $(seq 1 30); do
    sudo docker info >/dev/null 2>&1 && break
    sleep 2
  done
fi
sudo docker info >/dev/null 2>&1 || { echo "ERROR: docker daemon did not start"; exit 1; }
# Allow the non-root user to talk to Docker (and thus the Supabase CLI).
sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
# Docker resets bridge netfilter on daemon start; re-apply before starting containers.
enable_bridge_bypass

log "Start local Supabase stack (applies migrations + seed.sql on first start)"
# On a cold boot the Postgres container can lag behind the CLI, so retry until the
# stack reports healthy rather than failing on the first attempt.
supabase_up=false
for attempt in $(seq 1 8); do
  if supabase start >/tmp/supabase-start.log 2>&1 || supabase status >/dev/null 2>&1; then
    if supabase status >/dev/null 2>&1; then supabase_up=true; break; fi
  fi
  echo "Supabase not ready yet (attempt ${attempt}); waiting for containers..."
  sleep 10
done
if [ "$supabase_up" != true ]; then
  echo "ERROR: Supabase stack did not become healthy"; tail -n 30 /tmp/supabase-start.log 2>/dev/null || true; exit 1
fi

log "Write .env.local from local Supabase keys"
ANON="$(supabase status -o env | grep '^ANON_KEY=' | cut -d= -f2- | tr -d '"')"
SERVICE="$(supabase status -o env | grep '^SERVICE_ROLE_KEY=' | cut -d= -f2- | tr -d '"')"
cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE}
NEXT_PUBLIC_APP_URL=http://localhost:3000
INKAI_ROOT_EMAIL=admin@inkai.local
NEXT_PUBLIC_INKAI_ROOT_EMAIL=admin@inkai.local
EOF

log "Launch Next.js dev server (tmux session: next-dev)"
# Run the dev server in a detached, persistent session so it survives after this
# script returns and its logs can be inspected/attached later.
TMUX_BIN="tmux"
TMUX_CONF=""
[ -f /exec-daemon/tmux.portal.conf ] && TMUX_CONF="-f /exec-daemon/tmux.portal.conf"
if ! $TMUX_BIN $TMUX_CONF has-session -t "=next-dev" 2>/dev/null; then
  $TMUX_BIN $TMUX_CONF new-session -d -s next-dev -c "$PWD" -- bash -lc 'npm run dev 2>&1 | tee /tmp/next-dev.log'
fi

log "start.sh complete — Supabase at http://127.0.0.1:54321 (Studio :54323), app at http://localhost:3000"
