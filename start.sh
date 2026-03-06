#!/bin/bash
# =============================================================================
# ElectionCaffe - Unified Setup & Startup Script
# Single script to set up and run the entire platform end-to-end.
#
# What this script does:
#   1. Checks prerequisites (Node.js, npm, PostgreSQL, PM2)
#   2. Validates & loads .env (creates from .env.example if missing)
#   3. Verifies PostgreSQL connection using .env credentials
#   4. Creates databases if they don't exist (core + tenant)
#   5. Installs npm dependencies
#   6. Generates Prisma clients (core + tenant)
#   7. Builds shared packages (@electioncaffe/shared, @electioncaffe/database)
#   8. Pushes database schemas (Prisma db push)
#   9. Seeds core database (super admin, plans, feature flags)
#  10. Syncs schema to all existing tenant databases
#  11. Creates log directories
#  12. Starts services (dev with turbo / prod with PM2)
#
# Core seed (always runs) creates: super admin, license plans, feature flags,
# AI config, website templates. These are platform infrastructure, not data.
#
# Usage:
#   ./start.sh                          # Start ALL (backend + frontend) in dev
#   ./start.sh --mode=production        # Start ALL for production
#   ./start.sh --backend                # Start backend services only
#   ./start.sh --frontend               # Start frontend apps only
#   ./start.sh --skip-deps              # Skip npm install
#   ./start.sh --skip-db                # Skip database setup entirely
#   ./start.sh --setup-only             # Run setup steps only, don't start services
#   ./start.sh --seed-demo              # DEV ONLY: seed fake demo data (voters, elections)
#   ./start.sh --help                   # Show help
# =============================================================================

set -eo pipefail

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
  echo "  ║              Setup & Startup Script                       ║"
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
SEED_DEMO=false
SKIP_DEPS=false
SKIP_DB=false
SETUP_ONLY=false

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
    --seed-demo)
      SEED_DEMO=true
      ;;
    --seed)
      # Backwards compat — treat as --seed-demo
      SEED_DEMO=true
      ;;
    --skip-deps)
      SKIP_DEPS=true
      ;;
    --skip-db)
      SKIP_DB=true
      ;;
    --setup-only)
      SETUP_ONLY=true
      ;;
    --help|-h)
      echo ""
      echo "ElectionCaffe - Setup & Startup Script"
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
      echo "  --skip-deps         Skip npm install (use if deps are current)"
      echo "  --skip-db           Skip all database setup (schema, seed, creation)"
      echo "  --setup-only        Only run setup (env, deps, db), don't start services"
      echo "  --seed-demo         DEV ONLY: seed fake demo data (voters, elections)"
      echo "                      Blocked in production. Real data comes from the UI."
      echo "  -h, --help          Show this help message"
      echo ""
      echo "First-Time Setup:"
      echo "  ./start.sh                              # Setup + start (creates DBs, super admin)"
      echo ""
      echo "Quick Restart (everything already set up):"
      echo "  ./start.sh --skip-deps --skip-db        # Fast restart, no setup"
      echo ""
      echo "Examples:"
      echo "  ./start.sh                              # Dev: full setup + start all"
      echo "  ./start.sh --backend                    # Dev: backend only"
      echo "  ./start.sh --frontend                   # Dev: frontend only"
      echo "  ./start.sh --mode=production            # Prod: full setup + PM2"
      echo "  ./start.sh --setup-only                 # Setup only, don't start"
      echo "  ./start.sh --seed-demo                  # Dev: setup + fake demo data"
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
      echo "Super Admin Login (created automatically):"
      echo "    Email:    superadmin@electioncaffe.com"
      echo "    Password: SuperAdmin@123"
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

