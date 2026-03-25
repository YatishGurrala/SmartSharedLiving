'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateRentEntryStatus } from '../actions'

interface RentEntryActionsProps {
    entryId: string
    houseId: string
    currentStatus: string
}

export default function RentEntryActions({ entryId, houseId, currentStatus }: RentEntryActionsProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showOptions, setShowOptions] = useState(false)

    async function handleStatusChange(status: 'paid' | 'waived') {
        setLoading(true)
        const result = await updateRentEntryStatus(entryId, status, houseId)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
        setShowOptions(false)
        router.refresh()
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowOptions(!showOptions)}
                disabled={loading}
                className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
                {loading ? '...' : 'Mark Paid'}
            </button>

            {showOptions && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowOptions(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                        <button
                            onClick={() => handleStatusChange('paid')}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                        >
                            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Mark as Paid
                        </button>
                        <button
                            onClick={() => handleStatusChange('waived')}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                        >
                            <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                            Waive Payment
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
