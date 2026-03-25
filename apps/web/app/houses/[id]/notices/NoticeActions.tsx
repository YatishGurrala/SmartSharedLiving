'use client'

import { useState } from 'react'
import { acknowledgeNotice, deleteNotice, togglePinNotice } from './actions'

interface NoticeActionsProps {
    notice: {
        id: string
        is_pinned: boolean
        requires_acknowledgement: boolean
    }
    houseId: string
    isAdmin: boolean
    hasAcknowledged: boolean
}

export default function NoticeActions({
    notice,
    houseId,
    isAdmin,
    hasAcknowledged
}: NoticeActionsProps) {
    const [loading, setLoading] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    const handleAcknowledge = async () => {
        setLoading(true)
        const result = await acknowledgeNotice(notice.id, houseId)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
    }

    const handleTogglePin = async () => {
        setLoading(true)
        const result = await togglePinNotice(notice.id, houseId, !notice.is_pinned)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
        setShowMenu(false)
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this notice?')) return
        setLoading(true)
        const result = await deleteNotice(notice.id, houseId)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
        setShowMenu(false)
    }

    return (
        <div className="flex items-center gap-2">
            {/* Acknowledge button for notices that require it */}
            {notice.requires_acknowledgement && !hasAcknowledged && (
                <button
                    onClick={handleAcknowledge}
                    disabled={loading}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? '...' : 'Acknowledge'}
                </button>
            )}

            {/* Acknowledged indicator */}
            {notice.requires_acknowledgement && hasAcknowledged && (
                <span className="text-green-600 text-sm">✓ Acknowledged</span>
            )}

            {/* Admin menu */}
            {isAdmin && (
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        disabled={loading}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                        ⋮
                    </button>

                    {showMenu && (
                        <>
                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border z-10">
                                <button
                                    onClick={handleTogglePin}
                                    className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-t-lg"
                                >
                                    {notice.is_pinned ? 'Unpin' : 'Pin'} Notice
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 rounded-b-lg"
                                >
                                    Delete
                                </button>
                            </div>
                            <div
                                className="fixed inset-0 z-0"
                                onClick={() => setShowMenu(false)}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
