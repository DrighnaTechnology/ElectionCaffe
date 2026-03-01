# =============================================================================
# ElectionCaffe - Windows PowerShell Deployment Script
# For local development/testing on Windows
#
# Usage:
#   .\scripts\deploy.ps1 full      # Full deployment (install, build, restart)
#   .\scripts\deploy.ps1 quick     # Quick deployment (build and reload only)
#   .\scripts\deploy.ps1 build     # Build all applications
#   .\scripts\deploy.ps1 install   # Install all dependencies
#   .\scripts\deploy.ps1 start     # Start PM2 processes
#   .\scripts\deploy.ps1 stop      # Stop all PM2 processes
#   .\scripts\deploy.ps1 reload    # Reload PM2 processes
#   .\scripts\deploy.ps1 validate  # Validate configuration
#   .\scripts\deploy.ps1 logs      # Show PM2 logs
#   .\scripts\deploy.ps1 status    # Show PM2 status
#   .\scripts\deploy.ps1 health    # Run health checks
#   .\scripts\deploy.ps1 help      # Show help
# =============================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet('full', 'quick', 'build', 'install', 'start', 'stop', 'reload', 'validate', 'logs', 'status', 'health', 'help')]
    [string]$Command = 'help'
)

$ErrorActionPreference = "Stop"

# Configuration
$AppDir = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $AppDir "logs"

# Service names and ports
$Services = @(
    @{ Name = "gateway";              Port = 3000 },
    @{ Name = "auth-service";         Port = 3001 },
    @{ Name = "election-service";     Port = 3002 },
    @{ Name = "voter-service";        Port = 3003 },
    @{ Name = "cadre-service";        Port = 3004 },
    @{ Name = "analytics-service";    Port = 3005 },
    @{ Name = "reporting-service";    Port = 3006 },
    @{ Name = "ai-analytics-service"; Port = 3007 },
    @{ Name = "super-admin-service";  Port = 3008 }
)

# Colors
function Write-Info    { Write-Host "[INFO] $args" -ForegroundColor Blue }
function Write-Success { Write-Host "[OK] $args" -ForegroundColor Green }
function Write-Warn    { Write-Host "[WARN] $args" -ForegroundColor Yellow }
function Write-Err     { Write-Host "[ERROR] $args" -ForegroundColor Red }

# ── Setup Directories ────────────────────────────────────────────────────────
function Setup-Directories {
    Write-Info "Setting up directories..."
    if (!(Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    foreach ($svc in $Services) {
        $svcLogDir = Join-Path $LogDir $svc.Name
        if (!(Test-Path $svcLogDir)) {
            New-Item -ItemType Directory -Path $svcLogDir -Force | Out-Null
        }
    }
    Write-Success "Log directories created"
}

# ── Install Dependencies ─────────────────────────────────────────────────────
function Install-Dependencies {
    Write-Info "Installing dependencies (Turbo monorepo)..."
    Push-Location $AppDir
    npm install
    Pop-Location
    Write-Success "All workspace dependencies installed"

    Write-Info "Generating Prisma clients..."
    Push-Location $AppDir
    npm run db:generate
    Pop-Location
    Write-Success "Prisma clients generated"
}

# ── Build Applications ───────────────────────────────────────────────────────
function Build-Applications {
    Write-Info "Building all applications..."
    Push-Location $AppDir

    # Build shared packages first
    Write-Info "Building shared packages..."
    npx turbo run build --filter=@electioncaffe/shared --filter=@electioncaffe/database
    Write-Success "Shared packages built"

    # Build backend services
    Write-Info "Building 9 backend services..."
    npx turbo run build --filter='./services/*'
    Write-Success "Backend services built"

    # Build frontend apps
    Write-Info "Building frontend apps..."
    npx turbo run build --filter='./apps/*'
    Write-Success "Frontend apps built"

    Pop-Location
    Write-Success "All applications built"
}

# ── Validate Configuration ───────────────────────────────────────────────────
function Validate-Config {
    Write-Info "Validating configuration..."
    $errors = 0

    # Check .env
    $envFile = Join-Path $AppDir ".env"
    if (!(Test-Path $envFile)) {
        Write-Err ".env file missing at $envFile"
        $errors++
    } else {
        Write-Success ".env file exists"

        # Check for placeholder values
        $content = Get-Content $envFile -Raw
        if ($content -match "change_me|CHANGE_ME|your-super-secret") {
            Write-Warn ".env contains placeholder values — update them!"
            $errors++
        } else {
            Write-Success "No placeholder values found"
        }
    }

    # Check Node.js
    try {
        $nodeVersion = node -v
        Write-Success "Node.js $nodeVersion"
    } catch {
        Write-Err "Node.js not found"
        $errors++
    }

    # Check PM2
    try {
        $pm2Version = pm2 -v 2>$null
        Write-Success "PM2 $pm2Version"
    } catch {
        Write-Warn "PM2 not found (install with: npm install -g pm2)"
    }

    # Check Prisma schemas
    $coreSchema = Join-Path $AppDir "packages\database\prisma\core\schema.prisma"
    $tenantSchema = Join-Path $AppDir "packages\database\prisma\tenant\schema.prisma"
    if (Test-Path $coreSchema) { Write-Success "Core Prisma schema exists" } else { Write-Err "Core schema missing"; $errors++ }
    if (Test-Path $tenantSchema) { Write-Success "Tenant Prisma schema exists" } else { Write-Err "Tenant schema missing"; $errors++ }

    # Check build artifacts
    Write-Info "Checking build artifacts..."
    foreach ($svc in $Services) {
        $distDir = Join-Path $AppDir "services\$($svc.Name)\dist"
        if (Test-Path $distDir) {
            Write-Success "services/$($svc.Name)/dist exists"
        } else {
            Write-Warn "services/$($svc.Name)/dist MISSING (run build first)"
        }
    }
    foreach ($app in @("web", "super-admin")) {
        $distDir = Join-Path $AppDir "apps\$app\dist"
        if (Test-Path $distDir) {
            Write-Success "apps/$app/dist exists"
        } else {
            Write-Warn "apps/$app/dist MISSING (run build first)"
        }
    }

    if ($errors -eq 0) {
        Write-Success "All validation checks passed!"
    } else {
        Write-Err "$errors validation errors found"
    }
}

# ── Health Checks ─────────────────────────────────────────────────────────────
function Run-HealthChecks {
    Write-Info "Running health checks..."
    foreach ($svc in $Services) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:$($svc.Port)/health" -TimeoutSec 5 -ErrorAction Stop
            Write-Success "$($svc.Name) (port $($svc.Port)) - healthy (HTTP $($response.StatusCode))"
        } catch {
            Write-Err "$($svc.Name) (port $($svc.Port)) - not responding"
        }
    }
}

