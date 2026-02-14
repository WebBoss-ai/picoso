import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Picoso - Premium Healthy Bowl Shop',
  description: 'Order nutritious, delicious custom bowls made fresh with premium ingredients. Perfect for fitness enthusiasts and health-conscious eaters.',
  keywords: 'healthy bowls, nutrition, fitness food, custom bowls, protein bowls, healthy eating',
  openGraph: {
    title: 'Picoso - Premium Healthy Bowl Shop',
    description: 'Order nutritious, delicious custom bowls made fresh with premium ingredients.',
    type: 'website',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
