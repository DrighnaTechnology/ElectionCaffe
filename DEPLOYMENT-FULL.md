# ElectionCaffe - Full Stack Deployment Guide (9 Services)

## Architecture

```
Internet --> Nginx (SSL + Rate Limiting)
  |
  |-- election.datacaffe.ai              --> static (apps/web/dist)
  |   |-- /api/*                         --> localhost:3000 (gateway)
  |   |-- /socket.io/*                   --> localhost:3000 (gateway WebSocket)
  |
  |-- *.election.datacaffe.ai            --> static (apps/web/dist)  [tenant subdomains]
  |   |-- /api/*                         --> localhost:3000 (gateway, tenant from Host header)
  |   |-- /socket.io/*                   --> localhost:3000 (gateway WebSocket)
  |
  |-- admin.election.datacaffe.ai        --> static (apps/super-admin/dist)
  |   |-- /api/*                         --> localhost:3008 (super-admin-service)
  |
  |-- Internal only (PM2):
      |-- localhost:3000                  --> gateway
      |-- localhost:3001                  --> auth-service
      |-- localhost:3002                  --> election-service
      |-- localhost:3003                  --> voter-service
      |-- localhost:3004                  --> cadre-service
      |-- localhost:3005                  --> analytics-service
      |-- localhost:3006                  --> reporting-service
      |-- localhost:3007                  --> ai-analytics-service
      |-- localhost:3008                  --> super-admin-service
```

Database on DigitalOcean (or your PostgreSQL host). No DB install on VM.

---

## Services

| Service | Tech | Port | Manager | Exposed? |
|---------|------|------|---------|----------|
| Web Frontend | React/Vite | - | Nginx static | election.datacaffe.ai |
| Super Admin Frontend | React/Vite | - | Nginx static | admin.election.datacaffe.ai |
| Gateway | Express.js | 3000 | PM2 | Nginx proxy |
| Auth Service | Express.js | 3001 | PM2 | Internal only |
| Election Service | Express.js | 3002 | PM2 | Internal only |
| Voter Service | Express.js | 3003 | PM2 | Internal only |
| Cadre Service | Express.js | 3004 | PM2 | Internal only |
| Analytics Service | Express.js | 3005 | PM2 | Internal only |
| Reporting Service | Express.js | 3006 | PM2 | Internal only |
| AI Analytics Service | Express.js | 3007 | PM2 | Internal only |
| Super Admin Service | Express.js | 3008 | PM2 | Nginx proxy |

---

## First-Time VM Setup

### 1. SSH into VM
```bash
ssh azureuser@<VM-IP>
```

### 2. Run Setup Script
```bash
chmod +x scripts/setup-azure-vm.sh
sudo ./scripts/setup-azure-vm.sh
```
Installs: Node.js 20, PM2, Nginx, Certbot, firewall, swap (4GB).

### 3. Clone Repo
```bash
su - electioncaffe
cd /var/www/electioncaffe
git clone <REPO_URL> .
```

### 4. First-Time Setup
```bash
sudo bash deploy.sh --setup
```
Creates .env, installs deps, generates Prisma clients, configures Nginx.

### 5. Edit .env
```bash
nano /var/www/electioncaffe/.env
```
Update ALL `<CHANGE-ME>` values. See "Environment Variables" section below.

### 6. Validate Configuration
```bash
sudo bash deploy.sh --validate
```

### 7. Nginx Configs
```bash
sudo bash deploy.sh --nginx
```
Copies all configs from `nginx/` to `/etc/nginx/`.

### 8. SSL Certificates

**Production (wildcard for tenant subdomains):**
```bash
# Wildcard cert (requires DNS TXT challenge)
sudo certbot certonly --manual --preferred-challenges dns \
  -d election.datacaffe.ai -d '*.election.datacaffe.ai'

# Admin subdomain
sudo certbot --nginx -d admin.election.datacaffe.ai
```

**Dev server:**
```bash
sudo certbot certonly --manual --preferred-challenges dns \
  -d election.datacaffe.in -d '*.election.datacaffe.in' \
  -d admin.election.datacaffe.in
```

### 9. Database Setup
```bash
# Push Prisma schemas to database
npm run db:push

# Seed initial data (optional)
npm run db:seed
```

### 10. Deploy
```bash
sudo bash deploy.sh
```

---

## Subsequent Deployments

