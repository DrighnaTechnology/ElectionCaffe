#!/bin/bash
# =============================================================================
# ElectionCaffe - Stop All Services
#
# Usage:
#   ./stop.sh                # Stop everything (auto-detects PM2 or Turbo)
#   ./stop.sh --backend      # Stop backend services only
#   ./stop.sh --frontend     # Stop frontend dev servers only
#   ./stop.sh --pm2          # Stop PM2 managed services (production)
#   ./stop.sh --all          # Stop PM2 + any remaining node processes
# =============================================================================

set -e

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

print_ok() {
  echo -e "  ${GREEN}✓${NC} $1"
}

print_warn() {
  echo -e "  ${YELLOW}!${NC} $1"
}

print_info() {
  echo -e "  ${DIM}→${NC} $1"
}

# ── Parse Arguments ──────────────────────────────────────────────────────────
TARGET="auto"

for arg in "$@"; do
  case $arg in
    --backend)   TARGET="backend" ;;
    --frontend)  TARGET="frontend" ;;
    --pm2)       TARGET="pm2" ;;
    --all)       TARGET="all" ;;
    --help|-h)
      echo ""
      echo "ElectionCaffe Stop Script"
      echo ""
      echo "Usage: ./stop.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --backend     Stop backend services only (ports 3000-3008)"
      echo "  --frontend    Stop frontend dev servers only (ports 5000-5174)"
      echo "  --pm2         Stop PM2 managed services (production)"
      echo "  --all         Stop everything: PM2 + kill remaining node processes on service ports"
      echo "  -h, --help    Show this help message"
      echo ""
      echo "Without options, auto-detects: if PM2 is running ElectionCaffe services,"
      echo "stops via PM2. Otherwise kills processes on known service ports."
      echo ""
      exit 0
      ;;
    *)
      echo -e "  ${RED}✗${NC} Unknown argument: $arg"
      echo "  Run ./stop.sh --help for usage"
      exit 1
      ;;
  esac
done

echo ""
echo -e "  ${CYAN}${BOLD}ElectionCaffe — Stopping Services${NC}"
echo -e "  ${DIM}$(printf '%.0s─' {1..40})${NC}"

# ── Helper: Kill process on a port ──────────────────────────────────────────
kill_port() {
  local port=$1
  local label=$2
  # Cross-platform: works on Linux, macOS, and Git Bash (Windows)
  local pid
  pid=$(node -e "
    const net = require('net');
    const s = net.createConnection({port: $port, host: '127.0.0.1'});
    s.on('connect', () => { s.destroy(); process.exit(0); });
    s.on('error', () => { process.exit(1); });
  " 2>/dev/null && echo "in-use" || echo "")

  if [ "$pid" = "in-use" ]; then
    # Find and kill the process
    if command -v lsof &> /dev/null; then
      local pids
      pids=$(lsof -ti :"$port" 2>/dev/null || true)
      if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -SIGTERM 2>/dev/null || true
        print_ok "Stopped $label (port $port)"
        return 0
      fi
    elif command -v netstat &> /dev/null; then
      # Windows Git Bash / systems without lsof
      local pids
      pids=$(netstat -ano 2>/dev/null | grep ":${port} " | grep LISTEN | awk '{print $5}' | sort -u || true)
      if [ -n "$pids" ]; then
        for p in $pids; do
          taskkill //PID "$p" //F 2>/dev/null || kill -SIGTERM "$p" 2>/dev/null || true
        done
        print_ok "Stopped $label (port $port)"
        return 0
      fi
    fi
    print_warn "$label (port $port) — could not find PID to kill"
  else
    print_info "$label (port $port) — not running"
  fi
  return 0
}

# ── Stop PM2 Services ───────────────────────────────────────────────────────
stop_pm2() {
  if command -v pm2 &> /dev/null; then
    local pm2_count
    pm2_count=$(pm2 jlist 2>/dev/null | node -e "
      let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
        try{const a=JSON.parse(d);const c=a.filter(p=>['gateway','auth-service','election-service','voter-service','cadre-service','analytics-service','reporting-service','ai-analytics-service','super-admin-service'].includes(p.name));console.log(c.length)}catch{console.log(0)}
      })
    " 2>/dev/null || echo "0")

    if [ "$pm2_count" != "0" ] && [ -n "$pm2_count" ]; then
      pm2 stop ecosystem.config.cjs 2>/dev/null && print_ok "PM2: Stopped all services ($pm2_count processes)" || print_warn "PM2: stop command had issues"
      pm2 delete ecosystem.config.cjs 2>/dev/null || true
      return 0
    else
      print_info "PM2: No ElectionCaffe services running"
      return 1
    fi
  else
    print_info "PM2: Not installed"
    return 1
  fi
}

# ── Stop Backend (ports 3000-3008) ───────────────────────────────────────────
stop_backend() {
  echo ""
  echo -e "  ${BOLD}Backend Services${NC}"
  kill_port 3000 "Gateway"
  kill_port 3001 "Auth Service"
  kill_port 3002 "Election Service"
  kill_port 3003 "Voter Service"
  kill_port 3004 "Cadre Service"
  kill_port 3005 "Analytics Service"
  kill_port 3006 "Reporting Service"
  kill_port 3007 "AI Analytics"
  kill_port 3008 "Super Admin API"
}

# ── Stop Frontend (ports 5000-5174) ──────────────────────────────────────────
stop_frontend() {
  echo ""
  echo -e "  ${BOLD}Frontend Apps${NC}"
  kill_port 5000 "Web App"
  kill_port 5174 "Super Admin UI"
}

# ── Execute Based on Target ──────────────────────────────────────────────────
case "$TARGET" in
  auto)
    # Try PM2 first, then fall back to port killing
    if ! stop_pm2; then
      stop_backend
      stop_frontend
    else
      # PM2 only manages backend, check frontend separately
      stop_frontend
    fi
    ;;
  backend)
    stop_pm2 2>/dev/null || true
    stop_backend
    ;;
  frontend)
    stop_frontend
    ;;
  pm2)
    stop_pm2
    ;;
  all)
    stop_pm2 2>/dev/null || true
    stop_backend
    stop_frontend
    ;;
esac

echo ""
echo -e "  ${GREEN}${BOLD}All services stopped.${NC}"
echo ""