# ── Calculate Total Steps ────────────────────────────────────────────────────
# Base steps: prerequisites, env, pg-verify, db-create, deps, prisma, shared-build, db-push, core-seed, logs, start
TOTAL_STEPS=11
if [ "$SKIP_DEPS" = true ]; then TOTAL_STEPS=$((TOTAL_STEPS - 1)); fi
if [ "$SKIP_DB" = true ]; then TOTAL_STEPS=$((TOTAL_STEPS - 4)); fi  # skip pg-verify, db-create, db-push, core-seed
if [ "$SEED_DEMO" = true ] && [ "$SKIP_DB" = false ]; then TOTAL_STEPS=$((TOTAL_STEPS + 1)); fi
if [ "$MODE" = "production" ] && [ "$SETUP_ONLY" = false ]; then TOTAL_STEPS=$((TOTAL_STEPS + 1)); fi
if [ "$SETUP_ONLY" = true ]; then TOTAL_STEPS=$((TOTAL_STEPS - 1)); fi  # no start step
# Frontend-only skips all DB steps
if [ "$TARGET" = "frontend" ]; then
  SKIP_DB=true
  # Recalculate — frontend has: prerequisites, env, deps, shared-build, logs, start
  TOTAL_STEPS=6
  if [ "$SKIP_DEPS" = true ]; then TOTAL_STEPS=$((TOTAL_STEPS - 1)); fi
  if [ "$SETUP_ONLY" = true ]; then TOTAL_STEPS=$((TOTAL_STEPS - 1)); fi
  if [ "$MODE" = "production" ] && [ "$SETUP_ONLY" = false ]; then TOTAL_STEPS=$((TOTAL_STEPS + 1)); fi
fi

CURRENT_STEP=0
next_step() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
}

# ══════════════════════════════════════════════════════════════════════════════
# START
# ══════════════════════════════════════════════════════════════════════════════
print_banner
echo -e "  Mode:   ${BOLD}${MAGENTA}${MODE}${NC}"
echo -e "  Target: ${BOLD}${CYAN}${TARGET}${NC}"
if [ "$SEED_DEMO" = true ]; then echo -e "  Seed:   ${YELLOW}demo data (dev only)${NC}"; fi
if [ "$SKIP_DEPS" = true ]; then echo -e "  Deps:   ${YELLOW}skipped${NC}"; fi
if [ "$SKIP_DB" = true ]; then echo -e "  DB:     ${YELLOW}skipped${NC}"; fi
if [ "$SETUP_ONLY" = true ]; then echo -e "  Setup:  ${CYAN}setup only (no start)${NC}"; fi

# ── Block --seed-demo in production ───────────────────────────────────────────
if [ "$SEED_DEMO" = true ] && [ "$MODE" = "production" ]; then
  print_fail "--seed-demo is blocked in production mode."
  print_info "Demo data (fake voters, dummy elections) has no place in production."
  print_info "Core seed (super admin, plans, feature flags) runs automatically."
  exit 1
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Prerequisites
# ══════════════════════════════════════════════════════════════════════════════
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

# PM2 check for production
if [ "$MODE" = "production" ] && [ "$TARGET" != "frontend" ]; then
  if command -v pm2 &> /dev/null; then
    print_ok "PM2 $(pm2 -v)"
  else
    print_warn "PM2 not installed. Install with: npm install -g pm2"
    print_info "Will fall back to turbo start"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Environment Configuration
# ══════════════════════════════════════════════════════════════════════════════
next_step
print_step "$CURRENT_STEP" "Environment Configuration"

if [ ! -f ".env" ]; then
  if [ "$MODE" = "production" ] && [ -f ".env.production.example" ]; then
    cp .env.production.example .env
    print_warn "Created .env from .env.production.example"
    print_fail "UPDATE .env WITH YOUR PRODUCTION SETTINGS BEFORE CONTINUING!"
    echo ""
    echo -e "  ${YELLOW}Required changes:${NC}"
    echo -e "    - Database connection URLs"
    echo -e "    - JWT_SECRET and JWT_REFRESH_SECRET (openssl rand -hex 32)"
    echo -e "    - CORS_ORIGIN for your domain"
    echo ""
    read -p "  Press Enter after updating .env, or Ctrl+C to abort..." </dev/tty
  elif [ -f ".env.example" ]; then
    cp .env.example .env
    print_ok "Created .env from .env.example (development defaults)"
  else
    print_fail "No .env or .env.example found!"
    exit 1
  fi
