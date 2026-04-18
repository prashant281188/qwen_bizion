import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import * as schema from '../schema';
import { users, parties, categories, products, variants, ledgers } from '../schema';

async function seed() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hardware_erp';
  
  console.log('Connecting to database...');
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    email: 'admin@hardware.com',
    passwordHash: adminPassword,
    name: 'Admin User',
    role: 'admin',
  });

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 10);
  await db.insert(users).values({
    email: 'staff@hardware.com',
    passwordHash: staffPassword,
    name: 'Staff User',
    role: 'staff',
  });

  // Create a retailer party
  const [retailerParty] = await db.insert(parties).values({
    name: 'Sharma Hardware Store',
    type: 'customer',
    gstin: '27AABCU9603R1ZM',
    pan: 'AABCU9603R',
    stateCode: '27', // Maharashtra
    stateName: 'Maharashtra',
    address: '123 Main Market, Mumbai',
    city: 'Mumbai',
    pincode: '400001',
    phone: '9876543210',
    email: 'sharma@hardware.com',
    creditDays: 30,
    creditLimit: '100000.00',
    openingBalance: '0.00',
  }).returning();

  // Create retailer user linked to party
  const retailerPassword = await bcrypt.hash('retailer123', 10);
  await db.insert(users).values({
    email: 'retailer@hardware.com',
    passwordHash: retailerPassword,
    name: 'Rajesh Sharma',
    role: 'retailer',
    partyId: retailerParty.id,
  });

  // Create supplier party
  await db.insert(parties).values({
    name: 'Bharat Tools Pvt Ltd',
    type: 'supplier',
    gstin: '24AABCB1234C1Z5',
    pan: 'AABCB1234C',
    stateCode: '24', // Gujarat
    stateName: 'Gujarat',
    address: '456 Industrial Area, Ahmedabad',
    city: 'Ahmedabad',
    pincode: '380001',
    phone: '9123456789',
    email: 'sales@bharattools.com',
    creditDays: 15,
  });

  // Create categories
  const [toolsCat, fastenersCat, electricalCat] = await db.insert(categories).values([
    { name: 'Hand Tools', description: 'Manual hand tools for construction and repair' },
    { name: 'Fasteners', description: 'Nuts, bolts, screws, and washers' },
    { name: 'Electrical', description: 'Electrical components and accessories' },
  ]).returning();

  // Create products
  const [hammerProd, screwdriverProd, boltProd, wireProd] = await db.insert(products).values([
    { name: 'Claw Hammer', categoryId: toolsCat.id, hsnCode: '8205', baseUnit: 'PCS', description: 'Professional claw hammer with wooden handle' },
    { name: 'Screwdriver Set', categoryId: toolsCat.id, hsnCode: '8205', baseUnit: 'SET', description: '6-piece screwdriver set' },
    { name: 'Hex Bolt', categoryId: fastenersCat.id, hsnCode: '7318', baseUnit: 'PCS', description: 'High-tensile hex bolts' },
    { name: 'Copper Wire', categoryId: electricalCat.id, hsnCode: '8544', baseUnit: 'MTR', description: 'Single core copper wire' },
  ]).returning();

  // Create variants
  await db.insert(variants).values([
    { productId: hammerProd.id, sku: 'HAM-001', name: 'Claw Hammer 500g', mrp: '450.00', purchaseRate: '250.00', gstRate: '18.00', minStock: '10' },
    { productId: hammerProd.id, sku: 'HAM-002', name: 'Claw Hammer 750g', mrp: '550.00', purchaseRate: '300.00', gstRate: '18.00', minStock: '10' },
    { productId: screwdriverProd.id, sku: 'SCR-SET-01', name: 'Screwdriver Set 6pcs', mrp: '350.00', purchaseRate: '180.00', gstRate: '18.00', minStock: '20' },
    { productId: boltProd.id, sku: 'BOLT-M8-50', name: 'Hex Bolt M8x50mm', mrp: '15.00', purchaseRate: '8.00', gstRate: '18.00', minStock: '500' },
    { productId: boltProd.id, sku: 'BOLT-M10-50', name: 'Hex Bolt M10x50mm', mrp: '20.00', purchaseRate: '12.00', gstRate: '18.00', minStock: '500' },
    { productId: wireProd.id, sku: 'WIRE-1MM-RED', name: 'Copper Wire 1mm Red', mrp: '25.00', purchaseRate: '15.00', gstRate: '18.00', minStock: '1000' },
    { productId: wireProd.id, sku: 'WIRE-1MM-BLK', name: 'Copper Wire 1mm Black', mrp: '25.00', purchaseRate: '15.00', gstRate: '18.00', minStock: '1000' },
  ]);

  // Create accounting ledgers
  await db.insert(ledgers).values([
    { name: 'Cash Account', type: 'cash', openingBalance: '50000.00', openingType: 'debit' },
    { name: 'HDFC Bank', type: 'bank', openingBalance: '200000.00', openingType: 'debit' },
    { name: 'Sales Account', type: 'income', openingBalance: '0.00' },
    { name: 'Purchase Account', type: 'expense', openingBalance: '0.00' },
    { name: 'Input CGST', type: 'asset', openingBalance: '0.00' },
    { name: 'Input SGST', type: 'asset', openingBalance: '0.00' },
    { name: 'Input IGST', type: 'asset', openingBalance: '0.00' },
    { name: 'Output CGST', type: 'liability', openingBalance: '0.00' },
    { name: 'Output SGST', type: 'liability', openingBalance: '0.00' },
    { name: 'Output IGST', type: 'liability', openingBalance: '0.00' },
  ]);

  // Create ledger for the retailer
  await db.insert(ledgers).values({
    name: `Sundry Debtors - ${retailerParty.name}`,
    type: 'customer',
    partyId: retailerParty.id,
    openingBalance: '0.00',
    openingType: 'debit',
  });

  console.log('Seeding completed successfully!');
  console.log('\nDefault credentials:');
  console.log('Admin: admin@hardware.com / admin123');
  console.log('Staff: staff@hardware.com / staff123');
  console.log('Retailer: retailer@hardware.com / retailer123');
  
  await client.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
