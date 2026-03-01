#!/bin/bash
# =============================================================================
# ElectionCaffe - Production Deployment Script
# =============================================================================
# IMPORTANT: Pull code manually first!
#   cd /var/www/electioncaffe && git pull origin main
#
# Usage:
#   sudo bash deploy.sh                  # Full deploy (build + restart)
#   sudo bash deploy.sh --restart-only   # Just restart services (no build)
#   sudo bash deploy.sh --build-only     # Build without restart
#   sudo bash deploy.sh --setup          # First-time setup (creates .env, nginx, deps)
#   sudo bash deploy.sh --nginx          # Setup/reload Nginx only
#   sudo bash deploy.sh --validate       # Check config (secrets match, ports, etc.)
#   sudo bash deploy.sh --status         # Show status of all services
#   sudo bash deploy.sh --logs <service> # Show logs for a service
#   sudo bash deploy.sh --health         # Run health checks
# =============================================================================

set -e

# ── Configuration ────────────────────────────────────────────────────────────
APP_DIR="/var/www/electioncaffe"
BRANCH="main"
APP_USER="electioncaffe"
APP_GROUP="electioncaffe"

# Service ports (9 microservices)
GATEWAY_PORT=3000
AUTH_PORT=3001
ELECTION_PORT=3002
VOTER_PORT=3003
CADRE_PORT=3004
ANALYTICS_PORT=3005
REPORTING_PORT=3006
AI_ANALYTICS_PORT=3007
SUPER_ADMIN_PORT=3008

# Frontend ports (served by Nginx from dist/, these are for health checks only)
WEB_PORT=80
SUPER_ADMIN_UI_PORT=8080

# All backend service names in PM2
EC_SERVICES="gateway auth-service election-service voter-service cadre-service analytics-service reporting-service ai-analytics-service super-admin-service"

# All service ports
ALL_BACKEND_PORTS="$GATEWAY_PORT $AUTH_PORT $ELECTION_PORT $VOTER_PORT $CADRE_PORT $ANALYTICS_PORT $REPORTING_PORT $AI_ANALYTICS_PORT $SUPER_ADMIN_PORT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── Helper: Kill port ────────────────────────────────────────────────────────
kill_port() {
    local port=$1
    if fuser ${port}/tcp > /dev/null 2>&1; then
        log_warn "Killing process on port $port"
        fuser -k ${port}/tcp > /dev/null 2>&1 || true
        sleep 1
    fi
}

# ── Helper: Check .env exists ────────────────────────────────────────────────
check_env() {
    local path=$1
    local name=$2
    if [ ! -f "$path" ]; then
        log_error "$name .env missing at $path"
        return 1
    fi
    log_ok "$name .env exists"
}

# =============================================================================
# COMMAND: --status
# =============================================================================
cmd_status() {
    echo ""
    echo -e "${CYAN}${BOLD}=== ElectionCaffe Status ===${NC}"

    echo ""
    log_info "PM2 Status"
    pm2 status

    echo ""
    log_info "Backend Ports (9 services)"
    local port_names=("Gateway:$GATEWAY_PORT" "Auth:$AUTH_PORT" "Election:$ELECTION_PORT" "Voter:$VOTER_PORT" "Cadre:$CADRE_PORT" "Analytics:$ANALYTICS_PORT" "Reporting:$REPORTING_PORT" "AI-Analytics:$AI_ANALYTICS_PORT" "Super-Admin-API:$SUPER_ADMIN_PORT")
    for entry in "${port_names[@]}"; do
        local name="${entry%%:*}"
        local port="${entry##*:}"
        if lsof -i :${port} > /dev/null 2>&1; then
            log_ok "$name (port $port) LISTENING"
        else
            log_error "$name (port $port) NOT listening"
        fi
    done

    echo ""
    log_info "Nginx Status"
    if systemctl is-active --quiet nginx; then
        log_ok "Nginx is running"
    else
        log_error "Nginx is NOT running"
    fi

    echo ""
    log_info "Environment Files"
    check_env "$APP_DIR/.env" "Root" || true
}

