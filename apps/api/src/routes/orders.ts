import { Router } from 'express';
import { z } from 'zod';
import { db } from '@hardware-erp/db';
import { 
  orders, orderItems, parties, variants, stockLedger, 
  journalEntries, journalEntryLines, ledgers, paymentAllocations 
} from '@hardware-erp/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const COMPANY_STATE_CODE = process.env.COMPANY_STATE_CODE || '27'; // Default Maharashtra

const orderItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.string(),
  rate: z.string(),
});

const createOrderSchema = z.object({
  type: z.enum(['sales', 'purchase']),
  partyId: z.string().uuid(),
  items: z.array(orderItemSchema),
  remarks: z.string().optional(),
  shippingAddress: z.string().optional(),
});

// Helper function to calculate GST
function calculateGST(gstRate: number, amount: number, partyStateCode: string) {
  const isInterState = partyStateCode !== COMPANY_STATE_CODE;
  
  if (isInterState) {
    // IGST for inter-state
    return {
      cgstRate: 0,
      sgstRate: 0,
      igstRate: gstRate,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: (amount * gstRate) / 100,
    };
  } else {
    // CGST + SGST for intra-state (split equally)
    const halfRate = gstRate / 2;
    const taxAmount = (amount * gstRate) / 100;
    return {
      cgstRate: halfRate,
      sgstRate: halfRate,
      igstRate: 0,
      cgstAmount: taxAmount / 2,
      sgstAmount: taxAmount / 2,
      igstAmount: 0,
    };
  }
}

// Generate unique order number
async function generateOrderNumber(type: 'sales' | 'purchase') {
  const prefix = type === 'sales' ? 'SO' : 'PO';
  const year = new Date().getFullYear().toString().slice(-2);
  
  const lastOrder = await db.select()
    .from(orders)
    .where(eq(orders.type, type))
    .orderBy(desc(orders.orderNumber))
    .limit(1);
  
  let sequence = 1;
  if (lastOrder.length > 0) {
    const match = lastOrder[0].orderNumber.match(new RegExp(`${prefix}-${year}-(\\d+)`));
    if (match) {
      sequence = parseInt(match[1]) + 1;
    }
  }
  
  return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
}

