#!/bin/bash
# =============================================================================
# ElectionCaffe - Unified Startup Script
# Handles end-to-end setup and startup for both local development and production
#
# Usage:
#   ./start.sh                          # Start ALL (backend + frontend) in dev
#   ./start.sh --mode=production        # Start ALL for production
#   ./start.sh --backend                # Start backend services only
#   ./start.sh --frontend               # Start frontend apps only
#   ./start.sh --seed                   # Start with database seeding
#   ./start.sh --skip-deps              # Skip npm install
#   ./start.sh --skip-db                # Skip database setup
#   ./start.sh --help                   # Show help
# =============================================================================

set -e

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Helper Functions ─────────────────────────────────────────────────────────
print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  ╔═══════════════════════════════════════════════════════════╗"
  echo "  ║                                                           ║"
  echo "  ║              ElectionCaffe Platform                       ║"
  echo "  ║              Unified Startup Script                       ║"
  echo "  ║                                                           ║"
  echo "  ╚═══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
}

print_step() {
  echo ""
  echo -e "  ${BLUE}${BOLD}[$1/$TOTAL_STEPS]${NC} ${BOLD}$2${NC}"
  echo -e "  ${DIM}$(printf '%.0s─' {1..55})${NC}"
}

print_ok() {
  echo -e "  ${GREEN}✓${NC} $1"
}

print_warn() {
  echo -e "  ${YELLOW}!${NC} $1"
}

print_fail() {
  echo -e "  ${RED}✗${NC} $1"
}

print_info() {
  echo -e "  ${DIM}→${NC} $1"
}

# ── Parse Arguments ──────────────────────────────────────────────────────────
MODE="local"
TARGET="all"            # all | backend | frontend
SEED=false
SKIP_DEPS=false
SKIP_DB=false
TOTAL_STEPS=9

for arg in "$@"; do
  case $arg in
    --mode=*)
      MODE="${arg#*=}"
      ;;
    --backend)
      TARGET="backend"
      ;;
    --frontend)
      TARGET="frontend"
      ;;
    --seed)
      SEED=true
      ;;
    --skip-deps)
      SKIP_DEPS=true
      ;;
    --skip-db)
      SKIP_DB=true
      ;;
    --help|-h)
      echo ""
      echo "ElectionCaffe Startup Script"
      echo ""
      echo "Usage: ./start.sh [OPTIONS]"
      echo ""
      echo "Target (what to start):"
      echo "  (default)           Start everything (backend + frontend)"
      echo "  --backend           Start backend services only (9 microservices)"
      echo "  --frontend          Start frontend apps only (web + super-admin)"
      echo ""
      echo "Mode:"
      echo "  --mode=local        Development mode with hot-reload (default)"
      echo "  --mode=production   Build and start for production"
      echo ""
      echo "Setup Options:"
      echo "  --seed              Run database seeding after setup"
      echo "  --skip-deps         Skip npm install (use if deps are current)"
      echo "  --skip-db           Skip database schema push"
      echo "  -h, --help          Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./start.sh                              # Dev: start everything"
      echo "  ./start.sh --backend                    # Dev: backend only"
      echo "  ./start.sh --frontend                   # Dev: frontend only"
      echo "  ./start.sh --backend --mode=production  # Prod: backend with PM2"
      echo "  ./start.sh --frontend --mode=production # Prod: build & serve frontend"
      echo "  ./start.sh --skip-deps --skip-db        # Fast restart (no setup)"
      echo "  ./start.sh --seed                       # Full start + seed data"
      echo ""
      echo "Services:"
      echo "  Backend:"
      echo "    Gateway API        :3000    Auth Service      :3001"
      echo "    Election Service   :3002    Voter Service     :3003"
      echo "    Cadre Service      :3004    Analytics Service :3005"
      echo "    Reporting Service  :3006    AI Analytics      :3007"
      echo "    Super Admin API    :3008"
      echo ""
      echo "  Frontend:"
      echo "    Web App            :5000 (dev) / :80 (prod via nginx)"
      echo "    Super Admin UI     :5174 (dev) / :8080 (prod via nginx)"
      echo ""
      exit 0
      ;;
    *)
      print_fail "Unknown argument: $arg"
      echo "  Run ./start.sh --help for usage"
      exit 1
      ;;
  esac
