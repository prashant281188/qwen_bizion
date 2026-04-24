import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service.js';
import { createProductSchema, updateProductSchema, createVariantSchema, updateVariantSchema } from '../schemas/product.schema.js';

export class ProductController {
  async getAllProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const includeDeleted = req.query.includeDeleted === 'true';
      const products = await productService.getAllProducts(includeDeleted);
      
      res.json({
        success: true,
        data: products,
        count: products.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getProductById(req.params.id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
      
      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createProductSchema.parse(req.body);
      const product = await productService.createProduct(validatedData);
      
      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = updateProductSchema.parse(req.body);
      const product = await productService.updateProduct(req.params.id, validatedData);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
      
      res.json({
        success: true,
        data: product,
        message: 'Product updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.deleteProduct(req.params.id);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }
      
      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getVariantsByProductId(req: Request, res: Response, next: NextFunction) {
    try {
      const variants = await productService.getVariantsByProductId(req.params.productId);
      
      res.json({
        success: true,
        data: variants,
        count: variants.length,
      });
    } catch (error) {
      next(error);
    }
  }

  async createVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createVariantSchema.parse(req.body);
      const variant = await productService.createVariant(validatedData);
      
      res.status(201).json({
        success: true,
        data: variant,
        message: 'Variant created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = updateVariantSchema.parse(req.body);
      const variant = await productService.updateVariant(req.params.id, validatedData);
      
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found',
        });
      }
      
      res.json({
        success: true,
        data: variant,
        message: 'Variant updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteVariant(req: Request, res: Response, next: NextFunction) {
    try {
      const variant = await productService.deleteVariant(req.params.id);
      
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: 'Variant not found',
        });
      }
      
      res.json({
        success: true,
        message: 'Variant deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
