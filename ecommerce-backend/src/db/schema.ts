import { pgTable, uuid, varchar, text, integer, decimal, timestamp, boolean, index, uniqueIndex, jsonb, inet } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

export const brands = pgTable('brands', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  logoUrl: text('logo_url'),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at'), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxSlug: uniqueIndex('idx_brands_slug').on(table.slug),
  idxDeleted: index('idx_brands_deleted').on(table.deletedAt),
}));

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  parentId: uuid('parent_id').references(() => categories.id, { onDelete: 'set null' }), 
  isActive: boolean('is_active').default(true),
  metaTitle: varchar('meta_title', { length: 60 }),
  metaDescription: text('meta_description'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxSlug: uniqueIndex('idx_categories_slug').on(table.slug),
  idxDeleted: index('idx_categories_deleted').on(table.deletedAt),
}));

export const unitsOfMeasure = pgTable('units_of_measure', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), 
  symbol: varchar('symbol', { length: 10 }).notNull(),     
  description: text('description'),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxSymbol: uniqueIndex('idx_uom_symbol').on(table.symbol),
}));

export const parties = pgTable('parties', {
  id: uuid('id').defaultRandom().primaryKey(),
  partyType: varchar('party_type', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  gstNumber: varchar('gst_number', { length: 15 }),
  priceTier: varchar('price_tier', { length: 50 }),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxPartyType: index('idx_party_type').on(table.partyType),
  idxDeleted: index('idx_parties_deleted').on(table.deletedAt),
}));

export const hsnSacCodes = pgTable('hsn_sac_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 8 }).notNull().unique(),
  type: varchar('type', { length: 3 }).notNull(),
  description: text('description').notNull(),
  chapter: varchar('chapter', { length: 2 }),
  heading: varchar('heading', { length: 4 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxCode: uniqueIndex('idx_hsn_code').on(table.code),
}));

export const hsnTaxRates = pgTable('hsn_tax_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  hsnSacId: uuid('hsn_sac_id').references(() => hsnSacCodes.id, { onDelete: 'restrict' }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull(),
  cgstRate: decimal('cgst_rate', { precision: 5, scale: 2 }).notNull(),
  sgstRate: decimal('sgst_rate', { precision: 5, scale: 2 }).notNull(),
  igstRate: decimal('igst_rate', { precision: 5, scale: 2 }).notNull(),
  cess: decimal('cess', { precision: 5, scale: 2 }).default('0'),
  validFrom: timestamp('valid_from').notNull(),
  validTo: timestamp('valid_to'),
  notificationNo: varchar('notification_no', { length: 50 }),
  notificationDate: timestamp('notification_date'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxHsnValidFrom: index('idx_hsn_tax_valid_from').on(table.hsnSacId, table.validFrom),
  idxActiveRate: index('idx_active_hsn_rate').on(table.hsnSacId, table.isActive),
}));

export const attributeDefinitions = pgTable('attribute_definitions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(), 
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 20 }).default('SELECT'),
  isVariantAttribute: boolean('is_variant_attribute').default(false), 
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }), 
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxSlug: uniqueIndex('idx_attr_def_slug').on(table.slug),
  idxDeleted: index('idx_attr_def_deleted').on(table.deletedAt),
}));

export const attributeValues = pgTable('attribute_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  attributeDefinitionId: uuid('attribute_definition_id').references(() => attributeDefinitions.id, { onDelete: 'cascade' }).notNull(),
  value: varchar('value', { length: 100 }).notNull(), 
  hexCode: varchar('hex_code', { length: 7 }),
  sortOrder: integer('sort_order').default('0'),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqAttrValue: uniqueIndex('uniq_attr_value').on(table.attributeDefinitionId, table.value),
  idxDeleted: index('idx_attr_val_deleted').on(table.deletedAt),
}));

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  shortDescription: text('short_description'),
  longDescription: text('long_description'),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  hsnSacId: uuid('hsn_sac_id').references(() => hsnSacCodes.id).notNull(),
  uomId: uuid('uom_id').references(() => unitsOfMeasure.id).notNull(),
  weight: decimal('weight', { precision: 10, scale: 3 }),
  length: decimal('length', { precision: 10, scale: 2 }),
  width: decimal('width', { precision: 10, scale: 2 }),
  height: decimal('height', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true),
  isArchived: boolean('is_archived').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxName: index('idx_products_name').on(table.name),
  idxBrand: index('idx_products_brand').on(table.brandId),
  idxHsn: index('idx_products_hsn').on(table.hsnSacId),
  idxUom: index('idx_products_uom').on(table.uomId),
  idxDeleted: index('idx_products_deleted').on(table.deletedAt),
}));

export const productAttributes = pgTable('product_attributes', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  attributeDefinitionId: uuid('attribute_definition_id').references(() => attributeDefinitions.id).notNull(),
  value: text('value').notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqProductAttr: uniqueIndex('uniq_product_attr').on(table.productId, table.attributeDefinitionId),
  idxDeleted: index('idx_prod_attr_deleted').on(table.deletedAt),
}));