done

# Adjust step count based on flags
if [ "$SKIP_DEPS" = true ]; then TOTAL_STEPS=$((TOTAL_STEPS - 1)); fi
if [ "$SKIP_DB" = true ]; then TOTAL_STEPS=$((TOTAL_STEPS - 1)); fi
if [ "$SEED" = false ]; then TOTAL_STEPS=$((TOTAL_STEPS - 1)); fi
if [ "$MODE" = "production" ]; then TOTAL_STEPS=$((TOTAL_STEPS + 1)); fi
# Frontend-only skips DB and Prisma steps
if [ "$TARGET" = "frontend" ]; then
  SKIP_DB=true
  TOTAL_STEPS=$((TOTAL_STEPS - 2))  # skip prisma + db steps
fi

CURRENT_STEP=0
next_step() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
}

# ── Start ────────────────────────────────────────────────────────────────────
print_banner
echo -e "  Mode:   ${BOLD}${MAGENTA}${MODE}${NC}"
echo -e "  Target: ${BOLD}${CYAN}${TARGET}${NC}"
if [ "$SEED" = true ]; then echo -e "  Seed:   ${GREEN}yes${NC}"; fi
if [ "$SKIP_DEPS" = true ]; then echo -e "  Deps:   ${YELLOW}skipped${NC}"; fi
if [ "$SKIP_DB" = true ]; then echo -e "  DB:     ${YELLOW}skipped${NC}"; fi

# ── Step: Prerequisites ─────────────────────────────────────────────────────
next_step
print_step "$CURRENT_STEP" "Checking Prerequisites"

# Node.js
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)
  if [ "$NODE_MAJOR" -lt 18 ]; then
    print_fail "Node.js >= 18 required. Found: v$NODE_VERSION"
    exit 1
  fi
  print_ok "Node.js v$NODE_VERSION"
else
  print_fail "Node.js not found. Install Node.js >= 18 from https://nodejs.org"
  exit 1
fi

# npm
if command -v npm &> /dev/null; then
  print_ok "npm $(npm -v)"
else
  print_fail "npm not found"
  exit 1
fi

# PostgreSQL check (skip for frontend-only)
if [ "$TARGET" != "frontend" ]; then
  PG_PORT=5333
  if node -e "const s=require('net').createConnection({port:$PG_PORT,host:'127.0.0.1'});s.on('connect',()=>{s.destroy();process.exit(0)});s.on('error',()=>process.exit(1))" 2>/dev/null; then
    print_ok "PostgreSQL running on port $PG_PORT"
  else
    print_warn "PostgreSQL not running on port $PG_PORT — start it manually before proceeding"
  fi
fi

# PM2 check for production
if [ "$MODE" = "production" ] && [ "$TARGET" != "frontend" ]; then
  if command -v pm2 &> /dev/null; then
    print_ok "PM2 $(pm2 -v)"
  else
    print_warn "PM2 not installed. Install with: npm install -g pm2"
    print_info "Will fall back to turbo start"
  fi
fi

# ── Step: Environment ────────────────────────────────────────────────────────
next_step
print_step "$CURRENT_STEP" "Environment Configuration"

if [ ! -f ".env" ]; then
  if [ "$MODE" = "production" ] && [ -f ".env.production.example" ]; then
    cp .env.production.example .env
    print_warn "Created .env from .env.production.example"
    print_warn "UPDATE .env WITH YOUR PRODUCTION SETTINGS BEFORE CONTINUING"
  elif [ -f ".env.example" ]; then
    cp .env.example .env
    print_ok "Created .env from .env.example"
  else
    print_fail "No .env or .env.example found"
    exit 1
  fi
else
  print_ok ".env file found"
fi

# Validate critical env vars (skip for frontend-only)
source_env() {
  if [ -f ".env" ]; then
    set -a
    # shellcheck disable=SC1091
    source .env 2>/dev/null || true
    set +a
  fi
}
source_env

if [ "$TARGET" != "frontend" ]; then
  if [ -z "$DATABASE_URL" ] && [ -z "$CORE_DATABASE_URL" ]; then
    print_warn "DATABASE_URL / CORE_DATABASE_URL not set in .env"
  fi
  if [ -z "$JWT_SECRET" ]; then
    print_warn "JWT_SECRET not set in .env"
  fi
