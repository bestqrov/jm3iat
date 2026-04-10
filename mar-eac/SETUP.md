# Mar E-A.C - Setup Guide

## Quick Start

### Option 1: Docker (Recommended)

```bash
cd /Users/mac/Documents/jm3iat/mar-eac
docker-compose up -d
```

Then seed the database:
```bash
docker exec mareac-backend npm run db:push
docker exec mareac-backend npm run db:seed
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- DB Admin: `docker exec -it mareac-db psql -U mareac -d mareac`

---

### Option 2: Local Development

#### Prerequisites
- Node.js 18+
- PostgreSQL 14+

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Push schema to database
npm run db:push

# Seed initial data
npm run db:seed

# Start dev server
npm run dev
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@mareac.ma | SuperAdmin@123 |
| Sample Admin | admin@example.ma | Admin@123 |

---

## Architecture

```
mar-eac/
├── backend/                 # Node.js + Express + Prisma
│   ├── src/
│   │   ├── config/          # Database, JWT config
│   │   ├── middleware/      # Auth, tenant, subscription, roles
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/
│   │   │   ├── members/
│   │   │   ├── meetings/
│   │   │   ├── voting/
│   │   │   ├── finance/
│   │   │   ├── documents/
│   │   │   ├── reports/
│   │   │   ├── projects/
│   │   │   ├── funding/
│   │   │   ├── requests/
│   │   │   ├── water/
│   │   │   ├── reminders/
│   │   │   └── superadmin/
│   │   └── utils/
│   └── prisma/
│       ├── schema.prisma    # All database models
│       └── seed.js          # Initial data seeder
│
├── frontend/                # React + TypeScript + Vite + Tailwind
│   └── src/
│       ├── contexts/        # Auth, Theme, Language
│       ├── i18n/            # Arabic & French translations
│       ├── lib/             # API client, utilities
│       ├── components/      # Reusable UI components
│       └── pages/           # All page components
│
└── docker-compose.yml       # Full stack Docker setup
```

## Subscription Plans

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Members Management | ✅ | ✅ | ✅ |
| Meetings & PV | ✅ | ✅ | ✅ |
| Documents | ✅ | ✅ | ✅ |
| Finance | ❌ | ✅ | ✅ |
| Reports | ❌ | ✅ | ✅ |
| Projects | ❌ | ❌ | ✅ |
| Water Management | ❌ | ❌ | ✅ |
| Smart Reminders | ❌ | ❌ | ✅ |

*All plans include a 3-day free trial with PREMIUM access*

## API Endpoints

### Auth
- `POST /api/auth/register` - Register organization + admin
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Core Modules
- `/api/members` - CRUD members
- `/api/meetings` - CRUD + PV generation
- `/api/voting` - Voting sessions
- `/api/finance` - Income/Expense tracking
- `/api/documents` - File upload/download
- `/api/reports` - Literary & Financial reports
- `/api/projects` - Project management
- `/api/funding` - Funding tracking
- `/api/requests` - Commune/donor requests
- `/api/water` - Water installations + meter readings
- `/api/reminders` - Smart notifications
- `/api/superadmin` - Super admin panel