// Create journal entry for order
async function createJournalEntryForOrder(order: any, orderType: 'sales' | 'purchase') {
  const voucherType = orderType === 'sales' ? 'sales' : 'purchase';
  const voucherNumber = orderType === 'sales' 
    ? `JV-S-${order.orderNumber.split('-')[2]}`
    : `JV-P-${order.orderNumber.split('-')[2]}`;
  
  // Get party ledger
  const partyRecords = await db.select().from(parties).where(eq(parties.id, order.partyId));
  const party = partyRecords[0];
  
  const partyLedgerName = orderType === 'sales'
    ? `Sundry Debtors - ${party.name}`
    : `Sundry Creditors - ${party.name}`;
  
  const partyLedgerRecords = await db.select().from(ledgers).where(eq(ledgers.name, partyLedgerName));
  const partyLedger = partyLedgerRecords[0];
  
  // Get sales/purchase ledger
  const mainLedgerName = orderType === 'sales' ? 'Sales Account' : 'Purchase Account';
  const mainLedgerRecords = await db.select().from(ledgers).where(eq(ledgers.name, mainLedgerName));
  const mainLedger = mainLedgerRecords[0];
  
  // Create journal entry
  const [journalEntry] = await db.insert(journalEntries).values({
    voucherNumber,
    voucherType,
    date: new Date(),
    narration: `${orderType === 'sales' ? 'Sale' : 'Purchase'} invoice ${order.orderNumber}`,
    referenceType: 'order',
    referenceId: order.id,
    totalDebit: order.grandTotal,
    totalCredit: order.grandTotal,
  }).returning();
  
  // Create debit entry (Party A/c Dr)
  await db.insert(journalEntryLines).values({
    entryId: journalEntry.id,
    ledgerId: partyLedger.id,
    entryType: 'debit',
    amount: order.grandTotal,
    remarks: `Party account debited for ${order.orderNumber}`,
  });
  
  // Create credit entries (To Sales A/c, To Output Tax A/c)
  await db.insert(journalEntryLines).values({
    entryId: journalEntry.id,
    ledgerId: mainLedger.id,
    entryType: 'credit',
    amount: order.subtotal,
    remarks: 'Sales credited',
  });
  
  // Tax entries
  if (order.cgstAmount && parseFloat(order.cgstAmount) > 0) {
    const taxLedgerName = orderType === 'sales' ? 'Output CGST' : 'Input CGST';
    const taxLedgerRecords = await db.select().from(ledgers).where(eq(ledgers.name, taxLedgerName));
    if (taxLedgerRecords.length > 0) {
      await db.insert(journalEntryLines).values({
        entryId: journalEntry.id,
        ledgerId: taxLedgerRecords[0].id,
        entryType: 'credit',
        amount: order.cgstAmount,
        remarks: 'CGST',
      });
    }
  }
  
  if (order.sgstAmount && parseFloat(order.sgstAmount) > 0) {
    const taxLedgerName = orderType === 'sales' ? 'Output SGST' : 'Input SGST';
    const taxLedgerRecords = await db.select().from(ledgers).where(eq(ledgers.name, taxLedgerName));
    if (taxLedgerRecords.length > 0) {
      await db.insert(journalEntryLines).values({
        entryId: journalEntry.id,
        ledgerId: taxLedgerRecords[0].id,
        entryType: 'credit',
        amount: order.sgstAmount,
        remarks: 'SGST',
      });
    }
  }
  
  if (order.igstAmount && parseFloat(order.igstAmount) > 0) {
    const taxLedgerName = orderType === 'sales' ? 'Output IGST' : 'Input IGST';
    const taxLedgerRecords = await db.select().from(ledgers).where(eq(ledgers.name, taxLedgerName));
    if (taxLedgerRecords.length > 0) {
      await db.insert(journalEntryLines).values({
        entryId: journalEntry.id,
        ledgerId: taxLedgerRecords[0].id,
        entryType: 'credit',
        amount: order.igstAmount,
        remarks: 'IGST',
      });
    }
  }
  
  return journalEntry;
}

// Get all orders
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '20', type, status, partyId } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let conditions = [];
    if (type) conditions.push(eq(orders.type, type as any));
    if (status) conditions.push(eq(orders.status, status as any));
    if (partyId) conditions.push(eq(orders.partyId, partyId as string));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db.select().from(orders).where(whereClause);
    const total = countResult.length;

    const orderList = await db.select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: orderList,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// Get single order with items
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const orderRecords = await db.select().from(orders).where(eq(orders.id, req.params.id));
    
    if (orderRecords.length === 0) {
      throw new AppError('Order not found', 404);
    }

    const order = orderRecords[0];
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    res.json({
      success: true,
      data: { ...order, items },
    });
  } catch (error) {
    next(error);
  }
});

