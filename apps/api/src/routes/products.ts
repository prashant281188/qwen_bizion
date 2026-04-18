import { Router } from 'express';
import { z } from 'zod';
import { db } from '@hardware-erp/db';
import { products, categories, variants, variantImages, partyPricing } from '@hardware-erp/db/schema';
import { eq, like, or, and, desc, sql } from 'drizzle-orm';
import { authenticate, authorize, optionalAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const productSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  categoryId: z.string().uuid().optional(),
  description: z.string().optional(),
  hsnCode: z.string().min(4, 'HSN code is required'),
  baseUnit: z.string().min(1, 'Base unit is required'),
});

const variantSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Variant name is required'),
  mrp: z.string(),
  purchaseRate: z.string().optional(),
  gstRate: z.string(),
  minStock: z.string().optional(),
});

// Get all products with pagination and search
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '20', search, category, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = undefined;
    if (search) {
      whereClause = or(
        like(products.name, `%${search}%`),
        like(products.description!, `%${search}%`),
        like(products.hsnCode, `%${search}%`)
      );
    }

    if (category) {
      whereClause = whereClause 
        ? and(whereClause, eq(products.categoryId, category as string))
        : eq(products.categoryId, category as string);
    }

    // Get total count
    const countResult = await db.select().from(products).where(whereClause);
    const total = countResult.length;

    // Get products with variants
    const productList = await db.select()
      .from(products)
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(products[sortBy as keyof typeof products]) : products[sortBy as keyof typeof products] as any)
      .limit(limitNum)
      .offset(offset);

    // Get variants for each product
    const productIds = productList.map(p => p.id);
    const allVariants = productIds.length > 0 
      ? await db.select().from(variants).where(eq(variants.productId, productIds[0]))
      : [];

    const productsWithVariants = await Promise.all(
      productList.map(async (product) => {
        const productVariants = await db.select()
          .from(variants)
          .where(eq(variants.productId, product.id));
        
        const variantsWithImages = await Promise.all(
          productVariants.map(async (variant) => {
            const images = await db.select()
              .from(variantImages)
              .where(eq(variantImages.variantId, variant.id))
              .orderBy(desc(variantImages.isPrimary), desc(variantImages.displayOrder));
            
            return { ...variant, images };
          })
        );

        return { ...product, variants: variantsWithImages };
      })
    );

    res.json({
      success: true,
      data: productsWithVariants,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// Get single product
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const productRecords = await db.select().from(products).where(eq(products.id, req.params.id));
    
    if (productRecords.length === 0) {
      throw new AppError('Product not found', 404);
    }

    const product = productRecords[0];
    
    // Get variants with images
    const productVariants = await db.select()
      .from(variants)
      .where(eq(variants.productId, product.id));
    
    const variantsWithImages = await Promise.all(
      productVariants.map(async (variant) => {
        const images = await db.select()
          .from(variantImages)
          .where(eq(variantImages.variantId, variant.id))
          .orderBy(desc(variantImages.isPrimary), desc(variantImages.displayOrder));
        
        return { ...variant, images };
      })
    );

    res.json({
      success: true,
      data: { ...product, variants: variantsWithImages },
    });
  } catch (error) {
    next(error);
  }
});

// Create product
router.post('/', authenticate, authorize('admin', 'staff'), async (req: AuthRequest, res, next) => {
  try {
    const data = productSchema.parse(req.body);

    const [newProduct] = await db.insert(products).values(data).returning();

    res.status(201).json({
      success: true,
      data: newProduct,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// Create variant
router.post('/:id/variants', authenticate, authorize('admin', 'staff'), async (req: AuthRequest, res, next) => {
  try {
    const data = variantSchema.parse({ ...req.body, productId: req.params.id });

    // Check if SKU exists
    const existingVariants = await db.select().from(variants).where(eq(variants.sku, data.sku));
    if (existingVariants.length > 0) {
      throw new AppError('SKU already exists', 409);
    }

    const [newVariant] = await db.insert(variants).values(data).returning();

    res.status(201).json({
      success: true,
      data: newVariant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// Get pricing for a variant (party-specific or default)
router.get('/variants/:variantId/pricing', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { variantId } = req.params;
    const partyId = req.user?.partyId;

    // Get variant details
    const variantRecords = await db.select().from(variants).where(eq(variants.id, variantId));
    if (variantRecords.length === 0) {
      throw new AppError('Variant not found', 404);
    }

    const variant = variantRecords[0];
    let sellingPrice = variant.mrp;

    // Check for party-specific pricing
    if (partyId) {
      const now = new Date();
      const partyPrices = await db.select()
        .from(partyPricing)
        .where(
          and(
            eq(partyPricing.partyId, partyId),
            eq(partyPricing.variantId, variantId),
            eq(partyPricing.isActive, true),
            or(
              eq(partyPricing.validTo, null),
              sql`${partyPricing.validTo} >= ${now}`
            )
          )
        )
        .orderBy(desc(partyPricing.createdAt))
        .limit(1);

      if (partyPrices.length > 0) {
        sellingPrice = partyPrices[0].sellingPrice;
      }
    }

    res.json({
      success: true,
      data: {
        variantId,
        mrp: variant.mrp,
        sellingPrice,
        gstRate: variant.gstRate,
        hasPartyPricing: !!partyId && sellingPrice !== variant.mrp,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Search variants (for catalog)
router.get('/variants/search', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const { q, page = '1', limit = '50' } = req.query;
    
    if (!q) {
      throw new AppError('Search query is required', 400);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Fuzzy search using ILIKE
    const searchResults = await db.select({
      variant: variants,
      product: products,
      category: categories,
    })
      .from(variants)
      .leftJoin(products, eq(variants.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(
        or(
          like(variants.sku, `%${q}%`),
          like(variants.name, `%${q}%`),
          like(products.name, `%${q}%`),
          like(products.hsnCode, `%${q}%`)
        )
      )
      .limit(limitNum)
      .offset(offset);

    const total = searchResults.length;

    res.json({
      success: true,
      data: searchResults.map(r => ({
        ...r.variant,
        productName: r.product?.name,
        categoryName: r.category?.name,
        hsnCode: r.product?.hsnCode,
      })),
      total,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
