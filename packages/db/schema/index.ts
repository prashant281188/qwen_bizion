import { pgTable, text, integer, decimal, timestamp, uuid, boolean, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const partyType = pgEnum('party_type', ['customer', 'supplier']);
export const orderType = pgEnum('order_type', ['sales', 'purchase']);
export const orderStatus = pgEnum('order_status', ['draft', 'confirmed', 'partial', 'completed', 'cancelled']);
export const stockMovementType = pgEnum('stock_movement_type', ['purchase', 'sale', 'return_in', 'return_out', 'adjustment', 'opening']);
export const ledgerType = pgEnum('ledger_type', ['customer', 'supplier', 'cash', 'bank', 'expense', 'income', 'asset', 'liability', 'capital']);
export const entryType = pgEnum('entry_type', ['debit', 'credit']);
export const taxType = pgEnum('tax_type', ['cgst', 'sgst', 'igst']);
export const userType = pgEnum('user_type', ['admin', 'staff', 'retailer']);

// Users & Authentication
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: userType('role').notNull().default('staff'),
  partyId: uuid('party_id').references(() => parties.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));

// Parties (Customers & Suppliers)
export const parties = pgTable('parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: partyType('type').notNull(),
  gstin: text('gstin'),
  pan: text('pan'),
  stateCode: text('state_code').notNull(), // Required for IGST calculation
  stateName: text('state_name').notNull(),
  address: text('address'),
  city: text('city'),
  pincode: text('pincode'),
  phone: text('phone'),
  email: text('email'),
  creditDays: integer('credit_days').default(0),
  creditLimit: decimal('credit_limit', { precision: 15, scale: 2 }).default('0'),
  openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('parties_name_idx').on(table.name),
  gstinIdx: index('parties_gstin_idx').on(table.gstin),
  typeIdx: index('parties_type_idx').on(table.type),
}));

// Categories
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  parentId: uuid('parent_id').references((): any => categories.id),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('categories_name_idx').on(table.name),
}));

// Products
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  categoryId: uuid('category_id').references(categories.id),
  description: text('description'),
  hsnCode: text('hsn_code').notNull(), // Required for GST
  baseUnit: text('base_unit').notNull(), // e.g., PCS, KG, MTR
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('products_name_idx').on(table.name),
  hsnIdx: index('products_hsn_idx').on(table.hsnCode),
}));

// Product Variants (SKU-based)
export const variants = pgTable('variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id').notNull().references(products.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(), // Variant-specific name
  mrp: decimal('mrp', { precision: 15, scale: 2 }).notNull(),
  purchaseRate: decimal('purchase_rate', { precision: 15, scale: 2 }),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull(), // e.g., 18.00 for 18%
  minStock: decimal('min_stock', { precision: 15, scale: 2 }).default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  skuIdx: index('variants_sku_idx').on(table.sku),
  productIdx: index('variants_product_idx').on(table.productId),
}));

// Variant Images
export const variantImages = pgTable('variant_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  variantId: uuid('variant_id').notNull().references(variants.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  isPrimary: boolean('is_primary').notNull().default(false),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Party-Specific Pricing
export const partyPricing = pgTable('party_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  partyId: uuid('party_id').notNull().references(parties.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(variants.id, { onDelete: 'cascade' }),
  sellingPrice: decimal('selling_price', { precision: 15, scale: 2 }).notNull(),
  validFrom: timestamp('valid_from').notNull().defaultNow(),
  validTo: timestamp('valid_to'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  partyVariantIdx: index('party_pricing_party_variant_idx').on(table.partyId, table.variantId),
}));

