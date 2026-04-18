import { Router } from 'express';
import { z } from 'zod';
import { db } from '@hardware-erp/db';
import { ledgers, journalEntries, journalEntryLines } from '@hardware-erp/db/schema';
import { eq, desc, sql, sum } from 'drizzle-orm';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const ledgerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['customer', 'supplier', 'cash', 'bank', 'expense', 'income', 'asset', 'liability', 'capital']),
  partyId: z.string().uuid().optional(),
  openingBalance: z.string().optional(),
  openingType: z.enum(['debit', 'credit']).optional(),
});

// Get all ledgers
router.get('/ledgers', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { type } = req.query;
    
    let whereClause = undefined;
    if (type) {
      whereClause = eq(ledgers.type, type as any);
    }

    const ledgerList = await db.select()
      .from(ledgers)
      .where(whereClause)
      .orderBy(desc(ledgers.createdAt));

    res.json({
      success: true,
      data: ledgerList,
    });
  } catch (error) {
    next(error);
  }
});

// Get ledger balance
router.get('/ledgers/:id/balance', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const ledgerRecords = await db.select().from(ledgers).where(eq(ledgers.id, req.params.id));
    
    if (ledgerRecords.length === 0) {
      throw new AppError('Ledger not found', 404);
    }

    const ledger = ledgerRecords[0];
    
    // Calculate balance from journal entries
    const entries = await db.select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.ledgerId, ledger.id));

    let totalDebit = parseFloat(ledger.openingBalance || '0');
    let totalCredit = 0;

    if (ledger.openingType === 'credit') {
      totalCredit = totalDebit;
      totalDebit = 0;
    }

    for (const entry of entries) {
      if (entry.entryType === 'debit') {
        totalDebit += parseFloat(entry.amount);
      } else {
        totalCredit += parseFloat(entry.amount);
      }
    }

    const balance = totalDebit - totalCredit;
    const balanceType = balance >= 0 ? 'debit' : 'credit';

    res.json({
      success: true,
      data: {
        ledgerId: ledger.id,
        ledgerName: ledger.name,
        openingBalance: ledger.openingBalance,
        openingType: ledger.openingType,
        totalDebit: totalDebit.toString(),
        totalCredit: totalCredit.toString(),
        closingBalance: Math.abs(balance).toString(),
        balanceType,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create journal entry
router.post('/journal', authenticate, authorize('admin', 'staff'), async (req: AuthRequest, res, next) => {
  try {
    const { voucherType, date, narration, lines } = z.object({
      voucherType: z.string(),
      date: z.string().optional(),
      narration: z.string().optional(),
      lines: z.array(z.object({
        ledgerId: z.string().uuid(),
        entryType: z.enum(['debit', 'credit']),
        amount: z.string(),
        remarks: z.string().optional(),
      })),
    }).parse(req.body);

    // Validate debit = credit
    const totalDebit = lines
      .filter(l => l.entryType === 'debit')
      .reduce((sum, l) => sum + parseFloat(l.amount), 0);
    
    const totalCredit = lines
      .filter(l => l.entryType === 'credit')
      .reduce((sum, l) => sum + parseFloat(l.amount), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new AppError('Debit and Credit must be equal', 400);
    }

    // Generate voucher number
    const year = new Date().getFullYear().toString().slice(-2);
    const lastEntry = await db.select()
      .from(journalEntries)
      .orderBy(desc(journalEntries.voucherNumber))
      .limit(1);
    
    let sequence = 1;
    if (lastEntry.length > 0) {
      const match = lastEntry[0].voucherNumber.match(/JV-(\d+)$/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }
    const voucherNumber = `JV-${sequence.toString().padStart(5, '0')}`;

    // Create journal entry
    const [journalEntry] = await db.insert(journalEntries).values({
      voucherNumber,
      voucherType,
      date: date ? new Date(date) : new Date(),
      narration,
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      createdBy: req.user!.id,
    }).returning();

    // Create journal entry lines
    await Promise.all(
      lines.map((line) =>
        db.insert(journalEntryLines).values({
          entryId: journalEntry.id,
          ledgerId: line.ledgerId,
          entryType: line.entryType,
          amount: line.amount,
          remarks: line.remarks,
        })
      )
    );

    res.status(201).json({
      success: true,
      data: journalEntry,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new AppError(error.errors[0].message, 400));
    }
    next(error);
  }
});

export default router;
