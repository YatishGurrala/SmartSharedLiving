'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

interface RoomsFilterProps {
    cities: string[]
    currentFilters: {
        city?: string
        minRent?: string
        maxRent?: string
    }
}

export default function RoomsFilter({ cities, currentFilters }: RoomsFilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()
    
    const [city, setCity] = useState(currentFilters.city || '')
    const [minRent, setMinRent] = useState(currentFilters.minRent || '')
    const [maxRent, setMaxRent] = useState(currentFilters.maxRent || '')

    const applyFilters = () => {
        startTransition(() => {
            const params = new URLSearchParams()
            if (city) params.set('city', city)
            if (minRent) params.set('minRent', minRent)
            if (maxRent) params.set('maxRent', maxRent)
            router.push(`/rooms?${params.toString()}`)
        })
    }

    const clearFilters = () => {
        setCity('')
        setMinRent('')
        setMaxRent('')
        startTransition(() => {
            router.push('/rooms')
        })
    }

    const hasFilters = city || minRent || maxRent

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* City Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                    </label>
                    <div className="relative">
                        <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        >
                            <option value="">All Cities</option>
                            {cities.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {/* Min Rent */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Rent
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                            type="number"
                            value={minRent}
                            onChange={(e) => setMinRent(e.target.value)}
                            placeholder="0"
                            min="0"
                            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* Max Rent */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Rent
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                        <input
                            type="number"
                            value={maxRent}
                            onChange={(e) => setMaxRent(e.target.value)}
                            placeholder="5000"
                            min="0"
                            className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-end gap-2">
                    <button
                        onClick={applyFilters}
                        disabled={isPending}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        {isPending ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        )}
                        Search
                    </button>
                    {hasFilters && (
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