# =============================================================================
# COMMAND: --logs <service>
# =============================================================================
cmd_logs() {
    local service=$1
    if [ -z "$service" ]; then
        echo ""
        echo "Available services:"
        echo "  $EC_SERVICES"
        echo ""
        echo "Usage: sudo bash deploy.sh --logs <service-name>"
        echo "  e.g. sudo bash deploy.sh --logs gateway"
        echo "  e.g. sudo bash deploy.sh --logs auth-service"
        exit 1
    fi
    pm2 logs "$service" --lines 100
}

# =============================================================================
# COMMAND: --health
# =============================================================================
cmd_health() {
    echo ""
    log_info "=== Health Checks ==="

    local port_names=("Gateway:$GATEWAY_PORT" "Auth:$AUTH_PORT" "Election:$ELECTION_PORT" "Voter:$VOTER_PORT" "Cadre:$CADRE_PORT" "Analytics:$ANALYTICS_PORT" "Reporting:$REPORTING_PORT" "AI-Analytics:$AI_ANALYTICS_PORT" "Super-Admin-API:$SUPER_ADMIN_PORT")
    local all_ok=1

    for entry in "${port_names[@]}"; do
        local name="${entry%%:*}"
        local port="${entry##*:}"
        local status_code
        status_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${port}/health" 2>/dev/null || echo "000")
        if [ "$status_code" = "200" ]; then
            log_ok "$name (port $port) — healthy"
        else
            log_error "$name (port $port) — HTTP $status_code"
            all_ok=0
        fi
    done

    # Frontend health (Nginx)
    echo ""
    local web_status
    web_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${WEB_PORT}/health" 2>/dev/null || echo "000")
    if [ "$web_status" = "200" ]; then
        log_ok "Web App (port $WEB_PORT) — healthy"
    else
        log_error "Web App (port $WEB_PORT) — HTTP $web_status"
        all_ok=0
    fi

    local admin_status
    admin_status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${SUPER_ADMIN_UI_PORT}/health" 2>/dev/null || echo "000")
    if [ "$admin_status" = "200" ]; then
        log_ok "Super Admin UI (port $SUPER_ADMIN_UI_PORT) — healthy"
    else
        log_error "Super Admin UI (port $SUPER_ADMIN_UI_PORT) — HTTP $admin_status"
        all_ok=0
    fi

    echo ""
    if [ $all_ok -eq 1 ]; then
        log_ok "All services are healthy!"
    else
        log_warn "Some services are unhealthy. Check logs: sudo bash deploy.sh --logs <service>"
    fi
}

# =============================================================================
# COMMAND: --setup (first-time)
# =============================================================================
cmd_setup() {
    echo ""
    echo -e "${CYAN}${BOLD}=== First-Time Setup ===${NC}"

    # Create directories
    mkdir -p "$APP_DIR/logs"
    for svc in $EC_SERVICES; do
        mkdir -p "$APP_DIR/logs/$svc"
    done
    log_ok "Log directories created"

    # Fix ownership
    log_info "Fixing file ownership..."
    chown -R ${APP_USER}:${APP_GROUP} "$APP_DIR"
    log_ok "Ownership set to ${APP_USER}:${APP_GROUP}"

    # Check / create .env
    echo ""
    log_info "Checking .env file..."
    if [ ! -f "$APP_DIR/.env" ]; then
        if [ -f "$APP_DIR/.env.production.example" ]; then
            cp "$APP_DIR/.env.production.example" "$APP_DIR/.env"
            log_warn "Created .env from .env.production.example"
            log_warn ""
            log_warn "IMPORTANT: Edit .env and replace ALL placeholder values!"
            log_warn "Critical settings:"
            log_warn "  - DATABASE_URL / CORE_DATABASE_URL  (your PostgreSQL connection)"
            log_warn "  - JWT_SECRET / JWT_REFRESH_SECRET    (64-char random strings)"
            log_warn "  - CORS_ORIGIN                       (your production domains)"
            log_warn "  - CREDIT_SIGNATURE_SECRET            (random secret for AI credits)"
        else
            log_error "No .env or .env.production.example found!"
            return 1
        fi
    else
        log_ok ".env file exists"
    fi

    # Install dependencies (Turbo monorepo — single npm install at root)
    echo ""
    log_info "Installing dependencies..."
    cd "$APP_DIR"
    npm install 2>&1 | tail -3
    log_ok "All workspace dependencies installed"

    # Generate Prisma clients
    log_info "Generating Prisma clients..."
    npm run db:generate 2>&1 | tail -3
    log_ok "Prisma clients generated (core + tenant)"

    # Setup Nginx
    cmd_nginx_setup

    echo ""
    echo -e "${GREEN}${BOLD}Setup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Edit .env with your production values"
    echo "  2. Run: sudo bash deploy.sh --validate"
    echo "  3. Run: sudo bash deploy.sh"
}

