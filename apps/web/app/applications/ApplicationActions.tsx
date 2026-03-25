'use client'

import { useState, useTransition } from 'react'
import { updateApplicationStatus } from './actions'

interface ApplicationActionsProps {
    applicationId: string
}

export default function ApplicationActions({ applicationId }: ApplicationActionsProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [completed, setCompleted] = useState(false)

    const handleAction = (action: 'accept' | 'reject') => {
        setError(null)
        startTransition(async () => {
            try {
                const result = await updateApplicationStatus(applicationId, action === 'accept' ? 'accepted' : 'rejected')
                if (!result.success) {
                    setError(result.error?.message || 'An error occurred')
                } else {
                    setCompleted(true)
                }
            } catch (e) {
                setError('An unexpected error occurred')
            }
        })
    }

    if (completed) {
        return (
            <span className="text-sm text-green-600 font-medium">Updated!</span>
        )
    }

    return (
        <div className="flex items-center gap-2">
            {error && (
                <span className="text-xs text-red-600">{error}</span>
            )}
            <button
                onClick={() => handleAction('accept')}
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
                {isPending ? '...' : '✓ Accept'}
            </button>
            <button
                onClick={() => handleAction('reject')}
                disabled={isPending}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-rose-500 rounded-lg hover:from-red-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
                {isPending ? '...' : '✗ Reject'}
            </button>
        </div>
    )
}
