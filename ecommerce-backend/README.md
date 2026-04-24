# E-commerce Backend API

A modern e-commerce backend built with Express, Drizzle ORM, PostgreSQL, Zod, and TypeScript.

## Features

- **Product Management**: CRUD operations for products and variants
- **Inventory Management**: Track stock levels, reservations, and transactions
- **Tax Compliance**: HSN/SAC codes with historical tax rates
- **Customer Pricing**: Customer-specific pricing and bulk discounts
- **Attribute System**: Flexible product attributes and variants
- **Audit Logging**: Complete audit trail for all changes
- **Soft Deletes**: All entities support soft deletion

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Validation**: Zod
- **HTTP Client**: Axios (for external API calls)

## Project Structure

```
ecommerce-backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers
│   ├── db/             # Database schema
│   ├── middleware/     # Error handling, auth, etc.
│   ├── routes/         # API routes
│   ├── schemas/        # Zod validation schemas
│   ├── services/       # Business logic
│   └── index.ts        # Application entry point
├── drizzle/            # Migration files
├── .env                # Environment variables
├── drizzle.config.ts   # Drizzle configuration
├── package.json
└── tsconfig.json
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Generate database migrations:
```bash
npm run db:generate
```

4. Run migrations:
```bash
npm run db:migrate
```

5. Start development server:
```bash
npm run dev
```

## API Endpoints

### Products

- `GET /api/products` - Get all products
- `POST /api/products` - Create a new product
- `GET /api/products/:id` - Get product by ID
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Soft delete product

### Product Variants

- `GET /api/products/:productId/variants` - Get variants for a product
- `POST /api/products/variants` - Create a new variant
- `PUT /api/products/variants/:id` - Update variant
- `DELETE /api/products/variants/:id` - Soft delete variant

## Database Schema

The application includes the following main entities:

- **Brands**: Product brands
- **Categories**: Product categories (hierarchical)
- **Units of Measure**: UOM for products
- **Parties**: Customers and suppliers
- **HSN/SAC Codes**: Tax classification codes
- **Products**: Main product entities
- **Product Variants**: SKU-level variants
- **Inventory**: Stock tracking
- **Price History**: Historical pricing
- **Customer Pricing**: Customer-specific prices
- **Bulk Discounts**: Quantity-based discounts
- **Media**: Product images and media
- **Audit Log**: Change tracking

## Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ecommerce_db
PORT=3000
NODE_ENV=development
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema to database (dev only)
- `npm run db:studio` - Open Drizzle Studio

## License

ISC