else
  print_ok ".env file found"
fi

# Load .env
source_env() {
  if [ -f ".env" ]; then
    set -a
    # shellcheck disable=SC1091
    source .env 2>/dev/null || true
    set +a
  fi
}
source_env

# ── Validate Critical Environment Variables ──────────────────────────────────
ENV_ERRORS=0

validate_env_var() {
  local var_name="$1"
  local var_value="${!var_name}"
  local required="$2"  # "required" or "recommended"
  local description="$3"

  if [ -z "$var_value" ]; then
    if [ "$required" = "required" ]; then
      print_fail "$var_name is not set ($description)"
      ENV_ERRORS=$((ENV_ERRORS + 1))
    else
      print_warn "$var_name is not set ($description)"
    fi
  else
    print_ok "$var_name is set"
  fi
}

if [ "$TARGET" != "frontend" ]; then
  echo ""
  print_info "Validating environment variables..."

  validate_env_var "CORE_DATABASE_URL" "required" "Core database for super admin & tenants"
  validate_env_var "TENANT_DATABASE_URL" "required" "Default tenant database"
  validate_env_var "JWT_SECRET" "required" "JWT signing secret (min 32 chars)"
  validate_env_var "JWT_REFRESH_SECRET" "required" "JWT refresh token secret (min 32 chars)"
  validate_env_var "CREDIT_SIGNATURE_SECRET" "required" "HMAC key for AI credit tamper detection"
  validate_env_var "INTERNAL_API_KEY" "recommended" "Service-to-service API key"
  validate_env_var "GATEWAY_PORT" "required" "API Gateway port"

  # Validate JWT secret length
  if [ -n "$JWT_SECRET" ] && [ ${#JWT_SECRET} -lt 32 ]; then
    print_warn "JWT_SECRET should be at least 32 characters"
  fi
  if [ -n "$JWT_REFRESH_SECRET" ] && [ ${#JWT_REFRESH_SECRET} -lt 32 ]; then
    print_warn "JWT_REFRESH_SECRET should be at least 32 characters"
  fi

  # Warn about default secrets in production
  if [ "$MODE" = "production" ]; then
    if [[ "$JWT_SECRET" == *"change-in-production"* ]]; then
      print_fail "JWT_SECRET still has default value! Change it for production."
      ENV_ERRORS=$((ENV_ERRORS + 1))
    fi
    if [[ "$JWT_REFRESH_SECRET" == *"change-in-production"* ]]; then
      print_fail "JWT_REFRESH_SECRET still has default value! Change it for production."
      ENV_ERRORS=$((ENV_ERRORS + 1))
    fi
    if [[ "$CREDIT_SIGNATURE_SECRET" == *"change-in-production"* ]]; then
      print_fail "CREDIT_SIGNATURE_SECRET still has default value! Change it for production."
      ENV_ERRORS=$((ENV_ERRORS + 1))
    fi
  fi

  if [ "$ENV_ERRORS" -gt 0 ]; then
    echo ""
    print_fail "$ENV_ERRORS critical environment variable(s) missing or invalid."
    print_info "Edit .env and re-run this script."
    exit 1
  fi
fi

print_ok "Environment validated"

# ══════════════════════════════════════════════════════════════════════════════
# STEP: PostgreSQL Connection Verification
# ══════════════════════════════════════════════════════════════════════════════
if [ "$SKIP_DB" = false ] && [ "$TARGET" != "frontend" ]; then
  next_step
  print_step "$CURRENT_STEP" "Verifying PostgreSQL Connection"

  # Extract host, port, user, password from CORE_DATABASE_URL
  # Format: postgresql://user:password@host:port/dbname?schema=public
  PG_CONN_URL="${CORE_DATABASE_URL}"

  # Parse connection URL components
  PG_USER=$(echo "$PG_CONN_URL" | sed -n 's|postgresql://\([^:]*\):.*|\1|p')
  PG_PASS=$(echo "$PG_CONN_URL" | sed -n 's|postgresql://[^:]*:\([^@]*\)@.*|\1|p')
  PG_HOST=$(echo "$PG_CONN_URL" | sed -n 's|postgresql://[^@]*@\([^:]*\):.*|\1|p')
  PG_PORT=$(echo "$PG_CONN_URL" | sed -n 's|postgresql://[^@]*@[^:]*:\([0-9]*\)/.*|\1|p')

  # Default fallbacks
  PG_HOST="${PG_HOST:-localhost}"
  PG_PORT="${PG_PORT:-5432}"
  PG_USER="${PG_USER:-postgres}"

  print_info "PostgreSQL server: ${PG_HOST}:${PG_PORT} (user: ${PG_USER})"

  # Test 1: Can we reach the PostgreSQL port?
  if node -e "const s=require('net').createConnection({port:${PG_PORT},host:'${PG_HOST}'});s.on('connect',()=>{s.destroy();process.exit(0)});s.on('error',()=>process.exit(1))" 2>/dev/null; then
    print_ok "PostgreSQL is reachable on ${PG_HOST}:${PG_PORT}"
  else
    print_fail "Cannot connect to PostgreSQL on ${PG_HOST}:${PG_PORT}"
    echo ""
    echo -e "  ${YELLOW}Possible fixes:${NC}"
    echo -e "    1. Start PostgreSQL:  ${DIM}pg_ctl -D /path/to/data start${NC}"
    echo -e "    2. Windows:           ${DIM}net start postgresql-x64-16${NC}"
    echo -e "    3. Docker:            ${DIM}docker run -p ${PG_PORT}:5432 -e POSTGRES_PASSWORD=${PG_PASS} postgres:16${NC}"
    echo -e "    4. Check .env:        ${DIM}Verify CORE_DATABASE_URL has correct host:port${NC}"
    echo ""
    exit 1
  fi

  # Test 2: Can we authenticate and query PostgreSQL?
  PG_AUTH_CHECK=$(node -e "
    const { Client } = require('pg') || {};
    try {
      const c = new (require('pg').Client)({
        host: '${PG_HOST}',
        port: ${PG_PORT},
        user: '${PG_USER}',
        password: '${PG_PASS}',
        database: 'postgres',
        connectionTimeoutMillis: 5000,
      });
      c.connect()
        .then(() => c.query('SELECT 1'))
        .then(() => { console.log('OK'); c.end(); })
        .catch(e => { console.log('FAIL:' + e.message); process.exit(1); });
    } catch(e) {
      console.log('NOPG');
      process.exit(2);
    }
  " 2>/dev/null || echo "NOPG")

  if [ "$PG_AUTH_CHECK" = "OK" ]; then
    print_ok "PostgreSQL authentication successful"
  elif [ "$PG_AUTH_CHECK" = "NOPG" ]; then
    # pg module not available yet (deps not installed), fall back to port-only check
    print_warn "pg module not yet installed — will verify connection after npm install"
  else
    print_fail "PostgreSQL authentication failed: $PG_AUTH_CHECK"
    echo ""
    echo -e "  ${YELLOW}Check your .env credentials:${NC}"
    echo -e "    CORE_DATABASE_URL=${CORE_DATABASE_URL}"
    echo ""
    exit 1
  fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Database Creation
# ══════════════════════════════════════════════════════════════════════════════
  next_step
  print_step "$CURRENT_STEP" "Creating Databases (if they don't exist)"

  # Extract database names from connection URLs
  CORE_DB_NAME=$(echo "$CORE_DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  TENANT_DB_NAME=$(echo "$TENANT_DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  LEGACY_DB_NAME=""
  if [ -n "$DATABASE_URL" ]; then
    LEGACY_DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  fi

  print_info "Core DB:   ${CORE_DB_NAME}"
  print_info "Tenant DB: ${TENANT_DB_NAME}"
  if [ -n "$LEGACY_DB_NAME" ] && [ "$LEGACY_DB_NAME" != "$CORE_DB_NAME" ]; then
    print_info "Legacy DB: ${LEGACY_DB_NAME}"
  fi

  # Create databases using Node.js (works cross-platform, no psql needed)
  DB_CREATE_RESULT=$(node -e "
    let pg;
    try { pg = require('pg'); } catch(e) { console.log('NOPG'); process.exit(0); }
    const { Client } = pg;

    async function createDbIfNotExists(dbName) {
      const client = new Client({
        host: '${PG_HOST}',
        port: ${PG_PORT},
        user: '${PG_USER}',
        password: '${PG_PASS}',
        database: 'postgres',
        connectionTimeoutMillis: 5000,
      });
      try {
        await client.connect();
        const res = await client.query(
          \"SELECT 1 FROM pg_database WHERE datname = \$1\", [dbName]
        );
        if (res.rowCount === 0) {
          await client.query('CREATE DATABASE \"' + dbName + '\"');
          console.log('CREATED:' + dbName);
        } else {
          console.log('EXISTS:' + dbName);
        }
      } catch(e) {
        if (e.message.includes('already exists')) {
          console.log('EXISTS:' + dbName);
        } else {
          console.log('ERROR:' + dbName + ':' + e.message);
        }
      } finally {
        await client.end().catch(() => {});
      }
    }

    (async () => {
      const dbs = ['${CORE_DB_NAME}', '${TENANT_DB_NAME}'];
      const legacy = '${LEGACY_DB_NAME}';
      if (legacy && legacy !== '${CORE_DB_NAME}' && legacy !== '${TENANT_DB_NAME}') {
        dbs.push(legacy);
      }
      for (const db of dbs) {
        if (db) await createDbIfNotExists(db);
      }
    })();
  " 2>/dev/null || echo "NOPG")

  if [ "$DB_CREATE_RESULT" = "NOPG" ]; then
    print_warn "pg module not installed yet — databases will be created after npm install"
    DB_NEEDS_RETRY=true
  else
    DB_NEEDS_RETRY=false
    while IFS= read -r line; do
      case "$line" in
        CREATED:*)
          db_name="${line#CREATED:}"
          print_ok "Created database: $db_name"
          ;;
        EXISTS:*)
          db_name="${line#EXISTS:}"
          print_ok "Database exists: $db_name"
          ;;
        ERROR:*)
          detail="${line#ERROR:}"
          print_warn "Database issue: $detail"
          ;;
      esac
    done <<< "$DB_CREATE_RESULT"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Dependencies
# ══════════════════════════════════════════════════════════════════════════════
if [ "$SKIP_DEPS" = false ]; then
  next_step
  print_step "$CURRENT_STEP" "Installing Dependencies"
  INSTALL_OUT=$(npm install 2>&1) || { echo "$INSTALL_OUT"; print_fail "npm install failed"; exit 1; }
  echo "$INSTALL_OUT" | tail -5
  print_ok "All dependencies installed"
fi

# ── Retry database creation if pg wasn't available before npm install ────────
if [ "${DB_NEEDS_RETRY:-false}" = true ] && [ "$SKIP_DB" = false ] && [ "$TARGET" != "frontend" ]; then
  echo ""
  print_info "Retrying database creation with pg module now available..."

  # Re-verify PostgreSQL authentication
  PG_AUTH_RETRY=$(node -e "
    const { Client } = require('pg');
    const c = new Client({
      host: '${PG_HOST}',
      port: ${PG_PORT},
      user: '${PG_USER}',
      password: '${PG_PASS}',
      database: 'postgres',
      connectionTimeoutMillis: 5000,
    });
    c.connect()
      .then(() => c.query('SELECT 1'))
      .then(() => { console.log('OK'); c.end(); })
      .catch(e => { console.log('FAIL:' + e.message); process.exit(1); });
  " 2>/dev/null || echo "FAIL")

  if [ "$PG_AUTH_RETRY" != "OK" ]; then
    print_fail "PostgreSQL authentication failed after install: $PG_AUTH_RETRY"
    echo -e "  ${YELLOW}Check CORE_DATABASE_URL in .env${NC}"
    exit 1
  fi
  print_ok "PostgreSQL authentication successful"

  # Create databases
  node -e "
    const { Client } = require('pg');
    async function createDbIfNotExists(dbName) {
      const client = new Client({
        host: '${PG_HOST}',
        port: ${PG_PORT},
        user: '${PG_USER}',
        password: '${PG_PASS}',
        database: 'postgres',
        connectionTimeoutMillis: 5000,
      });
      try {
        await client.connect();
        const res = await client.query(
          \"SELECT 1 FROM pg_database WHERE datname = \$1\", [dbName]
        );
        if (res.rowCount === 0) {
          await client.query('CREATE DATABASE \"' + dbName + '\"');
          console.log('  ✓ Created database: ' + dbName);
        } else {
          console.log('  ✓ Database exists: ' + dbName);
        }
      } catch(e) {
        if (e.message.includes('already exists')) {
          console.log('  ✓ Database exists: ' + dbName);
        } else {
          console.log('  ! Database issue (' + dbName + '): ' + e.message);
        }
      } finally {
        await client.end().catch(() => {});
      }
    }
    (async () => {
      const dbs = ['${CORE_DB_NAME}', '${TENANT_DB_NAME}'];
      const legacy = '${LEGACY_DB_NAME}';
      if (legacy && legacy !== '${CORE_DB_NAME}' && legacy !== '${TENANT_DB_NAME}') {
        dbs.push(legacy);
      }
      for (const db of dbs) {
        if (db) await createDbIfNotExists(db);
      }
    })();
  " 2>/dev/null
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Prisma Clients (skip for frontend-only)
# ══════════════════════════════════════════════════════════════════════════════
if [ "$TARGET" != "frontend" ]; then
  next_step
  print_step "$CURRENT_STEP" "Generating Prisma Clients"

  # Stop stale services that may lock Prisma DLL files (Windows EPERM issue)
  if [ -f "stop.sh" ]; then
    bash stop.sh 2>/dev/null || true
  fi
  # Also stop PM2 if running
  if command -v pm2 &> /dev/null; then
    pm2 kill 2>/dev/null || true
  fi

  GEN_OUT=$(npm run db:generate 2>&1) || {
    # Retry once after a brief wait (file lock may take a moment to release)
    print_warn "Prisma generate failed, retrying in 3s..."
    sleep 3
    GEN_OUT=$(npm run db:generate 2>&1) || { echo "$GEN_OUT"; print_fail "Prisma generate failed. A running process may be locking .prisma files."; print_info "Stop all node processes and retry: taskkill /F /IM node.exe (Windows) or killall node (Linux/Mac)"; exit 1; }
  }
  echo "$GEN_OUT" | tail -3
  print_ok "Prisma clients generated (core + tenant)"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Build Shared Packages
# ══════════════════════════════════════════════════════════════════════════════
next_step
print_step "$CURRENT_STEP" "Building Shared Packages"
BUILD_OUT=$(npx turbo run build --filter=@electioncaffe/shared --filter=@electioncaffe/database 2>&1) || { echo "$BUILD_OUT"; print_fail "Shared packages build failed"; exit 1; }
echo "$BUILD_OUT" | tail -5
print_ok "@electioncaffe/shared built"
print_ok "@electioncaffe/database built"

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Database Schema Push
# ══════════════════════════════════════════════════════════════════════════════
if [ "$SKIP_DB" = false ] && [ "$TARGET" != "frontend" ]; then
  next_step
  print_step "$CURRENT_STEP" "Pushing Database Schemas"

  # Push core + tenant schemas
  print_info "Pushing schemas to databases..."
  PUSH_OUT=$(npm run db:push 2>&1) || { echo "$PUSH_OUT"; print_fail "Schema push failed"; exit 1; }
  echo "$PUSH_OUT" | tail -3
  print_ok "Core + Tenant schemas applied"

  # Sync schema to all existing tenant databases
  print_info "Syncing schema to all existing tenant databases..."
  TENANT_URLS=$(node --input-type=module -e "
import dotenv from 'dotenv';
dotenv.config();
try {
  const { coreDb } = await import('./packages/database/dist/clients/core-client.js');
  const tenants = await coreDb.tenant.findMany({
    where: { databaseStatus: 'READY', databaseConnectionUrl: { not: null } },
    select: { slug: true, databaseConnectionUrl: true }
  });
  for (const t of tenants) {
    console.log(t.slug + '\t' + t.databaseConnectionUrl);
  }
  await coreDb.\$disconnect();
  process.exit(0);
} catch(e) {
  process.exit(0);
}
" 2>/dev/null || true)

  if [ -n "$TENANT_URLS" ]; then
    while IFS=$'\t' read -r slug url; do
      if [ -n "$slug" ] && [ -n "$url" ]; then
        print_info "Syncing schema → $slug"
        TENANT_DATABASE_URL="$url" npx prisma db push \
          --schema=packages/database/prisma/tenant/schema.prisma \
          --accept-data-loss --skip-generate 2>&1 | grep -E "in sync|Your database|Error" || true
      fi
    done <<< "$TENANT_URLS"
    print_ok "All tenant databases synced"
  else
    print_info "No existing tenant databases found (fresh setup)"
  fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Core Database Seed (Super Admin, Plans, Feature Flags)
# ══════════════════════════════════════════════════════════════════════════════
  next_step
  print_step "$CURRENT_STEP" "Seeding Core Database (Super Admin + Platform Config)"

  print_info "Checking if core data needs seeding..."
  SEED_OUTPUT=$(npm run db:seed:core 2>&1)
  echo "$SEED_OUTPUT" | tail -5

  if echo "$SEED_OUTPUT" | grep -q "already seeded"; then
    print_ok "Core database already seeded — skipped"
  else
    print_ok "Core database seeded"
    echo ""
    echo -e "  ${GREEN}${BOLD}Super Admin Credentials:${NC}"
    echo -e "  ┌────────────────────────────────────────────────┐"
    echo -e "  │  Email:    ${CYAN}superadmin@electioncaffe.com${NC}       │"
    echo -e "  │  Password: ${CYAN}SuperAdmin@123${NC}                    │"
    echo -e "  └────────────────────────────────────────────────┘"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Demo Data Seed (dev only, opt-in via --seed-demo)
# ══════════════════════════════════════════════════════════════════════════════
if [ "$SEED_DEMO" = true ] && [ "$SKIP_DB" = false ] && [ "$TARGET" != "frontend" ]; then
  next_step
  print_step "$CURRENT_STEP" "Seeding Demo Data (DEV ONLY — fake voters, elections, cadres)"
  print_warn "This is hardcoded fake data for local development only."
  npm run db:seed 2>&1 | tail -10
  print_ok "Demo data seeded (development use only)"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Log Directories
# ══════════════════════════════════════════════════════════════════════════════
next_step
print_step "$CURRENT_STEP" "Setting Up Log Directories"

LOG_SERVICES="gateway auth-service election-service voter-service cadre-service analytics-service reporting-service ai-analytics-service super-admin-service web super-admin"
for svc in $LOG_SERVICES; do
  mkdir -p "logs/$svc"
done
print_ok "Log directories ready at ./logs/"

# ══════════════════════════════════════════════════════════════════════════════
# STEP: Start Services (skip if --setup-only)
# ══════════════════════════════════════════════════════════════════════════════
if [ "$SETUP_ONLY" = true ]; then
  echo ""
  echo -e "  ${GREEN}${BOLD}Setup complete!${NC} (--setup-only mode, services not started)"
  echo ""
  echo -e "  To start services:"
  echo -e "    ${DIM}./start.sh --skip-deps --skip-db${NC}          # Quick start"
  echo -e "    ${DIM}./start.sh --skip-deps --skip-db --backend${NC} # Backend only"
  echo ""
  echo -e "${GREEN}${BOLD}Done!${NC}"
  exit 0
fi

next_step
print_step "$CURRENT_STEP" "Starting Services"

# ── LOCAL (Development) Mode ─────────────────────────────────────────────────
if [ "$MODE" = "local" ]; then

  if [ "$TARGET" = "all" ]; then
    echo ""
    echo -e "  ${CYAN}${BOLD}Starting: Backend + Frontend${NC}"
    echo -e "  ┌─────────────────────────────────────────────────┐"
    echo -e "  │  ${BLUE}Gateway API${NC}        http://localhost:${GATEWAY_PORT:-3000}       │"
    echo -e "  │  ${BLUE}Auth Service${NC}       http://localhost:${AUTH_PORT:-3001}       │"
    echo -e "  │  ${BLUE}Election Service${NC}   http://localhost:${ELECTION_PORT:-3002}       │"
    echo -e "  │  ${BLUE}Voter Service${NC}      http://localhost:${VOTER_PORT:-3003}       │"
    echo -e "  │  ${BLUE}Cadre Service${NC}      http://localhost:${CADRE_PORT:-3004}       │"
    echo -e "  │  ${BLUE}Analytics Service${NC}  http://localhost:${ANALYTICS_PORT:-3005}       │"
    echo -e "  │  ${BLUE}Reporting Service${NC}  http://localhost:${REPORTING_PORT:-3006}       │"
    echo -e "  │  ${BLUE}AI Analytics${NC}       http://localhost:${AI_ANALYTICS_PORT:-3007}       │"
    echo -e "  │  ${BLUE}Super Admin API${NC}    http://localhost:${SUPER_ADMIN_PORT:-3008}       │"
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
    echo -e "  │  ${BLUE}Gateway API${NC}        http://localhost:${GATEWAY_PORT:-3000}       │"
    echo -e "  │  ${BLUE}Auth Service${NC}       http://localhost:${AUTH_PORT:-3001}       │"
    echo -e "  │  ${BLUE}Election Service${NC}   http://localhost:${ELECTION_PORT:-3002}       │"
    echo -e "  │  ${BLUE}Voter Service${NC}      http://localhost:${VOTER_PORT:-3003}       │"
    echo -e "  │  ${BLUE}Cadre Service${NC}      http://localhost:${CADRE_PORT:-3004}       │"
    echo -e "  │  ${BLUE}Analytics Service${NC}  http://localhost:${ANALYTICS_PORT:-3005}       │"
    echo -e "  │  ${BLUE}Reporting Service${NC}  http://localhost:${REPORTING_PORT:-3006}       │"
    echo -e "  │  ${BLUE}AI Analytics${NC}       http://localhost:${AI_ANALYTICS_PORT:-3007}       │"
    echo -e "  │  ${BLUE}Super Admin API${NC}    http://localhost:${SUPER_ADMIN_PORT:-3008}       │"
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
    npm run build 2>&1 | tail -10
    print_ok "All services and apps built"

  elif [ "$TARGET" = "backend" ]; then
    npx turbo run build --filter='./services/*' 2>&1 | tail -10
    print_ok "All backend services built"

  elif [ "$TARGET" = "frontend" ]; then
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

      PORTS="${GATEWAY_PORT:-3000} ${AUTH_PORT:-3001} ${ELECTION_PORT:-3002} ${VOTER_PORT:-3003} ${CADRE_PORT:-3004} ${ANALYTICS_PORT:-3005} ${REPORTING_PORT:-3006} ${AI_ANALYTICS_PORT:-3007} ${SUPER_ADMIN_PORT:-3008}"
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
fi

# ── Final Summary ────────────────────────────────────────────────────────────
echo ""
echo -e "  ${CYAN}${BOLD}Log Files:${NC}"
echo -e "  ${DIM}logs/<service>/combined.log${NC}  - All logs (daily rotation)"
echo -e "  ${DIM}logs/<service>/error.log${NC}     - Errors only"
echo ""
echo -e "${GREEN}${BOLD}Done!${NC}"
