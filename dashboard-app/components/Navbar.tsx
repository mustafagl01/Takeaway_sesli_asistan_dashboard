'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useVisualAudio } from './VisualAudioProvider'

/**
 * Navigation link definition
 */
interface NavLink {
  href: string
  label: string
  description?: string
}

/**
 * Navbar Props
 */
export interface NavbarProps {
  className?: string
}

/**
 * Navbar Component
 *
 * Main navigation bar for the dashboard application.
 */
export default function Navbar({ className = '' }: NavbarProps) {
  const { data: session, status } = useSession()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { playClick, playHover } = useVisualAudio()

  const navLinks: NavLink[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      description: 'Overview and metrics',
    },
    {
      href: '/dashboard/calls',
      label: 'Calls',
      description: 'Phone call history',
    },
    {
      href: '/dashboard/analytics',
      label: 'Analytics',
      description: 'Performance insights',
    },
    {
      href: '/dashboard/billing',
      label: 'Billing',
      description: 'Manage subscriptions',
    },
    {
      href: '/dashboard/profile',
      label: 'Profile',
      description: 'Account settings',
    },
  ]

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await signOut({
        callbackUrl: '/',
        redirect: true,
      })
    } catch (error) {
      setIsLoggingOut(false)
    }
  }

  const getDisplayName = (): string => {
    if (!session?.user) return 'Loading...'
    if (session.user.name) return session.user.name
    if (session.user.email) return session.user.email.split('@')[0]
    return 'User'
  }

  const getUserInitials = (): string => {
    const displayName = getDisplayName()
    return displayName
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  const isActiveLink = (href: string): boolean => {
    if (typeof window === 'undefined') return false
    const pathname = window.location.pathname
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  if (status === 'loading') {
    return (
      <nav className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        </div>
      </nav>
    )
  }

  return (
    <nav className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white hidden sm:block">Takeaway Dashboard</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onMouseEnter={playHover}
                onClick={playClick}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover-lift ${isActiveLink(link.href)
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden">
                {session?.user?.image ? (
                  <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  getUserInitials()
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-white leading-none mb-1">{getDisplayName()}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-none">{session?.user?.email}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">
              {isLoggingOut ? '...' : 'Sign out'}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${isActiveLink(link.href) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  )
}
