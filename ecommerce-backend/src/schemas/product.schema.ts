import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  hsnSacId: z.string().uuid(),
  uomId: z.string().uuid(),
  weight: z.string().optional(),
  length: z.string().optional(),
  width: z.string().optional(),
  height: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().min(1).max(50),
  barcode: z.string().max(50).optional(),
  mpn: z.string().max(100).optional(),
  currentPurchasePrice: z.string(),
  currentPurchasePriceIsTaxInclusive: z.boolean().optional().default(false),
  currentSellingPrice: z.string(),
  currentSellingPriceIsTaxInclusive: z.boolean().optional().default(true),
  currentMrp: z.string(),
  isActive: z.boolean().optional().default(true),
});

export const updateVariantSchema = createVariantSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
