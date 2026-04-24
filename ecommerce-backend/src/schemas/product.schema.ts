import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  hsnSacId: z.string().uuid(),
  uomId: z.string().uuid(),
  weight: z.number().positive().optional().transform(v => v?.toString()),
  length: z.number().positive().optional().transform(v => v?.toString()),
  width: z.number().positive().optional().transform(v => v?.toString()),
  height: z.number().positive().optional().transform(v => v?.toString()),
  isActive: z.boolean().default(true),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().min(1).max(50),
  barcode: z.string().max(50).optional(),
  mpn: z.string().max(100).optional(),
  currentPurchasePrice: z.number().positive().transform(v => v.toString()),
  currentPurchasePriceIsTaxInclusive: z.boolean().default(false),
  currentSellingPrice: z.number().positive().transform(v => v.toString()),
  currentSellingPriceIsTaxInclusive: z.boolean().default(true),
  currentMrp: z.number().positive().transform(v => v.toString()),
  isActive: z.boolean().default(true),
});

export const updateVariantSchema = createVariantSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
