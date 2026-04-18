import { Router } from 'express';
import { db } from '@hardware-erp/db';
import { journalEntries, journalEntryLines, ledgers, orders, stockLedger, variants } from '@hardware-erp/db/schema';
import { eq, sql, sum } from 'drizzle-orm';
import { authenticate, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Trial Balance Report
router.get('/trial-balance', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const ledgersList = await db.select().from(ledgers);
    
    const trialBalance = [];
    
    for (const ledger of ledgersList) {
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

      if (totalDebit !== 0 || totalCredit !== 0) {
        trialBalance.push({
          ledgerId: ledger.id,
          ledgerName: ledger.name,
          ledgerType: ledger.type,
          debit: totalDebit.toString(),
          credit: totalCredit.toString(),
        });
      }
    }

    const totalDebitSum = trialBalance.reduce((sum, item) => sum + parseFloat(item.debit), 0);
    const totalCreditSum = trialBalance.reduce((sum, item) => sum + parseFloat(item.credit), 0);

    res.json({
      success: true,
      data: {
        items: trialBalance,
        totalDebit: totalDebitSum.toString(),
        totalCredit: totalCreditSum.toString(),
        isBalanced: Math.abs(totalDebitSum - totalCreditSum) < 0.01,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Profit & Loss Report
router.get('/profit-loss', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Get all income and expense ledgers
    const incomeLedgers = await db.select().from(ledgers).where(eq(ledgers.type, 'income'));
    const expenseLedgers = await db.select().from(ledgers).where(eq(ledgers.type, 'expense'));

    let totalIncome = 0;
    let totalExpense = 0;

    // Calculate income
    for (const ledger of incomeLedgers) {
      const entries = await db.select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.ledgerId, ledger.id));
      
      for (const entry of entries) {
        if (entry.entryType === 'credit') {
          totalIncome += parseFloat(entry.amount);
        } else {
          totalIncome -= parseFloat(entry.amount);
        }
      }
    }

    // Calculate expenses
    for (const ledger of expenseLedgers) {
      const entries = await db.select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.ledgerId, ledger.id));
      
      for (const entry of entries) {
        if (entry.entryType === 'debit') {
          totalExpense += parseFloat(entry.amount);
        } else {
          totalExpense -= parseFloat(entry.amount);
        }
      }
    }

    const netProfit = totalIncome - totalExpense;

    res.json({
      success: true,
      data: {
        income: {
          total: totalIncome.toString(),
          items: incomeLedgers.map(l => ({ name: l.name, amount: '0' })), // Simplified
        },
        expense: {
          total: totalExpense.toString(),
          items: expenseLedgers.map(l => ({ name: l.name, amount: '0' })), // Simplified
        },
        netProfit: netProfit.toString(),
        isProfit: netProfit >= 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Balance Sheet Report
router.get('/balance-sheet', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const assetLedgers = await db.select().from(ledgers).where(eq(ledgers.type, 'asset'));
    const liabilityLedgers = await db.select().from(ledgers).where(eq(ledgers.type, 'liability'));
    const capitalLedgers = await db.select().from(ledgers).where(eq(ledgers.type, 'capital'));

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalCapital = 0;

    // Calculate assets (debit balance)
    for (const ledger of assetLedgers) {
      const entries = await db.select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.ledgerId, ledger.id));
      
      let balance = parseFloat(ledger.openingBalance || '0');
      if (ledger.openingType === 'credit') balance = -balance;

      for (const entry of entries) {
        if (entry.entryType === 'debit') {
          balance += parseFloat(entry.amount);
        } else {
          balance -= parseFloat(entry.amount);
        }
      }
      totalAssets += balance;
    }

    // Calculate liabilities (credit balance)
    for (const ledger of liabilityLedgers) {
      const entries = await db.select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.ledgerId, ledger.id));
      
      let balance = parseFloat(ledger.openingBalance || '0');
      if (ledger.openingType === 'debit') balance = -balance;

      for (const entry of entries) {
        if (entry.entryType === 'credit') {
          balance += parseFloat(entry.amount);
        } else {
          balance -= parseFloat(entry.amount);
        }
      }
      totalLiabilities += balance;
    }

    // Calculate capital
    for (const ledger of capitalLedgers) {
      const entries = await db.select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.ledgerId, ledger.id));
      
      let balance = parseFloat(ledger.openingBalance || '0');
      if (ledger.openingType === 'debit') balance = -balance;

      for (const entry of entries) {
        if (entry.entryType === 'credit') {
          balance += parseFloat(entry.amount);
        } else {
          balance -= parseFloat(entry.amount);
        }
      }
      totalCapital += balance;
    }

    // Add current year profit to capital
    const profitLossRes = await fetch('http://localhost:' + (process.env.PORT || 3001) + '/api/reports/profit-loss', {
      headers: { Authorization: req.headers.authorization! }
    }).then(r => r.json()).catch(() => null);
    
    if (profitLossRes?.data?.netProfit) {
      totalCapital += parseFloat(profitLossRes.data.netProfit);
    }

    res.json({
      success: true,
      data: {
        assets: {
          total: totalAssets.toString(),
          items: assetLedgers.map(l => ({ name: l.name })),
        },
        liabilities: {
          total: totalLiabilities.toString(),
          items: liabilityLedgers.map(l => ({ name: l.name })),
        },
        capital: {
          total: totalCapital.toString(),
          items: capitalLedgers.map(l => ({ name: l.name })),
        },
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalCapital)) < 1,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GSTR-1 Report (Sales Register)
router.get('/gstr-1', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { month, year } = req.query;
    
    let whereCondition = eq(orders.type, 'sales');
    
    // Filter by date range if provided
    if (month && year) {
      const startDate = new Date(`${year}-${month.toString().padStart(2, '0')}-01`);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      
      whereCondition = sql`${orders.type} = 'sales' AND ${orders.orderDate} >= ${startDate} AND ${orders.orderDate} < ${endDate}`;
    }

    const salesOrders = await db.select()
      .from(orders)
      .where(whereCondition as any)
      .orderBy(orders.orderDate);

    const gstr1Data = salesOrders.map(order => ({
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      partyId: order.partyId,
      subtotal: order.subtotal,
      cgstAmount: order.cgstAmount,
      sgstAmount: order.sgstAmount,
      igstAmount: order.igstAmount,
      grandTotal: order.grandTotal,
    }));

    const totals = {
      totalSubtotal: salesOrders.reduce((sum, o) => sum + parseFloat(o.subtotal), 0),
      totalCgst: salesOrders.reduce((sum, o) => sum + parseFloat(o.cgstAmount || '0'), 0),
      totalSgst: salesOrders.reduce((sum, o) => sum + parseFloat(o.sgstAmount || '0'), 0),
      totalIgst: salesOrders.reduce((sum, o) => sum + parseFloat(o.igstAmount || '0'), 0),
      totalGrandTotal: salesOrders.reduce((sum, o) => sum + parseFloat(o.grandTotal), 0),
    };

    res.json({
      success: true,
      data: {
        items: gstr1Data,
        totals,
        period: month && year ? `${month}/${year}` : 'All',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Ledger Report (Party-wise)
router.get('/ledger/:partyId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const partyLedger = await db.select()
      .from(ledgers)
      .where(eq(ledgers.partyId, req.params.partyId))
      .limit(1);

    if (partyLedger.length === 0) {
      throw new AppError('Party ledger not found', 404);
    }

    const ledger = partyLedger[0];
    
    // Get all journal entries for this ledger
    const entries = await db.select({
      entry: journalEntries,
      line: journalEntryLines,
    })
      .from(journalEntryLines)
      .leftJoin(journalEntries, eq(journalEntryLines.entryId, journalEntries.id))
      .where(eq(journalEntryLines.ledgerId, ledger.id))
      .orderBy(journalEntries.date);

    let balance = parseFloat(ledger.openingBalance || '0');
    if (ledger.openingType === 'credit') balance = -balance;

    const transactions = entries.map(e => {
      if (e.line!.entryType === 'debit') {
        balance += parseFloat(e.line!.amount);
      } else {
        balance -= parseFloat(e.line!.amount);
      }
      
      return {
        date: e.entry?.date,
        voucherNumber: e.entry?.voucherNumber,
        voucherType: e.entry?.voucherType,
        narration: e.entry?.narration,
        debit: e.line!.entryType === 'debit' ? e.line!.amount : '0',
        credit: e.line!.entryType === 'credit' ? e.line!.amount : '0',
        balance: balance.toString(),
      };
    });

    res.json({
      success: true,
      data: {
        ledgerName: ledger.name,
        openingBalance: ledger.openingBalance,
        openingType: ledger.openingType,
        closingBalance: balance.toString(),
        transactions,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
