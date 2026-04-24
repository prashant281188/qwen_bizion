import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service.js';
import { createProductSchema, updateProductSchema, createVariantSchema, updateVariantSchema } from '../schemas/product.schema.js';

export class ProductController {
  async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const includeDeleted = req.query.includeDeleted === 'true';
      const products = await productService.getAllProducts(includeDeleted);
      res.json({ success: true, data: products });
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const product = await productService.getProductById(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createProductSchema.parse(req.body);
      const product = await productService.createProduct(validatedData);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error });
      }
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedData = updateProductSchema.parse(req.body);
      const product = await productService.updateProduct(id, validatedData);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.json({ success: true, data: product });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error });
      }
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const product = await productService.deleteProduct(id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      res.json({ success: true, message: 'Product deleted successfully', data: product });
    } catch (error) {
      next(error);
    }
  }

  async getVariantsByProductId(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
      const variants = await productService.getVariantsByProductId(productId);
      res.json({ success: true, data: variants });
    } catch (error) {
      next(error);
    }
  }

  async createVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createVariantSchema.parse(req.body);
      const variant = await productService.createVariant(validatedData);
      res.status(201).json({ success: true, data: variant });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error });
      }
      next(error);
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedData = updateVariantSchema.parse(req.body);
      const variant = await productService.updateVariant(id, validatedData);
      if (!variant) {
        return res.status(404).json({ success: false, message: 'Variant not found' });
      }
      res.json({ success: true, data: variant });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ success: false, message: 'Validation error', errors: error });
      }
      next(error);
    }
  }

  async deleteVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const variant = await productService.deleteVariant(id);
      if (!variant) {
        return res.status(404).json({ success: false, message: 'Variant not found' });
      }
      res.json({ success: true, message: 'Variant deleted successfully', data: variant });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
