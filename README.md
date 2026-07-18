# Prichoy Clothing — Complete Project

```
prichoy-project/
├── frontend/     ← Customer website (existing, unchanged)
├── backend/      ← REST API — Node.js + Express + TypeScript + Prisma + MySQL
└── admin/        ← Admin ERP Dashboard — Next.js 15 + React 19
```

## Architecture

```
yourdomain.com          → frontend/  (Customer website)
api.yourdomain.com      → backend/   (REST API, serves frontend + admin + future apps)
admin.yourdomain.com    → admin/     (Admin ERP dashboard)
```

The **backend is the single source of truth**. It serves:
- The customer website (products, orders, checkout)
- The admin dashboard (everything in this build)
- Future Android/iOS apps (same REST API, no changes needed)

## What Was Built

### Backend (`backend/`)
Complete REST API with:
- **Authentication**: JWT + refresh tokens, role-based access (7 roles), bcrypt hashing
- **Orders**: Full workflow (Pending → Confirmed → Packed → Dispatched → Delivered),
  cancellation with stock restore, returns, refunds, bulk actions, order timeline
- **Products**: CRUD, categories, brands, variants, images, SKU/barcode
- **Inventory**: Stock in/out/adjust/transfer, multi-warehouse, low stock alerts,
  full movement history
- **Customers**: Auto-created on order, lifetime value tracking, tags (VIP/Blocked/etc), notes
- **Reports**: Sales summary, orders by status, product performance, courier
  performance, monthly revenue, inventory report, expense report
- **Exports**: Excel/CSV for orders/products/customers, PDF invoice generation
- **Couriers**: Pathao, SteadFast, RedX, Paperfly, Sundarban + custom couriers
- **Settings**: Company profile, shipping rates, notifications, audit log, expenses, users
- **Security**: Helmet, rate limiting, Zod validation, SQL injection protection (Prisma),
  audit logging on all sensitive actions

Database: **complete Prisma schema** — 25 tables covering every module above.

### Admin Dashboard (`admin/`)
- Dashboard with live stats cards + sales chart (Recharts)
- Orders: list with filters/search/bulk actions, full detail page with workflow buttons,
  status action modals (cancel/dispatch/return/refund)
- Products: list + create/edit form with pricing, categories, warehouse stock
- Inventory: stock table with adjust modal
- Customers: list + detail page with order history, notes, block/unblock
- Couriers, Reports (charts), Settings (company/shipping/users/audit log),
  Notifications, Expenses
- Role-based UI (buttons/pages hide based on permissions)
- Dark mode, responsive, TanStack Query for data fetching + caching

## Getting Started (Development)

### 1. Backend
```bash
cd backend
cp .env.example .env
# Edit .env with your local MySQL credentials
npm install
npm run db:generate
npm run db:migrate
npm run db:seed        # Creates admin@prichoy.com / Admin@123456
npm run dev             # Runs on http://localhost:4000
```

### 2. Admin Dashboard
```bash
cd admin
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev              # Runs on http://localhost:3001
```

### 3. Frontend
Your existing customer website — unchanged, runs as before.

## Deployment (cPanel)

See `backend/DEPLOYMENT.md` for full step-by-step cPanel Node.js App setup
for the backend (api.yourdomain.com).

The admin dashboard deploys the same way — a second cPanel Node.js App pointed
at `admin/`, subdomain `admin.yourdomain.com`, startup file `.next/standalone/server.js`
after running `npm run build`.

## First Login
```
URL:      https://admin.yourdomain.com
Email:    admin@prichoy.com
Password: Admin@123456
```
**Change this password immediately after first login** (Profile → Change Password).