fi

print_ok "Environment loaded"

# ── Step: Dependencies ───────────────────────────────────────────────────────
if [ "$SKIP_DEPS" = false ]; then
  next_step
  print_step "$CURRENT_STEP" "Installing Dependencies"
  npm install 2>&1 | tail -5
  print_ok "All dependencies installed"
fi

# ── Step: Prisma Clients (skip for frontend-only) ───────────────────────────
if [ "$TARGET" != "frontend" ]; then
  next_step
  print_step "$CURRENT_STEP" "Generating Prisma Clients"
  npm run db:generate 2>&1 | tail -3
  print_ok "Prisma clients generated (core + tenant + legacy)"
fi

# ── Step: Build Shared Packages ─────────────────────────────────────────────
next_step
print_step "$CURRENT_STEP" "Building Shared Packages"
npx turbo run build --filter=@electioncaffe/shared --filter=@electioncaffe/database 2>&1 | tail -5
print_ok "@electioncaffe/shared built"
print_ok "@electioncaffe/database built"

# ── Step: Database (skip for frontend-only) ──────────────────────────────────
if [ "$SKIP_DB" = false ] && [ "$TARGET" != "frontend" ]; then
  next_step
  print_step "$CURRENT_STEP" "Database Schema Setup"
  npm run db:push 2>&1 | tail -3 || print_warn "Legacy schema push had issues (may be OK)"
  print_ok "Database schemas applied"

  # Push latest schema to all existing tenant databases (pure bash — no child process issues)
  print_info "Pushing latest schema to all tenant databases..."
  TENANT_URLS=$(node --input-type=module << 'EOJS'
import dotenv from 'dotenv';
dotenv.config();
const { coreDb } = await import('./packages/database/dist/clients/core-client.js');
const tenants = await coreDb.tenant.findMany({
  where: { databaseStatus: 'READY', databaseConnectionUrl: { not: null } },
  select: { slug: true, databaseConnectionUrl: true }
});
for (const t of tenants) {
  process.stdout.write('ROW:' + t.slug + '\t' + t.databaseConnectionUrl + '\n');
}
await coreDb.$disconnect();
process.exit(0);
EOJS
2>/dev/null | grep '^ROW:' | sed 's/^ROW://')

  if [ -n "$TENANT_URLS" ]; then
    while IFS=$'\t' read -r slug url; do
      if [ -n "$url" ]; then
        print_info "Syncing schema → $slug"
        TENANT_DATABASE_URL="$url" npx prisma db push \
          --schema=packages/database/prisma/tenant/schema.prisma \
          --accept-data-loss --skip-generate 2>&1 | grep -E "in sync|Your database|Error" || true
      fi
    done <<< "$TENANT_URLS"
    print_ok "All tenant databases synced"
  else
    print_warn "No READY tenant databases found (skipping)"
  fi
fi

# ── Step: Seed ───────────────────────────────────────────────────────────────
if [ "$SEED" = true ] && [ "$TARGET" != "frontend" ]; then
  next_step
  print_step "$CURRENT_STEP" "Seeding Database"
  npm run db:seed 2>&1 | tail -5
  print_ok "Database seeded"
fi

# ── Step: Log Directories ───────────────────────────────────────────────────
next_step
print_step "$CURRENT_STEP" "Setting Up Log Directories"

LOG_SERVICES="gateway auth-service election-service voter-service cadre-service analytics-service reporting-service ai-analytics-service super-admin-service web super-admin"
for svc in $LOG_SERVICES; do
  mkdir -p "logs/$svc"
done
print_ok "Log directories ready at ./logs/"
print_info "Each service logs to: logs/<service>/combined.log + error.log"

# ── Step: Start Services ────────────────────────────────────────────────────
next_step
print_step "$CURRENT_STEP" "Starting Services"