# =============================================================================
# COMMAND: --nginx
# =============================================================================
cmd_nginx_setup() {
    echo ""
    log_info "=== Nginx Setup ==="

    if ! command -v nginx &> /dev/null; then
        log_warn "Nginx not installed. Installing..."
        apt-get update -qq && apt-get install -y -qq nginx
    fi

    # Copy main nginx.conf
    local NGINX_MAIN="$APP_DIR/nginx/nginx.conf"
    if [ -f "$NGINX_MAIN" ]; then
        cp "$NGINX_MAIN" /etc/nginx/nginx.conf
        log_ok "Main nginx.conf installed"
    else
        log_warn "nginx/nginx.conf not found, using system default"
    fi

    # Copy port-based config (always available for IP access)
    local NGINX_PORTBASED="$APP_DIR/nginx/electioncaffe.conf"
    if [ -f "$NGINX_PORTBASED" ]; then
        cp "$NGINX_PORTBASED" /etc/nginx/sites-available/electioncaffe
        ln -sf /etc/nginx/sites-available/electioncaffe /etc/nginx/sites-enabled/electioncaffe
        log_ok "Port-based config (electioncaffe.conf) installed"
    fi

    # Copy domain-specific configs if they exist
    if [ -d "$APP_DIR/nginx/conf.d" ]; then
        mkdir -p /etc/nginx/conf.d
        for conf in "$APP_DIR/nginx/conf.d"/*.conf; do
            if [ -f "$conf" ]; then
                local filename=$(basename "$conf")
                cp "$conf" "/etc/nginx/conf.d/$filename"
                log_ok "Installed conf.d/$filename"
            fi
        done
    fi

    # Remove default site
    rm -f /etc/nginx/sites-enabled/default

    # Test and reload
    if nginx -t 2>&1; then
        systemctl reload nginx
        log_ok "Nginx configured and reloaded"
    else
        log_error "Nginx config test failed! Run: nginx -t"
        return 1
    fi
}

# =============================================================================
# COMMAND: --validate
# =============================================================================
cmd_validate() {
    echo ""
    echo -e "${CYAN}${BOLD}=== Validating Configuration ===${NC}"
    local errors=0

    # Check .env exists
    if [ ! -f "$APP_DIR/.env" ]; then
        log_error "MISSING: $APP_DIR/.env"
        log_error "Run: sudo bash deploy.sh --setup"
        return 1
    fi
    log_ok ".env file exists"

    # Source .env
    set -a
    source "$APP_DIR/.env" 2>/dev/null || true
    set +a

    # Check critical environment variables
    echo ""
    log_info "Checking critical variables..."

    if [ -z "$DATABASE_URL" ] && [ -z "$CORE_DATABASE_URL" ]; then
        log_error "DATABASE_URL or CORE_DATABASE_URL not set"
        errors=$((errors + 1))
    else
        log_ok "Database URL configured"
    fi

    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "change_me_to_random_64_char_string" ]; then
        log_error "JWT_SECRET not set or still has placeholder value"
        errors=$((errors + 1))
    else
        log_ok "JWT_SECRET configured (${#JWT_SECRET} chars)"
    fi

    if [ -z "$JWT_REFRESH_SECRET" ] || [ "$JWT_REFRESH_SECRET" = "change_me_to_random_64_char_string" ]; then
        log_error "JWT_REFRESH_SECRET not set or still has placeholder value"
        errors=$((errors + 1))
    else
        log_ok "JWT_REFRESH_SECRET configured"
    fi

    if [ -z "$CORS_ORIGIN" ] || echo "$CORS_ORIGIN" | grep -q "localhost"; then
        log_warn "CORS_ORIGIN may not be set for production: $CORS_ORIGIN"
    else
        log_ok "CORS_ORIGIN: $CORS_ORIGIN"
    fi

    if [ -z "$CREDIT_SIGNATURE_SECRET" ] || echo "$CREDIT_SIGNATURE_SECRET" | grep -q "change"; then
        log_warn "CREDIT_SIGNATURE_SECRET not set or still placeholder"
    else
        log_ok "CREDIT_SIGNATURE_SECRET configured"
    fi

    # Check no placeholder values remain
    echo ""
    log_info "Checking for placeholder values..."
    local placeholders
    placeholders=$(grep -c 'change_me\|CHANGE_ME\|change-this\|your-super-secret\|your-refresh-secret' "$APP_DIR/.env" 2>/dev/null || echo "0")
    if [ "$placeholders" -gt 0 ]; then
        log_error "$APP_DIR/.env has $placeholders placeholder values — update them!"
        errors=$((errors + 1))
    else
        log_ok "No placeholder values found"
    fi

    # Check Node.js version
    echo ""
    log_info "Checking runtime..."
    if command -v node &> /dev/null; then
        local NODE_VERSION=$(node -v | sed 's/v//')
        local NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -lt 18 ]; then
            log_error "Node.js >= 18 required. Found: v$NODE_VERSION"
            errors=$((errors + 1))
        else
            log_ok "Node.js v$NODE_VERSION"
        fi
    else
        log_error "Node.js not found"
        errors=$((errors + 1))
    fi

    if command -v pm2 &> /dev/null; then
        log_ok "PM2 $(pm2 -v 2>/dev/null)"
    else
        log_error "PM2 not found. Install: npm install -g pm2"
        errors=$((errors + 1))
    fi

    # Check Prisma schemas exist
    echo ""
    log_info "Checking Prisma schemas..."
    if [ -f "$APP_DIR/packages/database/prisma/core/schema.prisma" ]; then
        log_ok "Core schema exists"
    else
        log_error "Core Prisma schema missing"
        errors=$((errors + 1))
    fi
    if [ -f "$APP_DIR/packages/database/prisma/tenant/schema.prisma" ]; then
        log_ok "Tenant schema exists"
    else
        log_error "Tenant Prisma schema missing"
        errors=$((errors + 1))
    fi

    # Check built dist/ directories
    echo ""
    log_info "Checking build artifacts..."
    for svc in gateway auth-service election-service voter-service cadre-service analytics-service reporting-service ai-analytics-service super-admin-service; do
        if [ -d "$APP_DIR/services/$svc/dist" ]; then
            log_ok "services/$svc/dist exists"
        else
            log_warn "services/$svc/dist MISSING (run build first)"
        fi
    done
    for app in web super-admin; do
        if [ -d "$APP_DIR/apps/$app/dist" ]; then
            log_ok "apps/$app/dist exists"
        else
            log_warn "apps/$app/dist MISSING (run build first)"
        fi
    done

    # Summary
    echo ""
    if [ $errors -eq 0 ]; then
        log_ok "All validation checks passed!"
    else
        log_error "$errors validation errors found. Fix them before deploying."
        return 1
    fi
}

# =============================================================================
# COMMAND: pull (manual reminder)
# =============================================================================
cmd_pull() {
    cd "$APP_DIR"
    log_warn "Auto-pull disabled. Make sure you pulled manually:"
    log_warn "  cd $APP_DIR && git pull origin $BRANCH"
    echo ""
    local current_commit=$(git log --oneline -1 2>/dev/null || echo "not a git repo")
    log_info "Current commit: $current_commit"
}

# =============================================================================
# COMMAND: --build-only / build step
# =============================================================================
cmd_build() {
    echo ""
    echo -e "${CYAN}${BOLD}=== Building All Services ===${NC}"

    # Fix ownership before build
    chown -R ${APP_USER}:${APP_GROUP} "$APP_DIR"

    cd "$APP_DIR"

    # Step 1: Install dependencies (Turbo monorepo — single install)
    log_info "Installing dependencies..."
    npm install 2>&1 | tail -3
    log_ok "Dependencies installed"

    # Step 2: Generate Prisma clients
    log_info "Generating Prisma clients..."
    npm run db:generate 2>&1 | tail -3
    log_ok "Prisma clients generated"

    # Step 3: Build shared packages first
    log_info "Building shared packages..."
    npx turbo run build --filter=@electioncaffe/shared --filter=@electioncaffe/database 2>&1 | tail -3
    log_ok "Shared packages built (@electioncaffe/shared, @electioncaffe/database)"

    # Step 4: Build all backend services
    log_info "Building backend services (9 microservices)..."
    npx turbo run build --filter='./services/*' 2>&1 | tail -5
    log_ok "All backend services built"

    # Step 5: Build frontend apps
    log_info "Building frontend apps..."
    npx turbo run build --filter='./apps/*' 2>&1 | tail -5
    log_ok "Frontend apps built (web + super-admin)"

    # Verify build outputs
    echo ""
    log_info "Verifying build outputs..."
    local build_ok=1
    for svc in gateway auth-service election-service voter-service cadre-service analytics-service reporting-service ai-analytics-service super-admin-service; do
        if [ ! -d "$APP_DIR/services/$svc/dist" ]; then
            log_error "MISSING: services/$svc/dist"
            build_ok=0
        fi
    done
    for app in web super-admin; do
        if [ ! -d "$APP_DIR/apps/$app/dist" ]; then
            log_error "MISSING: apps/$app/dist"
            build_ok=0
        fi
    done

    if [ $build_ok -eq 1 ]; then
        log_ok "All build outputs verified"
    else
        log_error "Some builds failed. Check output above."
        return 1
    fi
}

# =============================================================================
# COMMAND: --restart-only / restart step
# =============================================================================
cmd_restart() {
    echo ""
    echo -e "${CYAN}${BOLD}=== Restarting Backend Services ===${NC}"

    # Step 1: Stop all ElectionCaffe services in PM2
    log_info "Stopping services..."
    pm2 stop ecosystem.config.cjs 2>/dev/null || true
    pm2 delete ecosystem.config.cjs 2>/dev/null || true
    sleep 2

    # Step 2: Kill any zombie processes on all backend ports
    log_info "Clearing ports..."
    for port in $ALL_BACKEND_PORTS; do
        kill_port $port
    done
    sleep 2

    # Step 3: Start all services via PM2
    log_info "Starting 9 backend services with PM2..."
    cd "$APP_DIR"
    pm2 start ecosystem.config.cjs
    sleep 10

    # Step 4: Verify all ports are listening
    echo ""
    log_info "Verifying ports..."
    local all_ok=1
    local port_names=("Gateway:$GATEWAY_PORT" "Auth:$AUTH_PORT" "Election:$ELECTION_PORT" "Voter:$VOTER_PORT" "Cadre:$CADRE_PORT" "Analytics:$ANALYTICS_PORT" "Reporting:$REPORTING_PORT" "AI-Analytics:$AI_ANALYTICS_PORT" "Super-Admin-API:$SUPER_ADMIN_PORT")

    for entry in "${port_names[@]}"; do
        local name="${entry%%:*}"
        local port="${entry##*:}"
        if lsof -i :${port} > /dev/null 2>&1; then
            log_ok "$name (port $port) OK"
        else
            log_error "$name (port $port) FAILED"
            all_ok=0
        fi
    done

    # Save PM2 process list
    pm2 save

    echo ""
    if [ $all_ok -eq 1 ]; then
        log_ok "All 9 backend services running!"
    else
        log_warn "Some services failed. Check: sudo bash deploy.sh --logs <service>"
    fi

    pm2 status
}

# =============================================================================
# COMMAND: (default) Full Deploy
# =============================================================================
cmd_deploy() {
    echo ""
    echo -e "${CYAN}${BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════╗"
    echo "  ║        ElectionCaffe - Production Deployment         ║"
    echo "  ╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Pre-flight: validate config
    cmd_validate || exit 1

    echo ""
    cmd_pull
    cmd_build
    cmd_restart

    # Reload Nginx to pick up any new static files
    log_info "Reloading Nginx..."
    nginx -t 2>&1 && systemctl reload nginx
    log_ok "Nginx reloaded"

    # Run health checks
    sleep 3
    cmd_health

    echo ""
    echo -e "${GREEN}${BOLD}"
    echo "  ╔═══════════════════════════════════════════════════════╗"
    echo "  ║              Deployment Complete!                    ║"
    echo "  ╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    local VM_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "VM_IP")
    echo "  Web App:      http://$VM_IP          (port 80)"
    echo "  Super Admin:  http://$VM_IP:8080     (port 8080)"
    echo "  Gateway API:  http://$VM_IP:3000     (port 3000)"
    echo ""
    echo "  PM2:  sudo pm2 status | logs | monit"
    echo "  Logs: sudo bash deploy.sh --logs <service>"
    echo ""
}

# =============================================================================
# MAIN — Parse command
# =============================================================================
case "${1:-}" in
    --status)
        cmd_status
        ;;
    --logs)
        cmd_logs "$2"
        ;;
    --health)
        cmd_health
        ;;
    --setup)
        cmd_setup
        ;;
    --nginx)
        cmd_nginx_setup
        ;;
    --validate)
        cmd_validate
        ;;
    --restart-only)
        cmd_restart
        ;;
    --build-only)
        cmd_pull
        cmd_build
        ;;
    --help|-h)
        echo ""
        echo "ElectionCaffe Deployment Script"
        echo ""
        echo "Usage: sudo bash deploy.sh [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  (default)       Full deploy: validate → build → restart → health check"
        echo "  --setup         First-time setup: create .env, install deps, Prisma, Nginx"
        echo "  --validate      Check config: env vars, secrets, Node.js, build artifacts"
        echo "  --build-only    Build all services and apps (no restart)"
        echo "  --restart-only  Restart PM2 services (no build)"
        echo "  --nginx         Setup/reload Nginx configuration"
        echo "  --health        Run health checks on all services"
        echo "  --status        Show PM2 status, port checks, env files"
        echo "  --logs <svc>    Show logs for a service (e.g. gateway, auth-service)"
        echo "  --help          Show this help message"
        echo ""
        echo "Services (9 microservices):"
        echo "  gateway (3000)  auth-service (3001)  election-service (3002)"
        echo "  voter-service (3003)  cadre-service (3004)  analytics-service (3005)"
        echo "  reporting-service (3006)  ai-analytics-service (3007)  super-admin-service (3008)"
        echo ""
        echo "Frontend (served by Nginx):"
        echo "  Web App:      apps/web/dist       → port 80"
        echo "  Super Admin:  apps/super-admin/dist → port 8080"
        echo ""
        ;;
    *)
        cmd_deploy
        ;;
esac
