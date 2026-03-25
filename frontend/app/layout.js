import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/AuthContext';
import ClientShell from '@/components/ClientShell';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'Picoso — Healthy Food Delivered',
  description: 'Fresh, healthy, and delicious PF Meals, Snacks, Desserts and Beverages delivered in 30 minutes.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CartProvider>
            <ClientShell>
              {children}
            </ClientShell>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
