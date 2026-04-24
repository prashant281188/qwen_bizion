import { db } from '../config/database.js';
import { products, productVariants } from '../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { CreateProductInput, UpdateProductInput, CreateVariantInput, UpdateVariantInput } from '../schemas/product.schema.js';

export class ProductService {
  async getAllProducts(includeDeleted = false) {
    const query = db.select().from(products);
    
    if (!includeDeleted) {
      query.where(isNull(products.deletedAt));
    }
    
    return await query;
  }

  async getProductById(id: string) {
    const [product] = await db.select().from(products).where(
      and(eq(products.id, id), isNull(products.deletedAt))
    );
    return product;
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
    return await db.select().from(productVariants).where(
      and(eq(productVariants.productId, productId), isNull(productVariants.deletedAt))
    );
  }

  async createVariant(data: CreateVariantInput) {
    const [newVariant] = await db.insert(productVariants).values(data).returning();
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
