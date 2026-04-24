# E-commerce Backend

A complete Express.js backend application using Drizzle ORM, Zod, Axios, and PostgreSQL.

## Features

- **Complete Database Schema**: 17 tables including products, variants, inventory, pricing, tax compliance, and more
- **RESTful API**: Product and variant CRUD operations
- **Validation**: Zod schemas for request validation
- **Error Handling**: Comprehensive error handling middleware
- **TypeScript**: Full type safety

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Validation**: Zod
- **HTTP Client**: Axios

## Project Structure

```
ecommerce-backend/
├── src/
│   ├── config/
│   │   └── database.ts       # Database connection
│   ├── controllers/
│   │   └── product.controller.ts
│   ├── db/
│   │   └── schema.ts         # Complete Drizzle schema
│   ├── middleware/
│   │   └── errorHandler.ts
│   ├── routes/
│   │   └── product.routes.ts
│   ├── schemas/
│   │   └── product.schema.ts # Zod validation schemas
│   ├── services/
│   │   └── product.service.ts
│   └── index.ts              # Application entry point
├── .env
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd ecommerce-backend
npm install
```

### 2. Configure Environment

Update the `.env` file with your PostgreSQL connection string:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce_db?schema=public
PORT=3000
NODE_ENV=development
```

### 3. Create Database

```bash
createdb ecommerce_db
```

### 4. Generate and Run Migrations

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Or push schema directly (for development)
npm run db:push
```

### 5. Start the Server

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## API Endpoints

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | Get all products |
| POST | `/api/products` | Create a new product |
| GET | `/api/products/:id` | Get product by ID |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Soft delete product |

### Variants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/:productId/variants` | Get variants by product |
| POST | `/api/products/variants` | Create a new variant |
| PUT | `/api/products/variants/:id` | Update variant |
| DELETE | `/api/products/variants/:id` | Soft delete variant |

## Example Requests

### Create Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sample Product",
    "shortDescription": "A sample product",
    "hsnSacId": "uuid-here",
    "uomId": "uuid-here"
  }'
```

### Get All Products

```bash
curl http://localhost:3000/api/products
```

## Database Schema Includes

- **Reference Data**: Brands, Categories, Units of Measure
- **Parties**: Customers and Suppliers
- **Tax Compliance**: HSN/SAC codes with historical tax rates
- **Products & Variants**: With attributes support
- **Inventory**: Stock management with transactions
- **Pricing**: Price history, customer-specific pricing, bulk discounts
- **Media**: Product images and media files
- **Audit Log**: Change tracking

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema to database (dev only)
- `npm run db:studio` - Open Drizzle Studio

## License

ISC
