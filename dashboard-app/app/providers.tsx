'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { BusinessProvider } from '@/lib/BusinessContext'

interface ProvidersProps {
  children: ReactNode
  session?: any
}
export default function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <BusinessProvider>
        {children}
      </BusinessProvider>
    </SessionProvider>
  )
}
