'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createApplication } from '@/app/applications/actions'

interface ApplyButtonProps {
    listingId: string
}

export default function ApplyButton({ listingId }: ApplyButtonProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleApply = () => {
        setError(null)
        startTransition(async () => {
            const result = await createApplication({
                targetId: listingId,
                targetType: 'listing',
            })

            if (result.success) {
                setSuccess(true)
                router.refresh()
            } else {
                setError(result.error?.message || 'Failed to submit application')
            }
        })
    }

    if (success) {
        return (
            <div className="text-center">
                <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="font-medium text-gray-900">Application Sent!</p>
                <p className="text-sm text-gray-500 mt-1">The host will review your application soon.</p>
            </div>
        )
    }

    return (
        <div>
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                    {error}
                </div>
            )}
            <button
                onClick={handleApply}
                disabled={isPending}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
                {isPending ? (
                    <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Submitting...
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Apply for this Room
                    </>
                )}
            </button>
        </div>
    )
}
