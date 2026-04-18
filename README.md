# Hardware ERP - GST Compliant Trading System

A complete ERP solution for Indian hardware goods distributors with GST compliance, inspired by Tally ERP.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Query, TanStack Table
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod
- **Auth**: JWT

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+

### Setup

1. **Start Database**
```bash
docker-compose up -d postgres
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Variables**
Copy `.env.example` to `.env` in both `/apps/api` and `/apps/web`:

```bash
# API (.env)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hardware_erp
JWT_SECRET=your-secret-key-change-in-production
PORT=3001
FRONTEND_URL=http://localhost:3000
COMPANY_STATE_CODE=27

# Web (.env)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

4. **Run Migrations**
```bash
npm run db:migrate
```

5. **Seed Database**
```bash
npm run db:seed
```

6. **Start Development Servers**
```bash
npm run dev
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hardware.com | admin123 |
| Staff | staff@hardware.com | staff123 |
| Retailer | retailer@hardware.com | retailer123 |

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

### Parties (Customers/Suppliers)
- `GET /api/parties` - List parties
- `POST /api/parties` - Create party
- `GET /api/parties/:id` - Get party details
- `PUT /api/parties/:id` - Update party
- `DELETE /api/parties/:id` - Deactivate party

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product with variants
- `POST /api/products` - Create product
- `POST /api/products/:id/variants` - Add variant
- `GET /api/products/variants/search?q=` - Search variants

### Orders
- `GET /api/orders` - List orders
- `POST /api/orders` - Create order (auto-updates stock & accounting)
- `GET /api/orders/:id` - Get order details

### Inventory
- `GET /api/inventory/summary` - Stock summary
- `GET /api/inventory/ledger/:variantId` - Stock movements
- `GET /api/inventory/low-stock` - Low stock alerts

### Accounting
- `GET /api/accounting/ledgers` - Chart of accounts
- `GET /api/accounting/ledgers/:id/balance` - Ledger balance
- `POST /api/accounting/journal` - Create journal entry

### Reports
- `GET /api/reports/trial-balance` - Trial Balance
- `GET /api/reports/profit-loss` - P&L Statement
- `GET /api/reports/balance-sheet` - Balance Sheet
- `GET /api/reports/gstr-1` - GSTR-1 Sales Register
- `GET /api/reports/ledger/:partyId` - Party Ledger

## Key Features

### GST Compliance
- Auto-calculate CGST/SGST for intra-state, IGST for inter-state
- HSN code tracking
- GSTR-1, GSTR-3B ready reports

### Double-Entry Accounting
- Automatic journal entries from sales/purchase orders
- Full chart of accounts
- Trial Balance, P&L, Balance Sheet

### Inventory Management
- Stock ledger (not static quantity)
- Track all movements: purchase, sale, return, adjustment
- Low stock alerts

### Pricing Engine
- Variant-level MRP
- Party-specific pricing overrides
- Rate history tracking

## Test API with cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hardware.com","password":"admin123"}'

# Get products (public)
curl http://localhost:3001/api/products

# Create sales order (requires auth token)
curl -X POST http://localhost:3001/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "sales",
    "partyId": "PARTY_ID",
    "items": [{"variantId": "VARIANT_ID", "quantity": "10", "rate": "400"}]
  }'
```

## Project Structure

```
hardware-erp/
├── apps/
│   ├── api/          # Express backend
│   └── web/          # Next.js frontend
├── packages/
│   ├── db/           # Drizzle schema & migrations
│   └── types/        # Shared TypeScript types
├── docker-compose.yml
└── package.json
```

## License

MIT
