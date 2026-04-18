import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '@hardware-erp/db';
import { users, parties } from '@hardware-erp/db/schema';
import { eq, and } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name is required'),
  role: z.enum(['admin', 'staff', 'retailer']).optional(),
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const userRecords = await db.select().from(users).where(eq(users.email, email));
    
    if (userRecords.length === 0) {
      throw new AppError('Invalid credentials', 401);
    }

    const user = userRecords[0];

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        partyId: user.partyId,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          partyId: user.partyId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Register (Admin only in production)
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role = 'staff' } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    if (existingUsers.length > 0) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      name,
      role,
    }).returning();

    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        partyId: newUser.partyId,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          partyId: newUser.partyId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const userRecords = await db.select().from(users).where(eq(users.id, req.user!.id));
    
    if (userRecords.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userRecords[0];
    
    let party = null;
    if (user.partyId) {
      const partyRecords = await db.select().from(parties).where(eq(parties.id, user.partyId));
      party = partyRecords[0] || null;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          partyId: user.partyId,
          isActive: user.isActive,
        },
        party,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