# ── LOCAL (Development) Mode ─────────────────────────────────────────────────
if [ "$MODE" = "local" ]; then

  if [ "$TARGET" = "all" ]; then
    echo ""
    echo -e "  ${CYAN}${BOLD}Starting: Backend + Frontend${NC}"
    echo -e "  ┌─────────────────────────────────────────────────┐"
    echo -e "  │  ${BLUE}Gateway API${NC}        http://localhost:3000       │"
    echo -e "  │  ${BLUE}Auth Service${NC}       http://localhost:3001       │"
    echo -e "  │  ${BLUE}Election Service${NC}   http://localhost:3002       │"
    echo -e "  │  ${BLUE}Voter Service${NC}      http://localhost:3003       │"
    echo -e "  │  ${BLUE}Cadre Service${NC}      http://localhost:3004       │"
    echo -e "  │  ${BLUE}Analytics Service${NC}  http://localhost:3005       │"
    echo -e "  │  ${BLUE}Reporting Service${NC}  http://localhost:3006       │"
    echo -e "  │  ${BLUE}AI Analytics${NC}       http://localhost:3007       │"
    echo -e "  │  ${BLUE}Super Admin API${NC}    http://localhost:3008       │"
    echo -e "  │  ${GREEN}${BOLD}Web App${NC}            http://localhost:5000       │"
    echo -e "  │  ${GREEN}${BOLD}Super Admin UI${NC}     http://localhost:5174       │"
    echo -e "  └─────────────────────────────────────────────────┘"
    echo ""
    echo -e "  ${DIM}Logs: Set ENABLE_FILE_LOGGING=true in .env for file logging${NC}"
    echo -e "  ${DIM}Press Ctrl+C to stop all services${NC}"
    echo ""
    npm run dev

  elif [ "$TARGET" = "backend" ]; then
    echo ""
    echo -e "  ${CYAN}${BOLD}Starting: Backend Only${NC}"
    echo -e "  ┌─────────────────────────────────────────────────┐"
    echo -e "  │  ${BLUE}Gateway API${NC}        http://localhost:3000       │"
    echo -e "  │  ${BLUE}Auth Service${NC}       http://localhost:3001       │"
    echo -e "  │  ${BLUE}Election Service${NC}   http://localhost:3002       │"
    echo -e "  │  ${BLUE}Voter Service${NC}      http://localhost:3003       │"
    echo -e "  │  ${BLUE}Cadre Service${NC}      http://localhost:3004       │"
    echo -e "  │  ${BLUE}Analytics Service${NC}  http://localhost:3005       │"
    echo -e "  │  ${BLUE}Reporting Service${NC}  http://localhost:3006       │"
    echo -e "  │  ${BLUE}AI Analytics${NC}       http://localhost:3007       │"
    echo -e "  │  ${BLUE}Super Admin API${NC}    http://localhost:3008       │"
    echo -e "  └─────────────────────────────────────────────────┘"
    echo ""
    echo -e "  ${DIM}Press Ctrl+C to stop all services${NC}"
    echo ""
    npm run services:dev

  elif [ "$TARGET" = "frontend" ]; then
    echo ""
    echo -e "  ${CYAN}${BOLD}Starting: Frontend Only${NC}"
    echo -e "  ┌─────────────────────────────────────────────────┐"
    echo -e "  │  ${GREEN}${BOLD}Web App${NC}            http://localhost:5000       │"
    echo -e "  │  ${GREEN}${BOLD}Super Admin UI${NC}     http://localhost:5174       │"
    echo -e "  └─────────────────────────────────────────────────┘"
    echo ""
    echo -e "  ${YELLOW}!${NC} Make sure backend is running separately"
    echo -e "  ${DIM}Press Ctrl+C to stop${NC}"
    echo ""
    npx concurrently \
      --names "web,super-admin" \
      --prefix-colors "green,magenta" \
      "npm run dev --workspace=@electioncaffe/web" \
      "npm run dev --workspace=@electioncaffe/super-admin"
  fi

