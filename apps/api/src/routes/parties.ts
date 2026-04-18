import { Router } from 'express';
import { z } from 'zod';
import { db } from '@hardware-erp/db';
import { parties, ledgers } from '@hardware-erp/db/schema';
import { eq, like, or, desc } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const partySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['customer', 'supplier']),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  stateCode: z.string().min(1, 'State code is required'),
  stateName: z.string().min(1, 'State name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  creditDays: z.number().optional(),
  creditLimit: z.string().optional(),
  openingBalance: z.string().optional(),
});

// Get all parties with pagination and search
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '20', search, type, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = undefined;
    if (search) {
      whereClause = or(
        like(parties.name, `%${search}%`),
        like(parties.gstin!, `%${search}%`),
        like(parties.phone!, `%${search}%`),
        like(parties.email!, `%${search}%`)
      );
    }

    if (type) {
      whereClause = whereClause 
        ? or(whereClause, eq(parties.type, type as any))
        : eq(parties.type, type as any);
    }

    // Get total count
    const countResult = await db.select().from(parties).where(whereClause);
    const total = countResult.length;

    // Get parties
    const partyList = await db.select()
      .from(parties)
      .where(whereClause)
      .orderBy(sortOrder === 'desc' ? desc(parties[sortBy as keyof typeof parties]) : parties[sortBy as keyof typeof parties] as any)
      .limit(limitNum)
      .offset(offset);

    res.json({
      success: true,
      data: partyList,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// Get single party
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const partyRecords = await db.select().from(parties).where(eq(parties.id, req.params.id));
    
    if (partyRecords.length === 0) {
      throw new AppError('Party not found', 404);
    }

    res.json({
      success: true,
      data: partyRecords[0],
    });
  } catch (error) {
    next(error);
  }
});

// Create party
router.post('/', authenticate, authorize('admin', 'staff'), async (req: AuthRequest, res, next) => {
  try {
    const data = partySchema.parse(req.body);

    const [newParty] = await db.insert(parties).values(data).returning();

    // Create corresponding ledger
    const ledgerName = data.type === 'customer' 
      ? `Sundry Debtors - ${data.name}`
      : `Sundry Creditors - ${data.name}`;

    await db.insert(ledgers).values({
      name: ledgerName,
      type: data.type === 'customer' ? 'customer' : 'supplier',
      partyId: newParty.id,
      openingBalance: data.openingBalance || '0',
      openingType: data.type === 'customer' ? 'debit' : 'credit',
    });

    res.status(201).json({
      success: true,
      data: newParty,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// Update party
router.put('/:id', authenticate, authorize('admin', 'staff'), async (req: AuthRequest, res, next) => {
  try {
    const data = partySchema.partial().parse(req.body);

    const existingParties = await db.select().from(parties).where(eq(parties.id, req.params.id));
    if (existingParties.length === 0) {
      throw new AppError('Party not found', 404);
    }

    const [updatedParty] = await db.update(parties)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(parties.id, req.params.id))
      .returning();

    res.json({
      success: true,
      data: updatedParty,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

// Delete party (soft delete by deactivating)
router.delete('/:id', authenticate, authorize('admin'), async (req: AuthRequest, res, next) => {
  try {
    const existingParties = await db.select().from(parties).where(eq(parties.id, req.params.id));
    if (existingParties.length === 0) {
      throw new AppError('Party not found', 404);
    }

    await db.update(parties)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(parties.id, req.params.id));

    res.json({
      success: true,
      message: 'Party deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