// Price History
export const priceHistory = pgTable('price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  variantId: uuid('variant_id').notNull().references(variants.id),
  oldPrice: decimal('old_price', { precision: 15, scale: 2 }).notNull(),
  newPrice: decimal('new_price', { precision: 15, scale: 2 }).notNull(),
  changedBy: uuid('changed_by').references(users.id),
  reason: text('reason'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Stock Ledger (Transaction-based inventory)
export const stockLedger = pgTable('stock_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  variantId: uuid('variant_id').notNull().references(variants.id),
  movementType: stockMovementType('movement_type').notNull(),
  quantity: decimal('quantity', { precision: 15, scale: 2 }).notNull(), // Positive for IN, Negative for OUT
  balance: decimal('balance', { precision: 15, scale: 2 }).notNull(), // Running balance
  rate: decimal('rate', { precision: 15, scale: 2 }),
  amount: decimal('amount', { precision: 15, scale: 2 }),
  referenceType: text('reference_type'), // 'order', 'invoice', 'adjustment'
  referenceId: uuid('reference_id'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  variantIdx: index('stock_ledger_variant_idx').on(table.variantId),
  referenceIdx: index('stock_ledger_reference_idx').on(table.referenceType, table.referenceId),
}));

// Orders (Sales & Purchase)
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderNumber: text('order_number').notNull().unique(),
  type: orderType('type').notNull(),
  status: orderStatus('status').notNull().default('draft'),
  partyId: uuid('party_id').notNull().references(parties.id),
  orderDate: timestamp('order_date').notNull().defaultNow(),
  deliveryDate: timestamp('delivery_date'),
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  cgstAmount: decimal('cgst_amount', { precision: 15, scale: 2 }).default('0'),
  sgstAmount: decimal('sgst_amount', { precision: 15, scale: 2 }).default('0'),
  igstAmount: decimal('igst_amount', { precision: 15, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  roundOff: decimal('round_off', { precision: 15, scale: 2 }).default('0'),
  grandTotal: decimal('grand_total', { precision: 15, scale: 2 }).notNull().default('0'),
  remarks: text('remarks'),
  shippingAddress: text('shipping_address'),
  createdBy: uuid('created_by').references(users.id),
  confirmedAt: timestamp('confirmed_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  orderNumberIdx: index('orders_order_number_idx').on(table.orderNumber),
  partyIdx: index('orders_party_idx').on(table.partyId),
  typeIdx: index('orders_type_idx').on(table.type),
  statusIdx: index('orders_status_idx').on(table.status),
}));

// Order Items
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').notNull().references(orders.id, { onDelete: 'cascade' }),
  variantId: uuid('variant_id').notNull().references(variants.id),
  quantity: decimal('quantity', { precision: 15, scale: 2 }).notNull(),
  dispatchedQty: decimal('dispatched_qty', { precision: 15, scale: 2 }).default('0'),
  receivedQty: decimal('received_qty', { precision: 15, scale: 2 }).default('0'),
  rate: decimal('rate', { precision: 15, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull(),
  cgstRate: decimal('cgst_rate', { precision: 5, scale: 2 }).default('0'),
  sgstRate: decimal('sgst_rate', { precision: 5, scale: 2 }).default('0'),
  igstRate: decimal('igst_rate', { precision: 5, scale: 2 }).default('0'),
  cgstAmount: decimal('cgst_amount', { precision: 15, scale: 2 }).default('0'),
  sgstAmount: decimal('sgst_amount', { precision: 15, scale: 2 }).default('0'),
  igstAmount: decimal('igst_amount', { precision: 15, scale: 2 }).default('0'),
  subtotal: decimal('subtotal', { precision: 15, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).notNull(),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  orderIdx: index('order_items_order_idx').on(table.orderId),
  variantIdx: index('order_items_variant_idx').on(table.variantId),
}));

// Accounting Ledgers
export const ledgers = pgTable('ledgers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  type: ledgerType('type').notNull(),
  partyId: uuid('party_id').references(parties.id),
  openingBalance: decimal('opening_balance', { precision: 15, scale: 2 }).default('0'),
  openingType: entryType('opening_type'), // debit or credit
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('ledgers_name_idx').on(table.name),
  typeIdx: index('ledgers_type_idx').on(table.type),
}));

// Journal Entries
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  voucherNumber: text('voucher_number').notNull().unique(),
  voucherType: text('voucher_type').notNull(), // 'sales', 'purchase', 'payment', 'receipt', 'journal', 'contra'
  date: timestamp('date').notNull().defaultNow(),
  narration: text('narration'),
  referenceType: text('reference_type'), // 'order', 'invoice', 'payment'
  referenceId: uuid('reference_id'),
  totalDebit: decimal('total_debit', { precision: 15, scale: 2 }).notNull().default('0'),
  totalCredit: decimal('total_credit', { precision: 15, scale: 2 }).notNull().default('0'),
  createdBy: uuid('created_by').references(users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  voucherNumberIdx: index('journal_entries_voucher_number_idx').on(table.voucherNumber),
  dateIdx: index('journal_entries_date_idx').on(table.date),
}));