# ── PRODUCTION Mode ──────────────────────────────────────────────────────────
elif [ "$MODE" = "production" ]; then

  next_step
  print_step "$CURRENT_STEP" "Building for Production"

  if [ "$TARGET" = "all" ]; then
    # Build everything
    npm run build 2>&1 | tail -10
    print_ok "All services and apps built"

  elif [ "$TARGET" = "backend" ]; then
    # Build backend services + shared packages
    npx turbo run build --filter='./services/*' 2>&1 | tail -10
    print_ok "All backend services built"

  elif [ "$TARGET" = "frontend" ]; then
    # Build frontend apps
    npx turbo run build --filter='./apps/*' 2>&1 | tail -10
    print_ok "Frontend apps built"
  fi

  # ── Start Backend (PM2) ────────────────────────────────────────────────────
  if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
    if command -v pm2 &> /dev/null; then
      print_info "Starting backend services with PM2..."
      pm2 delete ecosystem.config.cjs 2>/dev/null || true
      pm2 start ecosystem.config.cjs
      pm2 save

      echo ""
      print_ok "Backend services started with PM2"

      # Health checks
      echo ""
      print_info "Running health checks (waiting 8s for services to boot)..."
      sleep 8

      PORTS="3000 3001 3002 3003 3004 3005 3006 3007 3008"
      ALL_HEALTHY=true
      for port in $PORTS; do
        if node -e "fetch('http://localhost:$port/health').then(r=>{if(!r.ok)throw 1;process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; then
          print_ok "Port $port healthy"
        else
          print_warn "Port $port not responding yet (may still be starting)"
          ALL_HEALTHY=false
        fi
      done

      echo ""
      if [ "$ALL_HEALTHY" = true ]; then
        print_ok "All backend services are healthy!"
      else
        print_warn "Some services still starting. Run 'pm2 status' to check."
      fi

    else
      print_warn "PM2 not found. Install with: npm install -g pm2"
      print_info "Starting with turbo instead..."
      npm run start
    fi
  fi

  # ── Start/Serve Frontend ───────────────────────────────────────────────────
  if [ "$TARGET" = "all" ] || [ "$TARGET" = "frontend" ]; then
    echo ""
    echo -e "  ${CYAN}${BOLD}Frontend Production Build:${NC}"
    echo ""
    print_ok "Web App built to:        apps/web/dist/"
    print_ok "Super Admin built to:    apps/super-admin/dist/"
    echo ""

    # Check if 'serve' is available for quick static serving
    if command -v serve &> /dev/null || npx --yes serve --help &> /dev/null 2>&1; then
      echo -e "  ${CYAN}Serving frontend apps...${NC}"
      echo -e "  ┌─────────────────────────────────────────────────┐"
      echo -e "  │  ${GREEN}${BOLD}Web App${NC}            http://localhost:4173       │"
      echo -e "  │  ${GREEN}${BOLD}Super Admin UI${NC}     http://localhost:4174       │"
      echo -e "  └─────────────────────────────────────────────────┘"
      echo ""

      npx concurrently \
        --names "web,super-admin" \
        --prefix-colors "green,magenta" \
        "npx serve apps/web/dist -l 4173 -s" \
        "npx serve apps/super-admin/dist -l 4174 -s"
    else
      echo -e "  ${YELLOW}To serve frontend locally, use one of:${NC}"
      echo ""
      echo -e "  ${DIM}Option 1: npx serve (quick)${NC}"
      echo "    npx serve apps/web/dist -l 4173 -s"
      echo "    npx serve apps/super-admin/dist -l 4174 -s"
      echo ""
      echo -e "  ${DIM}Option 2: nginx (recommended for production)${NC}"
      echo "    Copy dist/ contents to nginx web root"
      echo "    Configure proxy_pass /api → http://localhost:3000"
      echo ""
      echo -e "  ${DIM}Option 3: Docker${NC}"
      echo "    docker compose up web super-admin"
      echo ""
    fi
  fi

  # ── Summary ────────────────────────────────────────────────────────────────
  echo ""
  echo -e "  ${CYAN}${BOLD}Useful Commands:${NC}"
  if [ "$TARGET" = "all" ] || [ "$TARGET" = "backend" ]; then
    echo -e "  ${DIM}pm2 status${NC}         - Check service status"
    echo -e "  ${DIM}pm2 logs${NC}           - Stream all logs"
    echo -e "  ${DIM}pm2 logs gateway${NC}   - Stream gateway logs"
    echo -e "  ${DIM}pm2 restart all${NC}    - Restart all services"
    echo -e "  ${DIM}./stop.sh${NC}          - Stop all services"
  fi
  echo ""
  echo -e "  ${CYAN}${BOLD}Log Files:${NC}"
  echo -e "  ${DIM}logs/<service>/combined.log${NC}  - All logs (daily rotation)"
  echo -e "  ${DIM}logs/<service>/error.log${NC}     - Errors only"
  echo ""
fi

echo -e "${GREEN}${BOLD}Done!${NC}"
