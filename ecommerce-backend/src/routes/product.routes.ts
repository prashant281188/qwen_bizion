import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';

const router = Router();

// Product routes
router.get('/', (req, res, next) => productController.getAllProducts(req, res, next));
router.post('/', (req, res, next) => productController.createProduct(req, res, next));
router.get('/:id', (req, res, next) => productController.getProductById(req, res, next));
router.put('/:id', (req, res, next) => productController.updateProduct(req, res, next));
router.delete('/:id', (req, res, next) => productController.deleteProduct(req, res, next));

// Variant routes
router.get('/:productId/variants', (req, res, next) => productController.getVariantsByProductId(req, res, next));
router.post('/variants', (req, res, next) => productController.createVariant(req, res, next));
router.put('/variants/:id', (req, res, next) => productController.updateVariant(req, res, next));
router.delete('/variants/:id', (req, res, next) => productController.deleteVariant(req, res, next));

export default router;
