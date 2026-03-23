'use client'

import { useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useVisualAudio } from './VisualAudioProvider'
import { isAdminEmail } from '@/lib/admin'

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
  const isAdmin = isAdminEmail(session?.user?.email)

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
    ...(isAdmin
      ? [{
        href: '/dashboard/admin',
        label: 'Admin',
        description: 'Customer management',
      }]
      : []),
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
      <nav className={`glass-card border-b border-indigo-200/50 dark:border-indigo-700/50 ${className}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <div className="h-6 w-32 skeleton rounded-lg" />
        </div>
      </nav>
    )
  }

  return (
    <nav className={`glass-card border-b border-indigo-200/50 dark:border-indigo-700/50 sticky top-0 z-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
              </div>
              <span className="text-xl font-bold gradient-text hidden sm:block">Takeaway Dashboard</span>
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
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover-lift ${isActiveLink(link.href)
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700 dark:text-indigo-300 shadow-md shadow-indigo-500/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-sm opacity-40" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-lg overflow-hidden">
                  {session?.user?.image ? (
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getUserInitials()
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-white leading-none mb-1">{getDisplayName()}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-none">{session?.user?.email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2"
            >
              {isLoggingOut ? (
                <>
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-red-600 border-r-transparent" />
                  Signing out...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </>
              )}
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 transition-colors"
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
        <div className="md:hidden border-t border-indigo-200/50 dark:border-indigo-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl text-base font-medium transition-all ${isActiveLink(link.href)
                  ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20'
                  }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-indigo-200/50 dark:border-indigo-700/50 pt-3 mt-3">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {getUserInitials()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{getDisplayName()}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/20 rounded-xl transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isLoggingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
