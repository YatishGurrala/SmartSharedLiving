'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signout } from '../auth/login/actions'

interface NavbarProps {
    userName: string
}

export default function Navbar({ userName }: NavbarProps) {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navItems = [
        { href: '/rooms', label: 'Discover' },
        { href: '/roommates', label: 'Roommates' },
        { href: '/houses', label: 'Houses' },
        { href: '/listings', label: 'My Listings' },
        { href: '/applications', label: 'Applications' },
        { href: '/messages', label: 'Messages' },
    ]

    return (
        <nav className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center gap-8">
                        <Link href="/rooms" className="text-xl font-bold text-indigo-600">
                            SmartShared
                        </Link>
                        <div className="hidden lg:flex items-center gap-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        pathname === item.href || pathname.startsWith(item.href + '/')
                                            ? 'text-indigo-600 bg-indigo-50'
                                            : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/profile" 
                            className="hidden sm:flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-indigo-600"
                        >
                            <span className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                                {userName.charAt(0).toUpperCase()}
                            </span>
                            <span className="hidden md:inline">{userName}</span>
                        </Link>
                        <form action={signout}>
                            <button className="text-sm text-red-600 hover:text-red-800 font-medium">
                                Log out
                            </button>
                        </form>
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {mobileMenuOpen ? (
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
            {mobileMenuOpen && (
                <div className="lg:hidden border-t">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-3 py-2 rounded-md text-base font-medium ${
                                    pathname === item.href || pathname.startsWith(item.href + '/')
                                        ? 'text-indigo-600 bg-indigo-50'
                                        : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                        <Link
                            href="/profile"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50"
                        >
                            Profile
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    )
}