export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  sku: varchar('sku', { length: 50 }).notNull().unique(),
  barcode: varchar('barcode', { length: 50 }),
  mpn: varchar('mpn', { length: 100 }),
  currentPurchasePrice: decimal('current_purchase_price', { precision: 12, scale: 2 }).notNull(),
  currentPurchasePriceIsTaxInclusive: boolean('current_purchase_price_is_tax_inclusive').default(false),
  currentSellingPrice: decimal('current_selling_price', { precision: 12, scale: 2 }).notNull(),
  currentSellingPriceIsTaxInclusive: boolean('current_selling_price_is_tax_inclusive').default(true),
  currentMrp: decimal('current_mrp', { precision: 12, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxVariantSku: uniqueIndex('idx_variants_sku').on(table.sku),
  idxProductId: index('idx_variants_product_id').on(table.productId),
  idxBarcode: index('idx_variants_barcode').on(table.barcode),
  idxDeleted: index('idx_variants_deleted').on(table.deletedAt),
}));

export const variantAttributeValues = pgTable('variant_attribute_values', {
  id: uuid('id').defaultRandom().primaryKey(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  attributeValueId: uuid('attribute_value_id').references(() => attributeValues.id, { onDelete: 'cascade' }).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxVariantAttrVal: index('idx_variant_attr_val').on(table.variantId, table.attributeValueId),
  uniqVariantAttrVal: uniqueIndex('uniq_variant_attr_val').on(table.variantId, table.attributeValueId),
  idxDeleted: index('idx_var_attr_val_deleted').on(table.deletedAt),
}));

export const priceHistory = pgTable('price_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  priceType: varchar('price_type', { length: 20 }).notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  isTaxInclusive: boolean('is_tax_inclusive').notNull(),
  effectiveFrom: timestamp('effective_from').defaultNow().notNull(),
  effectiveTo: timestamp('effective_to'),
  partyId: uuid('party_id').references(() => parties.id, { onDelete: 'set null' }),
  changedBy: uuid('changed_by'),
  changeReason: text('change_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxVariantPriceHistory: index('idx_variant_price_history').on(table.variantId, table.effectiveFrom),
  idxPartyPriceHistory: index('idx_party_price_history').on(table.partyId, table.effectiveFrom),
}));

export const customerPricing = pgTable('customer_pricing', {
  id: uuid('id').defaultRandom().primaryKey(),
  partyId: uuid('party_id').references(() => parties.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  price: decimal('price', { precision: 12, scale: 2 }).notNull(),
  isTaxInclusive: boolean('is_tax_inclusive').default(true),
  validFrom: timestamp('valid_from').defaultNow().notNull(),
  validTo: timestamp('valid_to'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqCustomerVariant: uniqueIndex('uniq_customer_variant').on(table.partyId, table.variantId),
  idxCustomerPricing: index('idx_customer_pricing').on(table.partyId, table.variantId),
}));

export const bulkDiscounts = pgTable('bulk_discounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  minQuantity: integer('min_quantity').notNull(),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).notNull(),
  validFrom: timestamp('valid_from').defaultNow(),
  validTo: timestamp('valid_to'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxBulkDiscount: index('idx_bulk_discount').on(table.variantId, table.minQuantity),
}));

export const inventory = pgTable('inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull().unique(),
  quantityOnHand: integer('quantity_on_hand').default('0').notNull(),
  quantityReserved: integer('quantity_reserved').default('0').notNull(),
  reorderPoint: integer('reorder_point').default('0'),
  reorderQuantity: integer('reorder_quantity').default('0'),
  lowStockThreshold: integer('low_stock_threshold').default(5),
  averageCost: decimal('average_cost', { precision: 12, scale: 2 }),
  lastPurchaseCost: decimal('last_purchase_cost', { precision: 12, scale: 2 }),
  location: varchar('location', { length: 100 }),
  batchNumber: varchar('batch_number', { length: 50 }),
  expiryDate: timestamp('expiry_date'),
  lastStockUpdate: timestamp('last_stock_update'),
  lastCountedAt: timestamp('last_counted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxVariantInventory: uniqueIndex('idx_variant_inventory').on(table.variantId),
  idxLowStock: index('idx_low_stock').on(table.variantId),
  idxExpiryDate: index('idx_expiry_date').on(table.expiryDate),
}));

export const inventoryTransactions = pgTable('inventory_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }).notNull(),
  transactionType: varchar('transaction_type', { length: 20 }).notNull(),
  quantity: integer('quantity').notNull(),
  quantityBefore: integer('quantity_before').notNull(),
  quantityAfter: integer('quantity_after').notNull(),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  unitCost: decimal('unit_cost', { precision: 12, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 12, scale: 2 }),
  reason: text('reason'),
  notes: text('notes'),
  performedBy: uuid('performed_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxVariantTransaction: index('idx_variant_transaction').on(table.variantId, table.createdAt),
  idxReference: index('idx_transaction_reference').on(table.referenceType, table.referenceId),
}));

export const media = pgTable('media', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  url: text('url').notNull(),
  altText: text('alt_text'),
  isPrimary: boolean('is_primary').default(false),
  sortOrder: integer('sort_order').default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  idxEntity: index('idx_media_entity').on(table.entityType, table.entityId),
  idxPrimary: index('idx_media_primary').on(table.entityType, table.entityId, table.isPrimary),
}));

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 20 }).notNull(),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  changedBy: uuid('changed_by'),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  idxEntity: index('idx_audit_entity').on(table.entityType, table.entityId),
  idxCreatedAt: index('idx_audit_created_at').on(table.createdAt),
}));
