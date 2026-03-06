# ElectionCaffe

Election Management Platform with multi-tenant architecture, AI-powered analytics, and DataCaffe.ai integration.

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** >= 14 (running on port 5333 by default, configurable in `.env`)
- **npm** >= 9

## Quick Start

```bash
git clone <repo-url>
cd ElectionCaffe

# One command — sets up everything and starts all services:
./start.sh
```

That's it. The script handles:
- `.env` creation from `.env.example` (if missing)
- Environment validation
- PostgreSQL connection verification
- Database creation (`electioncaffecore`, `ec_demo`)
- Dependency installation
- Prisma client generation + schema push
- Super admin seeding (login credentials, license plans, feature flags, AI config)
- Starting all 9 backend services + 2 frontend apps

### Super Admin Login

Created automatically on first run:

| | |
|---|---|
| **Email** | `superadmin@electioncaffe.com` |
| **Password** | `SuperAdmin@123` |
| **URL** | `http://localhost:5174` (Super Admin UI) |

### Start Options

```bash
./start.sh                          # Full setup + start everything
./start.sh --backend                # Backend services only
./start.sh --frontend               # Frontend apps only
./start.sh --skip-deps --skip-db    # Fast restart (skip setup)
./start.sh --setup-only             # Setup only, don't start services
./start.sh --mode=production        # Production mode (build + PM2)
./start.sh --help                   # All options
```

## Architecture

```
                    ┌──────────────────┐    ┌──────────────────┐
                    │    Web App       │    │  Super Admin UI  │
                    │  (React, :5000)  │    │  (React, :5174)  │
                    └────────┬─────────┘    └────────┬─────────┘
                             │                       │
                             └───────────┬───────────┘
                                         ▼
                              ┌─────────────────────┐
                              │    API Gateway      │
                              │     (Port 3000)     │
                              └──────────┬──────────┘
                                         │
         ┌───────────┬───────────┬───────┼───────┬───────────┬───────────┐
         ▼           ▼           ▼       ▼       ▼           ▼           ▼
   ┌──────────┐┌──────────┐┌──────────┐┌────┐┌──────────┐┌──────────┐┌──────────┐
   │  Auth    ││ Election ││  Voter   ││Cadre││Analytics ││Reporting ││AI Analyt.│
   │  :3001   ││  :3002   ││  :3003   ││:3004││  :3005   ││  :3006   ││  :3007   │
   └────┬─────┘└────┬─────┘└────┬─────┘└──┬─┘└────┬─────┘└────┬─────┘└────┬─────┘
        │           │           │         │        │           │           │
        └───────────┴───────────┴────┬────┴────────┴───────────┘           │
                                     ▼                                     │
                    ┌──────────────────────────────┐      ┌────────────────┘
                    │    Super Admin Service       │      │
                    │         (Port 3008)          │      │
                    └──────────────┬───────────────┘      │
                                   │                      │
                    ┌──────────────┴──────────────────────┘
                    ▼
         ┌─────────────────────┐
         │     PostgreSQL      │
         │  ┌───────────────┐  │
         │  │electioncaffe- │  │
         │  │    core       │  │  ← Super admin, tenants, plans, feature flags
         │  └───────────────┘  │
         │  ┌───────────────┐  │
         │  │   ec_demo     │  │  ← Per-tenant data (voters, elections, cadres)
         │  └───────────────┘  │
         │  ┌───────────────┐  │
         │  │   ec_bjp_tn   │  │  ← Each tenant gets its own database
         │  └───────────────┘  │
         └─────────────────────┘
```

## Project Structure

```
ElectionCaffe/
├── apps/
│   ├── web/                      # Tenant portal (React + Vite, :5000)
│   └── super-admin/              # Super admin panel (React + Vite, :5174)
├── packages/
│   ├── database/                 # Prisma schemas (core + tenant), seed scripts
│   └── shared/                   # Shared types, validation, logger
├── services/
│   ├── gateway/                  # API Gateway (:3000) — routes to all services
│   ├── auth-service/             # Authentication (:3001) — JWT, login
│   ├── election-service/         # Election management (:3002)
│   ├── voter-service/            # Voter database (:3003)
│   ├── cadre-service/            # Campaign workers (:3004)
│   ├── analytics-service/        # Analytics dashboards (:3005)
│   ├── reporting-service/        # Reports + DataCaffe (:3006)
│   ├── ai-analytics-service/     # AI analytics (:3007)
│   └── super-admin-service/      # Super admin API (:3008)
├── start.sh                      # Setup & start (single entry point)
├── stop.sh                       # Stop all services
├── ecosystem.config.cjs          # PM2 config (production)
└── scripts/                      # Utility scripts
```

