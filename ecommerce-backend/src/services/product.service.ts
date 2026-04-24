import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../config/database.js';
import { products, productVariants, type Product, type ProductVariant } from '../db/schema.js';
import { CreateProductInput, UpdateProductInput, CreateVariantInput, UpdateVariantInput } from '../schemas/product.schema.js';

export class ProductService {
  async getAllProducts(includeDeleted = false) {
    const whereConditions = includeDeleted ? [] : [isNull(products.deletedAt)];
    
    return await db.query.products.findMany({
      where: whereConditions.length ? and(...whereConditions) : undefined,
      with: {
        category: true,
        brand: true,
        hsnSacCode: true,
        uom: true,
        variants: true,
      },
      orderBy: (products, { desc }) => [desc(products.createdAt)],
    });
  }

  async getProductById(id: string) {
    return await db.query.products.findFirst({
      where: and(eq(products.id, id), isNull(products.deletedAt)),
      with: {
        category: true,
        brand: true,
        hsnSacCode: true,
        uom: true,
        variants: {
          with: {
            inventory: true,
          }
        },
      },
    });
  }

  async createProduct(data: CreateProductInput) {
    const [newProduct] = await db.insert(products).values(data).returning();
    return newProduct;
  }

  async updateProduct(id: string, data: UpdateProductInput) {
    const [updatedProduct] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .returning();
    
    return updatedProduct;
  }

  async deleteProduct(id: string) {
    const [deletedProduct] = await db
      .update(products)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(products.id, id), isNull(products.deletedAt)))
      .returning();
    
    return deletedProduct;
  }

  async getVariantsByProductId(productId: string) {
    return await db.query.productVariants.findMany({
      where: and(eq(productVariants.productId, productId), isNull(productVariants.deletedAt)),
      with: {
        inventory: true,
        priceHistory: {
          limit: 1,
          orderBy: (priceHistory, { desc }) => [desc(priceHistory.effectiveFrom)],
        },
      },
    });
  }

  async createVariant(data: CreateVariantInput) {
    const [newVariant] = await db.insert(productVariants).values(data).returning();
    
    await db.insert(db.schema.inventory).values({
      variantId: newVariant.id,
      quantityOnHand: 0,
      quantityReserved: 0,
    });
    
    return newVariant;
  }

  async updateVariant(id: string, data: UpdateVariantInput) {
    const [updatedVariant] = await db
      .update(productVariants)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(productVariants.id, id), isNull(productVariants.deletedAt)))
      .returning();
    
    return updatedVariant;
  }

  async deleteVariant(id: string) {
    const [deletedVariant] = await db
      .update(productVariants)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(productVariants.id, id), isNull(productVariants.deletedAt)))
      .returning();
    
    return deletedVariant;
  }
}

export const productService = new ProductService();