```bash
# Pull latest code first (manual)
cd /var/www/electioncaffe && git pull origin main

# Then deploy
sudo bash deploy.sh                  # Full: validate → build → restart → health
sudo bash deploy.sh --restart-only   # Just restart (no build)
sudo bash deploy.sh --build-only     # Build without restart
sudo bash deploy.sh --validate       # Check config only
sudo bash deploy.sh --health         # Run health checks
sudo bash deploy.sh --status         # PM2 + port status
sudo bash deploy.sh --logs <service> # View service logs
sudo bash deploy.sh --nginx          # Reload Nginx only
```

---

## Environment Variables

### Single .env file (root)

ElectionCaffe uses a **Turbo monorepo** — all services share one `.env` at the project root. This is different from ESG_Caffe which has per-service .env files.

**`/var/www/electioncaffe/.env`**
```
# Database
POSTGRES_USER=electioncaffe
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=electioncaffe_core
DATABASE_URL=postgresql://electioncaffe:<password>@<db-host>:<port>/heliumdb?sslmode=require
CORE_DATABASE_URL=postgresql://electioncaffe:<password>@<db-host>:<port>/electioncaffe_core?sslmode=require

# Auth (CRITICAL — generate with: openssl rand -hex 32)
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>

# CORS
CORS_ORIGIN=https://election.datacaffe.ai,https://admin.election.datacaffe.ai

# Tenant subdomains
APP_DOMAIN=election.datacaffe.ai

# Logging
LOG_LEVEL=info
LOG_DIR=/var/www/electioncaffe/logs
ENABLE_FILE_LOGGING=true
NODE_ENV=production

# Security
CREDIT_SIGNATURE_SECRET=<strong-random-secret>

# AI (optional)
OPENAI_API_KEY=<key>
GEMINI_API_KEY=<key>

# Storage
STORAGE_TYPE=local
STORAGE_PATH=/var/www/electioncaffe/uploads
```

### Frontend (Vite)

**`apps/web/.env.production`**
```
VITE_API_URL=/api
VITE_WS_URL=/socket.io
```

**`apps/super-admin/.env.production`**
```
VITE_API_URL=/api
```

> Relative paths work because Nginx serves frontend + proxies API on same domain. No CORS issues.

---

## PM2 Management

```bash
pm2 status                                # All 9 processes
pm2 logs                                  # All logs
pm2 logs gateway --lines 50              # Gateway logs
pm2 logs auth-service --lines 50         # Auth service logs
pm2 restart gateway                       # Restart one service
pm2 restart all                           # Restart all
pm2 reload ecosystem.config.cjs          # Zero-downtime reload
pm2 monit                                 # Resource monitor
pm2 save                                  # Save process list
```

## Nginx Management

```bash
sudo nginx -t                             # Test config
sudo systemctl reload nginx               # Reload (no downtime)
sudo systemctl restart nginx              # Full restart
tail -f /var/log/nginx/access.log         # Access logs
tail -f /var/log/nginx/error.log          # Error logs
```

## SSL Renewal

```bash
sudo certbot renew --dry-run              # Test renewal
sudo certbot renew                        # Renew all certs
```

---

## Health Checks

```bash
# Backend services (9)
curl http://localhost:3000/health          # Gateway
curl http://localhost:3001/health          # Auth
curl http://localhost:3002/health          # Election
curl http://localhost:3003/health          # Voter
curl http://localhost:3004/health          # Cadre
curl http://localhost:3005/health          # Analytics
curl http://localhost:3006/health          # Reporting
curl http://localhost:3007/health          # AI Analytics
curl http://localhost:3008/health          # Super Admin API

# Frontend (via Nginx)
curl http://localhost:80/health            # Web App
curl http://localhost:8080/health          # Super Admin UI

# Production domains
curl https://election.datacaffe.ai/health
curl https://admin.election.datacaffe.ai/health

# Automated health check
sudo bash deploy.sh --health
```

---

## Nginx Configuration Files

| File | Purpose | When to Use |
|------|---------|-------------|
| `nginx/nginx.conf` | Main config (upstreams, rate limits, security headers) | Always |
| `nginx/electioncaffe.conf` | Port-based access (no SSL, for IP access) | Dev VM / IP access |
| `nginx/conf.d/web.conf` | Production SSL for `election.datacaffe.ai` + wildcard tenants | Production |
| `nginx/conf.d/super-admin.conf` | Production SSL for `admin.election.datacaffe.ai` | Production |
| `nginx/conf.d/dev.conf` | Dev SSL for `election.datacaffe.in` + wildcard tenants | Dev/staging server |

