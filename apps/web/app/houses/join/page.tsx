'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { joinHouseWithCode } from '../actions'
import Navbar from '@/app/components/Navbar'

export default function JoinHousePage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const codeFromUrl = searchParams.get('code') || ''
    
    const [inviteCode, setInviteCode] = useState(codeFromUrl)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleJoin(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const result = await joinHouseWithCode(inviteCode.trim())
            
            if (result.error) {
                if (result.redirect) {
                    router.push(result.redirect)
                    return
                }
                setError(result.error)
                // If already a member, redirect to house
                if (result.houseId) {
                    setTimeout(() => router.push(`/houses/${result.houseId}`), 1500)
                }
            } else if (result.success && result.houseId) {
                router.push(`/houses/${result.houseId}`)
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName="Guest" />
            
            <main className="max-w-md mx-auto py-12 px-4">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Join a House</h1>
                        <p className="text-gray-600 mt-2">
                            Enter the invite code shared by your house admin
                        </p>
                    </div>

                    <form onSubmit={handleJoin} className="space-y-6">
                        <div>
                            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
                                Invite Code
                            </label>
                            <input
                                id="inviteCode"
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                placeholder="Enter invite code"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-center text-lg font-mono tracking-widest"
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !inviteCode.trim()}
                            className="w-full py-3 px-4 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Joining...
                                </span>
                            ) : (
                                'Join House'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                        <p className="text-sm text-gray-500">
                            Don't have an invite code?
                        </p>
                        <a href="/houses/create" className="text-teal-600 hover:text-teal-700 font-medium text-sm">
                            Create your own house
                        </a>
                    </div>
                </div>
            </main>
        </div>
    )
}
