# KAOS Cafe HRIS

A web-based Human Resource Information System built for **KAOS Cafe**, a multi-branch coffee shop. The system centralizes employee management, automates attendance tracking through selfie-based verification, streamlines shift scheduling, and simplifies payroll computation.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| State Management | TanStack React Query, Zustand |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Hosting | Cloudflare Pages (frontend), Railway (backend + database) |

## Features

### Admin Panel
- **Employee Management** — profiles, roles, branch assignment, bulk CSV import
- **Branch Management** — add/edit/deactivate branches across locations
- **Shift Scheduling** — drag-and-drop calendar interface per branch
- **Attendance Monitoring** — selfie verification, late/overtime tracking, anomaly flagging
- **Leave Management** — approval workflow (pending → approved/rejected)
- **Payroll Processing** — bi-monthly computation with SSS, PhilHealth, Pag-IBIG, BIR withholding tax, overtime, bonuses, deductions
- **Reports & Analytics** — attendance trends, payroll summaries, headcount
- **System Settings** — roles, permissions, company config, government contribution tables
- **Audit Logs** — tracks all system changes with before/after snapshots

### Employee Portal (Mobile-Friendly)
- View work schedules (daily, weekly, monthly)
- Attendance history and check-in logs
- Payslip access and PDF download
- Leave request submission with real-time status tracking
- Profile management

### Attendance Kiosk (Tablet-Based)
- Employee ID login for check-in/check-out
- Automatic selfie capture for identity verification
- Offline functionality with automatic data sync

## User Roles

| Role | Access |
|---|---|
| Admin / Owner | Full system access |
| Branch Manager | Branch-scoped access (own branch only) |
| Employee | Personal portal only |

## Project Structure

```
kaoscafehris/
├── package.json                    # npm workspaces root
├── client/                         # React + Vite (Cloudflare Pages)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── layout/             # Sidebar, Header, layouts
│   │   │   └── shared/             # Reusable components
│   │   ├── features/               # Feature modules
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── branches/
│   │   │   ├── scheduling/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   ├── payroll/
│   │   │   ├── reports/
│   │   │   ├── portal/
│   │   │   ├── settings/
│   │   │   └── audit-logs/
│   │   ├── hooks/                  # Global React hooks
│   │   ├── lib/                    # Axios client, utilities
│   │   ├── routes/                 # Route definitions
│   │   ├── stores/                 # Zustand state stores
│   │   └── types/                  # Shared TypeScript types
│   └── ...config files
└── server/                         # Express + Prisma (Railway)
    ├── prisma/
    │   ├── schema.prisma           # Database schema (14 models, 12 enums)
    │   └── seed.ts                 # Database seeder
    ├── src/
    │   ├── config/                 # Environment, Prisma client
    │   ├── middleware/             # Auth (JWT), error handler, Zod validation
    │   ├── modules/                # Feature modules
    │   │   ├── auth/
    │   │   ├── employees/
    │   │   ├── branches/
    │   │   ├── scheduling/
    │   │   ├── attendance/
    │   │   ├── leave/
    │   │   ├── payroll/
    │   │   ├── reports/
    │   │   ├── portal/
    │   │   ├── settings/
    │   │   └── audit-logs/
    │   ├── utils/                  # Helper functions
    │   ├── types/                  # Shared TypeScript types
    │   └── jobs/                   # Scheduled tasks
    └── API_ENDPOINTS.md            # Full API reference (68 endpoints)
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/mgraceyy/kaoscafehris.git
cd kaoscafehris

# Install all dependencies (client + server)
npm install
```

### Environment Setup

```bash
# Copy the example env file
cp server/.env.example server/.env

# Edit with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/kaoscafehris"
# JWT_SECRET="your-secret-key"
```

### Database Setup

```bash
# Run Prisma migrations
npm run db:migrate

# Seed the database (optional)
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Development

```bash
# Start both client and server concurrently
npm run dev

# Or run them separately
npm run dev:client    # http://localhost:5173
npm run dev:server    # http://localhost:3000
```

### Build

```bash
# Build both client and server
npm run build
```

## API Reference

See [server/API_ENDPOINTS.md](server/API_ENDPOINTS.md) for the complete API documentation with request/response shapes for all 68 endpoints.

## Database Schema

The Prisma schema includes 14 models:

| Model | Module |
|---|---|
| User | Authentication & RBAC |
| Branch | Branch management |
| Employee | Employee profiles, gov IDs, salary |
| Shift, ShiftAssignment | Drag-and-drop scheduling |
| Attendance | Selfie check-in/out, offline sync |
| LeaveRequest, LeaveBalance | Leave workflow & tracking |
| PayrollRun, Payslip, PayslipDeduction, PayslipEarning | Bi-monthly payroll |
| SystemSetting, GovernmentTable | App config & contribution tables |
| AuditLog | Change tracking |

## License

This project is proprietary software developed for KAOS Cafe.