// Journal Entry Lines (Double Entry)
export const journalEntryLines = pgTable('journal_entry_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryId: uuid('entry_id').notNull().references(journalEntries.id, { onDelete: 'cascade' }),
  ledgerId: uuid('ledger_id').notNull().references(ledgers.id),
  entryType: entryType('entry_type').notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  remarks: text('remarks'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  entryIdx: index('journal_entry_lines_entry_idx').on(table.entryId),
  ledgerIdx: index('journal_entry_lines_ledger_idx').on(table.ledgerId),
}));

// Payments
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentNumber: text('payment_number').notNull().unique(),
  type: text('type').notNull(), // 'receipt' or 'payment'
  partyId: uuid('party_id').notNull().references(parties.id),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp('payment_date').notNull().defaultNow(),
  paymentMode: text('payment_mode').notNull(), // 'cash', 'cheque', 'bank_transfer', 'upi'
  referenceNumber: text('reference_number'), // Cheque number, UTR, etc.
  bankName: text('bank_name'),
  remarks: text('remarks'),
  createdBy: uuid('created_by').references(users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  paymentNumberIdx: index('payments_payment_number_idx').on(table.paymentNumber),
  partyIdx: index('payments_party_idx').on(table.partyId),
}));

// Payment Allocations (linking payments to orders/invoices)
export const paymentAllocations = pgTable('payment_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(payments.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(orders.id),
  allocatedAmount: decimal('allocated_amount', { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  paymentIdx: index('payment_allocations_payment_idx').on(table.paymentId),
  orderIdx: index('payment_allocations_order_idx').on(table.orderId),
}));

// Expenses
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseNumber: text('expense_number').notNull().unique(),
  categoryId: uuid('category_id').references(categories.id),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  expenseDate: timestamp('expense_date').notNull().defaultNow(),
  description: text('description').notNull(),
  vendorName: text('vendor_name'),
  gstAmount: decimal('gst_amount', { precision: 15, scale: 2 }).default('0'),
  paymentMode: text('payment_mode'),
  referenceNumber: text('reference_number'),
  remarks: text('remarks'),
  createdBy: uuid('created_by').references(users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  party: one(parties, {
    fields: [users.partyId],
    references: [parties.id],
  }),
}));

export const partiesRelations = relations(parties, ({ many }) => ({
  users: many(users),
  orders: many(orders),
  partyPricing: many(partyPricing),
  payments: many(payments),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(categories, { relationName: 'categoryHierarchy' }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(variants),
}));

export const variantsRelations = relations(variants, ({ one, many }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
  images: many(variantImages),
  partyPricing: many(partyPricing),
  stockLedger: many(stockLedger),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  party: one(parties, {
    fields: [orders.partyId],
    references: [parties.id],
  }),
  items: many(orderItems),
  paymentAllocations: many(paymentAllocations),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  variant: one(variants, {
    fields: [orderItems.variantId],
    references: [variants.id],
  }),
}));

export const ledgersRelations = relations(ledgers, ({ many }) => ({
  journalEntryLines: many(journalEntryLines),
}));

export const journalEntriesRelations = relations(journalEntries, ({ many }) => ({
  lines: many(journalEntryLines),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  entry: one(journalEntries, {
    fields: [journalEntryLines.entryId],
    references: [journalEntries.id],
  }),
  ledger: one(ledgers, {
    fields: [journalEntryLines.ledgerId],
    references: [ledgers.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  party: one(parties, {
    fields: [payments.partyId],
    references: [parties.id],
  }),
  allocations: many(paymentAllocations),
}));

export const paymentAllocationsRelations = relations(paymentAllocations, ({ one }) => ({
  payment: one(payments, {
    fields: [paymentAllocations.paymentId],
    references: [payments.id],
  }),
  order: one(orders, {
    fields: [paymentAllocations.orderId],
    references: [orders.id],
  }),
}));
