import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import './globals.css'
import Providers from './providers'
import Navbar from '@/components/Navbar'

const manrope = Manrope({ subsets: ['latin', 'latin-ext'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.mglsystems.uk'),
  title: {
    default: 'AloSipariş | Yapay Zekâ Telefon Sipariş Asistanı',
    template: '%s | AloSipariş',
  },
  description: 'UK takeaway işletmeleri için telefon siparişini alan, doğrulayan ve termal yazıcıya ileten yapay zekâ sesli asistan.',
  openGraph: {
    title: 'AloSipariş | Telefon siparişini alır, doğrular, yazdırır',
    description: 'Kurulum £0, aylık £9.90 ve kullandığın kadar dakika. UK takeaway işletmeleri için.',
    url: 'https://www.mglsystems.uk',
    siteName: 'AloSipariş by MGL Systems',
    locale: 'tr_TR',
    type: 'website',
  },
  alternates: { canonical: '/' },
}

/**
 * Root Layout Component
 *
 * Main layout wrapper for the entire application.
 * - Provides NextAuth session context via Providers component
 * - Conditionally renders Navbar on authenticated pages (/dashboard routes)
 * - Applies global font configuration and CSS
 *
 * @param children - Child pages and components
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get server session for authentication state
  const session = await auth()

  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={manrope.className}>
        <Providers session={session}>
          {/* Conditionally render Navbar only on authenticated dashboard routes */}
          {session && <Navbar />}
          <main className={session ? 'pt-0' : ''}>{children}</main>
        </Providers>
      </body>
    </html>
  )
}