**Choosing the right config:**
- **IP-based access** (no domain): Use `electioncaffe.conf` only
- **Production domains**: Use `nginx.conf` + `conf.d/web.conf` + `conf.d/super-admin.conf`
- **Dev domains**: Use `nginx.conf` + `conf.d/dev.conf`

---

## Tenant Subdomain Flow

```
User visits: https://mumbai-bjp.election.datacaffe.ai

1. DNS: *.election.datacaffe.ai → VM IP (wildcard A record)
2. Nginx: Matches *.election.datacaffe.ai server block
3. Nginx: Serves apps/web/dist/index.html (same app for all tenants)
4. Nginx: Proxies /api/* to gateway:3000 with Host header preserved
5. Gateway: Extracts "mumbai-bjp" from Host header
6. Auth Service: Looks up tenant by slug in core DB
7. Auth Service: Resolves tenant's database connection URL
8. All Services: Use tenant's database for queries
```

**DNS Setup Required:**
```
A     election.datacaffe.ai       → <VM-IP>
A     *.election.datacaffe.ai     → <VM-IP>
A     admin.election.datacaffe.ai → <VM-IP>
```

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| Service won't start | `sudo bash deploy.sh --logs <service>` |
| 502 Bad Gateway | `pm2 status` (check if backend is online) |
| CORS errors | Verify `.env` CORS_ORIGIN includes `https://` prefix |
| DB connection failed | Check DATABASE_URL in .env, test with `psql` |
| Tenant subdomain 404 | Check DNS wildcard `*.election.datacaffe.ai → VM IP` |
| Frontend blank page | `ls /var/www/electioncaffe/apps/web/dist/` |
| SSL cert expired | `sudo certbot renew` |
| Port already in use | `sudo bash deploy.sh --restart-only` (kills zombies) |
| Build fails | Check Node.js version (`node -v`, need 18+) |
| Prisma error | `npm run db:generate` then rebuild |

---

## Azure NSG Rules

| Priority | Port | Protocol | Source | Action |
|----------|------|----------|--------|--------|
| 100 | 22 | TCP | Your IP | Allow |
| 200 | 80 | TCP | Any | Allow |
| 300 | 443 | TCP | Any | Allow |
| 400 | 8080 | TCP | Any | Allow |

---

## Windows Development

For Windows local development, use the PowerShell script:

```powershell
.\scripts\deploy.ps1 full      # Full deployment
.\scripts\deploy.ps1 build     # Build only
.\scripts\deploy.ps1 start     # Start PM2
.\scripts\deploy.ps1 status    # Check status
.\scripts\deploy.ps1 health    # Health checks
.\scripts\deploy.ps1 help      # Show all commands
```

---

## File Structure (Deployment-Related)

```
ElectionCaffe/
├── deploy.sh                    # Main production deployment script
├── ecosystem.config.cjs         # PM2 configuration (9 services)
├── .env.production.example      # Production env template
├── nginx/
│   ├── nginx.conf               # Main Nginx config (upstreams, rate limits)
│   ├── electioncaffe.conf       # Port-based reverse proxy (no SSL)
│   └── conf.d/
│       ├── web.conf             # Production SSL: election.datacaffe.ai + *.
│       ├── super-admin.conf     # Production SSL: admin.election.datacaffe.ai
│       └── dev.conf             # Dev SSL: election.datacaffe.in + *.
├── scripts/
│   ├── setup-azure-vm.sh        # First-time VM setup
│   ├── deploy.ps1               # Windows PowerShell deployment
│   └── fix-db-permissions.psql  # Database permission grants
├── start.sh                     # Dev/prod startup (existing)
├── stop.sh                      # Service shutdown (existing)
├── apps/
│   ├── web/dist/                # Built web app (served by Nginx)
│   └── super-admin/dist/        # Built admin app (served by Nginx)
└── services/
    ├── gateway/dist/            # Built gateway (PM2)
    ├── auth-service/dist/       # Built auth (PM2)
    ├── election-service/dist/   # Built election (PM2)
    ├── voter-service/dist/      # Built voter (PM2)
    ├── cadre-service/dist/      # Built cadre (PM2)
    ├── analytics-service/dist/  # Built analytics (PM2)
    ├── reporting-service/dist/  # Built reporting (PM2)
    ├── ai-analytics-service/dist/ # Built AI analytics (PM2)
    └── super-admin-service/dist/  # Built super admin API (PM2)
```