// Create order
router.post('/', authenticate, authorize('admin', 'staff', 'retailer'), async (req: AuthRequest, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);

    // Get party details for GST calculation
    const partyRecords = await db.select().from(parties).where(eq(parties.id, data.partyId));
    if (partyRecords.length === 0) {
      throw new AppError('Party not found', 404);
    }
    const party = partyRecords[0];

    // Generate order number
    const orderNumber = await generateOrderNumber(data.type);

    // Process items and calculate totals
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const itemsData = await Promise.all(
      data.items.map(async (item) => {
        const variantRecords = await db.select().from(variants).where(eq(variants.id, item.variantId));
        if (variantRecords.length === 0) {
          throw new AppError(`Variant not found: ${item.variantId}`, 404);
        }
        const variant = variantRecords[0];

        const lineSubtotal = parseFloat(item.quantity) * parseFloat(item.rate);
        const gstRate = parseFloat(variant.gstRate);
        
        const gst = calculateGST(gstRate, lineSubtotal, party.stateCode);
        
        const lineTotal = lineSubtotal + gst.cgstAmount + gst.sgstAmount + gst.igstAmount;

        subtotal += lineSubtotal;
        totalCgst += gst.cgstAmount;
        totalSgst += gst.sgstAmount;
        totalIgst += gst.igstAmount;

        return {
          variantId: item.variantId,
          quantity: item.quantity,
          dispatchedQty: '0',
          receivedQty: '0',
          rate: item.rate,
          gstRate: variant.gstRate,
          cgstRate: gst.cgstRate.toString(),
          sgstRate: gst.sgstRate.toString(),
          igstRate: gst.igstRate.toString(),
          cgstAmount: gst.cgstAmount.toString(),
          sgstAmount: gst.sgstAmount.toString(),
          igstAmount: gst.igstAmount.toString(),
          subtotal: lineSubtotal.toString(),
          totalAmount: lineTotal.toString(),
        };
      })
    );

    const grandTotal = subtotal + totalCgst + totalSgst + totalIgst;
    const roundOff = Math.round(grandTotal * 100) / 100 - grandTotal;
    const finalGrandTotal = grandTotal + roundOff;

    // Create order
    const [newOrder] = await db.insert(orders).values({
      orderNumber,
      type: data.type,
      status: 'confirmed',
      partyId: data.partyId,
      subtotal: subtotal.toString(),
      cgstAmount: totalCgst.toString(),
      sgstAmount: totalSgst.toString(),
      igstAmount: totalIgst.toString(),
      totalAmount: grandTotal.toString(),
      roundOff: roundOff.toString(),
      grandTotal: finalGrandTotal.toString(),
      remarks: data.remarks,
      shippingAddress: data.shippingAddress,
      createdBy: req.user!.id,
      confirmedAt: new Date(),
    }).returning();

    // Create order items
    await Promise.all(
      itemsData.map((item) =>
        db.insert(orderItems).values({ ...item, orderId: newOrder.id })
      )
    );

    // Update stock for sales orders
    if (data.type === 'sales') {
      for (const item of itemsData) {
        // Get current balance
        const lastStock = await db.select()
          .from(stockLedger)
          .where(eq(stockLedger.variantId, item.variantId))
          .orderBy(desc(stockLedger.createdAt))
          .limit(1);

        const currentBalance = lastStock.length > 0 ? parseFloat(lastStock[0].balance) : 0;
        const newBalance = currentBalance - parseFloat(item.quantity);

        // Create stock ledger entry
        await db.insert(stockLedger).values({
          variantId: item.variantId,
          movementType: 'sale',
          quantity: `-${item.quantity}`,
          balance: newBalance.toString(),
          rate: item.rate,
          amount: item.subtotal,
          referenceType: 'order',
          referenceId: newOrder.id,
          remarks: `Sale in ${newOrder.orderNumber}`,
        });
      }
    } else {
      // Purchase order - increase stock
      for (const item of itemsData) {
        const lastStock = await db.select()
          .from(stockLedger)
          .where(eq(stockLedger.variantId, item.variantId))
          .orderBy(desc(stockLedger.createdAt))
          .limit(1);

        const currentBalance = lastStock.length > 0 ? parseFloat(lastStock[0].balance) : 0;
        const newBalance = currentBalance + parseFloat(item.quantity);

        await db.insert(stockLedger).values({
          variantId: item.variantId,
          movementType: 'purchase',
          quantity: item.quantity,
          balance: newBalance.toString(),
          rate: item.rate,
          amount: item.subtotal,
          referenceType: 'order',
          referenceId: newOrder.id,
          remarks: `Purchase in ${newOrder.orderNumber}`,
        });
      }
    }

    // Create journal entry for accounting
    await createJournalEntryForOrder(newOrder, data.type);

    res.status(201).json({
      success: true,
      data: newOrder,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

export default router;
