#!/bin/bash
# =============================================================================
# ElectionCaffe - Azure VM Initial Setup Script
# Run this ONCE on a fresh Azure Ubuntu VM (22.04 LTS recommended)
#
# Usage:
#   ssh azureuser@<VM-IP>
#   sudo bash setup-azure-vm.sh
#
# Prerequisites:
#   - Ubuntu 20.04+ (22.04 LTS recommended)
#   - 4GB RAM minimum (8GB recommended for 9 microservices)
#   - 2 vCPUs minimum (4 recommended)
#   - 30GB disk minimum
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

# Configuration
APP_DIR="/var/www/electioncaffe"
APP_USER="electioncaffe"
NODE_VERSION="20"

echo ""
echo "=============================================="
echo "  ElectionCaffe - Azure VM Setup Script"
echo "=============================================="
echo ""

# ── Update System ────────────────────────────────────────────────────────────
log_info "Updating system packages..."
apt update && apt upgrade -y

# ── Install Essential Tools ──────────────────────────────────────────────────
log_info "Installing essential tools..."
apt install -y curl wget git build-essential software-properties-common

# ── Create Application User ─────────────────────────────────────────────────
log_info "Creating application user: $APP_USER..."
if id "$APP_USER" &>/dev/null; then
    log_warning "User $APP_USER already exists"
else
    useradd -m -s /bin/bash "$APP_USER"
    log_success "User $APP_USER created"
fi

# ── Install Node.js 20 via NVM ──────────────────────────────────────────────
log_info "Installing Node.js v${NODE_VERSION}..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install $NODE_VERSION
nvm use $NODE_VERSION
nvm alias default $NODE_VERSION

log_success "Node.js $(node -v) installed"

# Also install for the app user
su - $APP_USER -c "
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR=\"\$HOME/.nvm\"
    [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
    nvm alias default $NODE_VERSION
"
log_success "Node.js installed for $APP_USER user"

# ── Install PM2 Globally ────────────────────────────────────────────────────
log_info "Installing PM2..."
npm install -g pm2

# Setup PM2 startup script
log_info "Configuring PM2 startup..."
pm2 startup systemd -u $APP_USER --hp /home/$APP_USER
env PATH=$PATH:/home/$APP_USER/.nvm/versions/node/v${NODE_VERSION}.*/bin pm2 startup systemd -u $APP_USER --hp /home/$APP_USER

log_success "PM2 installed and configured"

# ── Install Nginx ────────────────────────────────────────────────────────────
log_info "Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

log_success "Nginx installed"

# ── Install Certbot for SSL ──────────────────────────────────────────────────
log_info "Installing Certbot for SSL certificates..."
apt install -y certbot python3-certbot-nginx

log_success "Certbot installed"

# ── Create Application Directory ────────────────────────────────────────────
log_info "Creating application directory..."
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
chown -R $APP_USER:$APP_USER $APP_DIR

# Create log subdirectories for all 9 services
for svc in gateway auth-service election-service voter-service cadre-service analytics-service reporting-service ai-analytics-service super-admin-service; do
    mkdir -p "$APP_DIR/logs/$svc"
done
chown -R $APP_USER:$APP_USER $APP_DIR/logs

log_success "Application directory created: $APP_DIR"

# ── Create certbot webroot ──────────────────────────────────────────────────
mkdir -p /var/www/certbot

# ── Configure Firewall ──────────────────────────────────────────────────────
log_info "Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
# Also allow port 8080 for super-admin access
ufw allow 8080/tcp
ufw --force enable

log_success "Firewall configured (SSH + Nginx + 8080)"

# ── Create Swap File (recommended for smaller VMs) ──────────────────────────
log_info "Creating swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    log_success "Swap file created (4GB — needed for 9 services)"
else
    log_warning "Swap file already exists"
fi

# ── System Limits for Node.js ────────────────────────────────────────────────
log_info "Configuring system limits..."
echo "* soft nofile 65535" | tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | tee -a /etc/security/limits.conf

# ── Print Completion ─────────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo "  Setup Complete!"
echo "=============================================="
echo ""
echo "Installed: Node.js $NODE_VERSION, PM2, Nginx, Certbot"
echo "App User:  $APP_USER"
echo "App Dir:   $APP_DIR"
echo "Swap:      4GB"
echo ""
echo "Next steps:"
echo ""
echo "1. Clone your repository:"
echo "   su - $APP_USER"
echo "   cd $APP_DIR"
echo "   git clone YOUR_REPO_URL ."
echo ""
echo "2. First-time setup:"
echo "   sudo bash deploy.sh --setup"
echo ""
echo "3. Edit .env with production values:"
echo "   nano $APP_DIR/.env"
echo ""
echo "4. Validate configuration:"
echo "   sudo bash deploy.sh --validate"
echo ""
echo "5. Setup Nginx configs:"
echo "   sudo bash deploy.sh --nginx"
echo ""
echo "6. Get SSL certificates:"
echo "   # Wildcard cert for tenant subdomains (requires DNS challenge):"
echo "   sudo certbot certonly --manual --preferred-challenges dns \\"
echo "     -d election.datacaffe.ai -d '*.election.datacaffe.ai'"
echo ""
echo "   # Separate cert for admin subdomain:"
echo "   sudo certbot --nginx -d admin.election.datacaffe.ai"
echo ""
echo "   # For dev server (.datacaffe.in):"
echo "   sudo certbot certonly --manual --preferred-challenges dns \\"
echo "     -d election.datacaffe.in -d '*.election.datacaffe.in' \\"
echo "     -d admin.election.datacaffe.in"
echo ""
echo "7. Deploy:"
echo "   sudo bash deploy.sh"
echo ""
echo "=============================================="

log_success "Azure VM setup completed!"
