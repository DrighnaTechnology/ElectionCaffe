# ElectionCaffe

A comprehensive Election Management Platform with AI-powered analytics and DataCaffe.ai integration.

## Features

- **Election Management**: Create and manage elections, constituencies, and polling booths
- **Voter Database**: Comprehensive voter data management with demographic information
- **Cadre Management**: Manage election workers, assign to booths, track performance
- **Family Grouping**: Group voters by family for targeted outreach
- **Analytics Dashboard**: Real-time analytics and insights
- **AI-Powered Analytics**: Advanced predictions and risk assessments
- **Report Generation**: Export reports in multiple formats
- **DataCaffe.ai Integration**: Embed advanced analytics dashboards

## Tech Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** with Prisma ORM
- **Microservices Architecture**
- **JWT Authentication**
- **Socket.IO** for real-time updates

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Radix UI** components
- **TanStack Query** for data fetching
- **Zustand** for state management
- **Recharts** for charts and visualizations
- **Leaflet** for maps

## Project Structure

```
ElectionCaffe/
├── apps/
│   └── web/                    # React frontend application
├── packages/
│   ├── database/               # Prisma schema and database client
│   └── shared/                 # Shared types, utilities, and validation
├── services/
│   ├── gateway/               # API Gateway (port 3000)
│   ├── auth-service/          # Authentication service (port 3001)
│   ├── election-service/      # Election management (port 3002)
│   ├── voter-service/         # Voter management (port 3003)
│   ├── cadre-service/         # Cadre management (port 3004)
│   ├── analytics-service/     # Analytics (port 3005)
│   ├── reporting-service/     # Reports & DataCaffe (port 3006)
│   └── ai-analytics-service/  # AI Analytics (port 3007)
└── scripts/                   # Setup and utility scripts
```

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm 9 or higher

## Quick Start

### 1. Clone and Install

```bash
cd ElectionCaffe
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and update the database connection string:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/electioncaffe"
```

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Create database schema
npm run db:push

# Seed with sample data (optional)
npm run db:seed
```

### 4. Start Development Server

```bash
npm run dev
```

This starts all services using Turborepo. The web app will be available at http://localhost:5173

## 🏢 Multi-Tenant Access

ElectionCaffe supports multiple tenants with **separate URLs** for each organization. Each tenant has a dedicated portal on a different port (development) or subdomain (production).

### Start All Tenant Portals

```bash
./start-all-tenants.sh
```

Or manually:

```bash
cd apps/web
npm run dev:all-tenants
```

### Access Tenant Portals (Development)

| Tenant | URL | Email | Password |
|--------|-----|-------|----------|
| **Demo** | http://localhost:5180/ | demo@electioncaffe.com | Admin@123 |
| **BJP Tamil Nadu** | http://localhost:5181/ | admin.bjp-tn@electioncaffe.com | Admin@123 |
| **BJP Uttar Pradesh** | http://localhost:5182/ | admin.bjp-up@electioncaffe.com | Admin@123 |
| **AIDMK Tamil Nadu** | http://localhost:5183/ | admin.aidmk-tn@electioncaffe.com | Admin@123 |

**Currently Running Apps:**
- Super Admin Portal: http://localhost:5176/
- Default Web App: http://localhost:5177/ (Demo tenant)

### Production Access (Subdomains)

- Demo: https://demo.electioncaffe.com
- BJP TN: https://bjp-tn.electioncaffe.com
- BJP UP: https://bjp-up.electioncaffe.com
- AIDMK TN: https://aidmk-tn.electioncaffe.com

**Note:** Each tenant portal automatically detects the organization from the URL. No tenant slug field required!

**For detailed tenant setup and management, see [TENANT_ACCESS_GUIDE.md](TENANT_ACCESS_GUIDE.md)**

## Default Login Credentials

After seeding the database:
- **Mobile**: 9876543210
- **Password**: admin123

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all packages and services |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio |

## API Endpoints

All API requests go through the gateway at `http://localhost:3000/api`

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Elections
- `GET /api/elections` - List elections
- `POST /api/elections` - Create election
- `GET /api/elections/:id` - Get election
- `PUT /api/elections/:id` - Update election
- `DELETE /api/elections/:id` - Delete election

### Voters
- `GET /api/voters` - List voters
- `POST /api/voters` - Create voter
- `POST /api/voters/bulk` - Bulk import voters
- `GET /api/voters/:id` - Get voter
- `PUT /api/voters/:id` - Update voter

### Parts/Booths
- `GET /api/parts` - List parts
- `POST /api/parts` - Create part
- `POST /api/parts/bulk` - Bulk import parts

### Cadres
- `GET /api/cadres` - List cadres
- `POST /api/cadres` - Create cadre
- `POST /api/cadres/assign` - Assign cadre to booth

### Analytics
- `GET /api/analytics/overview/:electionId` - Overview analytics
- `GET /api/analytics/voters/:electionId` - Voter analytics
- `GET /api/analytics/age-groups/:electionId` - Age group distribution

### AI Analytics
- `GET /api/ai-analytics/:electionId/predict/turnout` - Turnout prediction
- `GET /api/ai-analytics/:electionId/analyze/swing-voters` - Swing voter analysis
- `GET /api/ai-analytics/:electionId/assess/booth-risk` - Booth risk assessment

### Reports
- `GET /api/reports` - List reports
- `POST /api/reports` - Generate report
- `GET /api/reports/generate/voter-demographics/:electionId` - Generate voter demographics report

### DataCaffe
- `GET /api/datacaffe/embeds` - List embeds
- `POST /api/datacaffe/embeds` - Create embed
- `POST /api/datacaffe/sync/:electionId` - Sync data to DataCaffe

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `GATEWAY_PORT` | Gateway service port | 3000 |
| `WEB_PORT` | Web app port | 5173 |
| `CORS_ORIGIN` | CORS allowed origin | http://localhost:5173 |
| `DATACAFFE_API_URL` | DataCaffe.ai API URL | https://api.datacaffe.ai |
| `DATACAFFE_API_KEY` | DataCaffe.ai API key | Optional |

## Production Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
NODE_ENV=production npm start
```

## Architecture

```
┌─────────────┐     ┌─────────────────┐
│   Web App   │────▶│   API Gateway   │
│  (React)    │     │   (Port 3000)   │
└─────────────┘     └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Auth Service  │  │Election Service │  │ Voter Service   │
│  (Port 3001)  │  │   (Port 3002)   │  │   (Port 3003)   │
└───────────────┘  └─────────────────┘  └─────────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │    Database     │
                    └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, email support@datacaffe.ai or visit https://datacaffe.ai
