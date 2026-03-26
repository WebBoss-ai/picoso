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
      <head>
        {/* 🔥 META PIXEL BASE CODE (REQUIRED) */}
        {/* 👉 Replace PIXEL_ID with your actual Meta Pixel ID */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}
              (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');

              fbq('init', '1459876482315093'); // ✅ YOUR PIXEL ID (CHANGE if needed)
              fbq('track', 'PageView');
            `,
          }}
        />

        {/* 🔥 NOSCRIPT FALLBACK (DO NOT REMOVE) */}
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1459876482315093&ev=PageView&noscript=1"
          />
        </noscript>
      </head>

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