# ── Start PM2 ────────────────────────────────────────────────────────────────
function Start-PM2 {
    Write-Info "Starting PM2 processes..."
    Push-Location $AppDir
    pm2 stop ecosystem.config.cjs 2>$null
    pm2 delete ecosystem.config.cjs 2>$null
    pm2 start ecosystem.config.cjs
    pm2 save
    Pop-Location
    Write-Success "PM2 processes started (9 services)"

    Start-Sleep -Seconds 8
    Run-HealthChecks
}

# ── Stop PM2 ─────────────────────────────────────────────────────────────────
function Stop-PM2 {
    Write-Info "Stopping PM2 processes..."
    pm2 stop ecosystem.config.cjs 2>$null
    pm2 delete ecosystem.config.cjs 2>$null
    Write-Success "PM2 processes stopped"
}

# ── Reload PM2 ───────────────────────────────────────────────────────────────
function Reload-PM2 {
    Write-Info "Reloading PM2 processes (zero-downtime)..."
    Push-Location $AppDir
    pm2 reload ecosystem.config.cjs
    pm2 save
    Pop-Location
    Write-Success "PM2 processes reloaded"
}

# ── Show Logs ─────────────────────────────────────────────────────────────────
function Show-Logs { pm2 logs --lines 50 }

# ── Show Status ───────────────────────────────────────────────────────────────
function Show-Status { pm2 status }

# ── Full Deployment ───────────────────────────────────────────────────────────
function Full-Deploy {
    Write-Host ""
    Write-Host "  ========================================" -ForegroundColor Cyan
    Write-Host "  ElectionCaffe - Full Deployment" -ForegroundColor Cyan
    Write-Host "  ========================================" -ForegroundColor Cyan
    Write-Host ""

    Validate-Config
    Setup-Directories
    Install-Dependencies
    Build-Applications
    Start-PM2
    Show-Status

    Write-Host ""
    Write-Success "Full deployment completed!"
    Write-Host ""
    Write-Host "  Web App:     http://localhost:5000  (dev) or apps/web/dist (prod)" -ForegroundColor Gray
    Write-Host "  Super Admin: http://localhost:5174  (dev) or apps/super-admin/dist (prod)" -ForegroundColor Gray
    Write-Host "  Gateway API: http://localhost:3000" -ForegroundColor Gray
    Write-Host ""
}

# ── Quick Deployment ──────────────────────────────────────────────────────────
function Quick-Deploy {
    Write-Info "Starting quick deployment (build + reload)..."
    Build-Applications
    Reload-PM2
    Show-Status
    Write-Success "Quick deployment completed!"
}

# ── Show Help ─────────────────────────────────────────────────────────────────
function Show-Help {
    Write-Host ""
    Write-Host "ElectionCaffe Deployment Script (Windows)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\scripts\deploy.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  full       Full deployment (install, build, restart)"
    Write-Host "  quick      Quick deployment (build and reload only)"
    Write-Host "  build      Build all applications (shared + services + apps)"
    Write-Host "  install    Install all dependencies + Prisma generate"
    Write-Host "  start      Start PM2 processes"
    Write-Host "  stop       Stop all PM2 processes"
    Write-Host "  reload     Reload PM2 processes (zero-downtime)"
    Write-Host "  validate   Validate configuration (.env, schemas, builds)"
    Write-Host "  health     Run health checks on all 9 services"
    Write-Host "  logs       Show PM2 logs"
    Write-Host "  status     Show PM2 status"
    Write-Host "  help       Show this help message"
    Write-Host ""
    Write-Host "Services (9 microservices):"
    Write-Host "  gateway (3000)  auth-service (3001)  election-service (3002)"
    Write-Host "  voter-service (3003)  cadre-service (3004)  analytics-service (3005)"
    Write-Host "  reporting-service (3006)  ai-analytics-service (3007)  super-admin-service (3008)"
    Write-Host ""
}

# ── Main Switch ───────────────────────────────────────────────────────────────
switch ($Command) {
    'full'     { Full-Deploy }
    'quick'    { Quick-Deploy }
    'build'    { Build-Applications }
    'install'  { Install-Dependencies }
    'start'    { Start-PM2 }
    'stop'     { Stop-PM2 }
    'reload'   { Reload-PM2 }
    'validate' { Validate-Config }
    'health'   { Run-HealthChecks }
    'logs'     { Show-Logs }
    'status'   { Show-Status }
    'help'     { Show-Help }
    default    { Show-Help }
}
