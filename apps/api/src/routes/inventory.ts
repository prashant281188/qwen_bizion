import { Router } from 'express';
import { db } from '@hardware-erp/db';
import { stockLedger, variants } from '@hardware-erp/db/schema';
import { eq, desc, sql, sum } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Get stock summary for all variants
router.get('/summary', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '50', search } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Get current stock balance for each variant using subquery
    const stockData = await db.select({
      variantId: stockLedger.variantId,
      balance: sql<string>`MAX(sl.balance)`.mapWith(String),
    })
      .from(stockLedger)
      .leftJoin(variants, eq(stockLedger.variantId, variants.id))
      .where(search 
        ? sql`${variants.sku} ILIKE ${`%${search}%`} OR ${variants.name} ILIKE ${`%${search}%`}`
        : undefined)
      .groupBy(stockLedger.variantId)
      .limit(limitNum)
      .offset(offset);

    // Get total count
    const countResult = await db.select({
      variantId: stockLedger.variantId,
    })
      .from(stockLedger)
      .groupBy(stockLedger.variantId);

    const total = countResult.length;

    // Enrich with variant details
    const enrichedData = await Promise.all(
      stockData.map(async (stock) => {
        const variantRecords = await db.select()
          .from(variants)
          .where(eq(variants.id, stock.variantId))
          .limit(1);
        
        if (variantRecords.length === 0) return null;
        
        const variant = variantRecords[0];
        return {
          variantId: stock.variantId,
          sku: variant.sku,
          name: variant.name,
          currentStock: stock.balance || '0',
          minStock: variant.minStock || '0',
          isLowStock: parseFloat(stock.balance || '0') < parseFloat(variant.minStock || '0'),
        };
      })
    );

    const filteredData = enrichedData.filter(d => d !== null);

    res.json({
      success: true,
      data: filteredData,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// Get stock ledger for a specific variant
router.get('/ledger/:variantId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const movements = await db.select()
      .from(stockLedger)
      .where(eq(stockLedger.variantId, req.params.variantId))
      .orderBy(desc(stockLedger.createdAt))
      .limit(limitNum)
      .offset(offset);

    const countResult = await db.select()
      .from(stockLedger)
      .where(eq(stockLedger.variantId, req.params.variantId));

    res.json({
      success: true,
      data: movements,
      total: countResult.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(countResult.length / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// Get low stock items
router.get('/low-stock', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const stockSummary = await db.select({
      variantId: stockLedger.variantId,
      balance: sql<string>`MAX(sl.balance)`.mapWith(String),
    })
      .from(stockLedger)
      .groupBy(stockLedger.variantId);

    const lowStockItems = [];
    for (const stock of stockSummary) {
      const variantRecords = await db.select()
        .from(variants)
        .where(eq(variants.id, stock.variantId))
        .limit(1);
      
      if (variantRecords.length > 0) {
        const variant = variantRecords[0];
        const currentStock = parseFloat(stock.balance || '0');
        const minStock = parseFloat(variant.minStock || '0');
        
        if (currentStock < minStock) {
          lowStockItems.push({
            variantId: stock.variantId,
            sku: variant.sku,
            name: variant.name,
            currentStock,
            minStock,
            shortage: minStock - currentStock,
          });
        }
      }
    }

    res.json({
      success: true,
      data: lowStockItems,
      total: lowStockItems.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
