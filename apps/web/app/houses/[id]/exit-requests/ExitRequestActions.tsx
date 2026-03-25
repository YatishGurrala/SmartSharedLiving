'use client'

import { useState } from 'react'
import { approveExitRequest, rejectExitRequest, cancelExitRequest } from './actions'

interface ExitRequestActionsProps {
    request: {
        id: string
        status: string
    }
    houseId: string
    isAdmin: boolean
    isOwnRequest: boolean
}

export default function ExitRequestActions({
    request,
    houseId,
    isAdmin,
    isOwnRequest
}: ExitRequestActionsProps) {
    const [loading, setLoading] = useState(false)

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this exit request? The member will be removed from the house.')) return
        setLoading(true)
        const result = await approveExitRequest(request.id, houseId)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
    }

    const handleReject = async () => {
        if (!confirm('Are you sure you want to reject this exit request?')) return
        setLoading(true)
        const result = await rejectExitRequest(request.id, houseId)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
    }

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel your exit request?')) return
        setLoading(true)
        const result = await cancelExitRequest(request.id, houseId)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
    }

    if (request.status !== 'pending') {
        return null
    }

    if (isOwnRequest) {
        return (
            <button
                onClick={handleCancel}
                disabled={loading}
                className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
                {loading ? 'Canceling...' : 'Cancel Request'}
            </button>
        )
    }

    if (isAdmin) {
        return (
            <div className="flex gap-2">
                <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    {loading ? '...' : 'Approve'}
                </button>
                <button
                    onClick={handleReject}
                    disabled={loading}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                    {loading ? '...' : 'Reject'}
                </button>
            </div>
        )
    }

    return null
}