## Databases

Two separate Prisma schemas, two database types:

| Database | Schema | Purpose |
|----------|--------|---------|
| `electioncaffecore` | `packages/database/prisma/core/` | Super admin users, tenants, license plans, feature flags, AI config |
| `ec_<tenant>` | `packages/database/prisma/tenant/` | Per-tenant data: voters, elections, cadres, analytics |

The core database is shared. Each tenant gets an isolated database (`ec_demo`, `ec_bjp_tn`, etc.) provisioned through the super admin UI.

## Environment Variables

Copy `.env.example` to `.env` (done automatically by `start.sh`). Key variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `CORE_DATABASE_URL` | Core database connection | Yes |
| `TENANT_DATABASE_URL` | Default tenant database | Yes |
| `JWT_SECRET` | JWT signing key (min 32 chars) | Yes |
| `JWT_REFRESH_SECRET` | Refresh token key (min 32 chars) | Yes |
| `CREDIT_SIGNATURE_SECRET` | HMAC key for AI credit tamper detection | Yes |
| `INTERNAL_API_KEY` | Service-to-service auth | Recommended |
| `OPENAI_API_KEY` | OpenAI API key (for AI features) | Optional |
| `GEMINI_API_KEY` | Google Gemini fallback | Optional |
| `DATACAFFE_API_KEY` | DataCaffe.ai integration | Optional |

All ports are configurable: `GATEWAY_PORT`, `AUTH_PORT`, `ELECTION_PORT`, etc.

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all services in dev mode (turbo, hot-reload) |
| `npm run build` | Build all packages and services |
| `npm run services:dev` | Start backend services only |
| `npm run db:generate` | Generate Prisma clients (core + tenant) |
| `npm run db:push` | Push schemas to databases |
| `npm run db:seed:core` | Seed super admin + platform config |
| `npm run db:seed` | Seed demo data (dev only) |
| `npm run db:studio` | Open Prisma Studio GUI |

## Multi-Tenant

Each tenant gets a separate portal URL. In development, tenants run on different ports. In production, they use subdomains.

Tenants are created through the **Super Admin UI** (`http://localhost:5174`). The super admin provisions the tenant, creates their database, and sets up their admin user. No hardcoded tenant data — everything goes through the UI.

## Production Deployment

```bash
# Production mode: builds everything, starts with PM2
./start.sh --mode=production

# Or step by step:
./start.sh --setup-only --mode=production   # Setup only
pm2 start ecosystem.config.cjs             # Start services
```

Production requires:
- PM2 globally installed (`npm install -g pm2`)
- Nginx as reverse proxy
- Real secrets in `.env` (script blocks default values in production mode)
- SSL via Certbot or managed load balancer

See [DEPLOYMENT-FULL.md](DEPLOYMENT-FULL.md) for the complete production deployment guide.

## API

All requests go through the gateway at `http://localhost:3000/api`.

| Endpoint | Service | Description |
|----------|---------|-------------|
| `/api/auth/*` | Auth | Login, register, refresh tokens |
| `/api/elections/*` | Election | Election CRUD, constituencies |
| `/api/voters/*` | Voter | Voter management, bulk import |
| `/api/parts/*` | Voter | Polling booths and sections |
| `/api/cadres/*` | Cadre | Campaign worker management |
| `/api/analytics/*` | Analytics | Dashboards, demographics |
| `/api/ai-analytics/*` | AI Analytics | Predictions, sentiment |
| `/api/reports/*` | Reporting | PDF/Excel report generation |
| `/api/datacaffe/*` | Reporting | DataCaffe.ai embed sync |
| `/api/super-admin/*` | Super Admin | Tenant management, plans |

## Tech Stack

**Backend:** Node.js, Express.js, TypeScript, Prisma, PostgreSQL, JWT, Socket.IO, Pino

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI, TanStack Query, Zustand, Recharts, Leaflet

**Tooling:** Turborepo, PM2, Nginx, Concurrently

## License

Proprietary software. All rights reserved.

## Support

support@datacaffe.ai | https://datacaffe.ai
