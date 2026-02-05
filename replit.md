# ElectionCaffe

## Overview
ElectionCaffe is a comprehensive election management platform with advanced analytics and AI capabilities. It's a Turborepo monorepo with multiple microservices, frontend applications, and a PostgreSQL database backend.

## Project Structure
```
/
├── apps/
│   └── web/                 # Main React frontend (Vite, port 5000)
├── services/
│   ├── gateway/             # API Gateway (port 3000)
│   ├── auth-service/        # Authentication service (port 3001)
│   ├── election-service/    # Election management (port 3002)
│   ├── voter-service/       # Voter management (port 3003)
│   ├── cadre-service/       # Cadre/workforce management (port 3004)
│   ├── analytics-service/   # Analytics processing (port 3005)
│   ├── reporting-service/   # Report generation (port 3006)
│   └── ai-analytics-service/# AI-powered analytics (port 3007)
├── packages/
│   ├── database/            # Prisma schemas (core & tenant)
│   ├── shared/              # Shared utilities and types
│   └── ui/                  # Shared UI components
├── turbo.json               # Turborepo configuration
├── package.json             # Root workspace package.json
└── .env                     # Environment variables
```

## Technical Stack
- **Runtime**: Node.js 20
- **Frontend**: React 18, Vite, TailwindCSS, React Router v6
- **Backend**: Express.js, Node.js microservices
- **Database**: PostgreSQL (Replit-managed)
- **ORM**: Prisma with multi-tenant architecture
- **Monorepo**: Turborepo with npm workspaces
- **Port**: 5000 (frontend webview)

## Database Architecture
- **Core Database**: System configs, super admin, license plans, feature flags
- **Tenant Database**: Multi-tenant data (elections, voters, cadres, analytics)

## User Accounts
- **Super Admin**: superadmin@electioncaffe.com / SuperAdmin@123

## Development
Run the development server:
```bash
cd apps/web && npm run dev
```

Run all services (requires backend setup):
```bash
npm run dev
```

## Recent Changes
- February 5, 2026: Fixed database connection issues - login now working
- February 5, 2026: Created tenant tables (users, refresh_tokens) for multi-tenant support
- February 5, 2026: Created default tenant and admin user
- February 2026: Initial Replit deployment setup
- Configured Vite for port 5000 with host 0.0.0.0
- Set up PostgreSQL database with Prisma schemas
- Seeded core database with system configurations

## Current Status
- All microservices running successfully
- Login functionality working with admin credentials
- Frontend accessible via webview on port 5000

## Deployment
The application frontend is configured for webview deployment on Replit.
