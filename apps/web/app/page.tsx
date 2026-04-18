'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUser(data.data.user);
          } else {
            localStorage.removeItem('token');
          }
        })
        .catch(() => localStorage.removeItem('token'));
    }
  }, []);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-indigo-600">Hardware ERP</h1>
            <div className="space-x-4">
              <Link href="/catalog" className="text-gray-600 hover:text-indigo-600">
                Catalog
              </Link>
              {user ? (
                <Link
                  href="/dashboard"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Complete GST-Compliant ERP for Hardware Distributors
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Manage inventory, orders, accounting, and GST reports in one place
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/catalog"
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-indigo-700"
            >
              Browse Catalog
            </Link>
            <Link
              href="/login"
              className="border-2 border-indigo-600 text-indigo-600 px-8 py-3 rounded-lg text-lg hover:bg-indigo-50"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">📦 Inventory Management</h3>
            <p className="text-gray-600">
              Track stock with ledger-based system. Monitor purchases, sales, returns, and adjustments.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">🧾 GST Compliance</h3>
            <p className="text-gray-600">
              Auto-calculate CGST, SGST, IGST. Generate GSTR-1, GSTR-3B reports with HSN codes.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">💰 Double-Entry Accounting</h3>
            <p className="text-gray-600">
              Tally-style ledger system with automatic journal entries from transactions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
