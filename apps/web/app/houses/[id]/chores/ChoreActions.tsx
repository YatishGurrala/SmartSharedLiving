'use client'

import { useState } from 'react'
import { completeChore, deleteChore, reassignChore } from './actions'

interface ChoreActionsProps {
    chore: {
        id: string
        status: string
        assigned_to: string | null
    }
    houseId: string
    isAdmin: boolean
    currentUserId: string
    members: Array<{
        user_id: string
        profiles: { name: string } | null
    }>
    showCompleteOnly?: boolean
}

export default function ChoreActions({
    chore,
    houseId,
    isAdmin,
    currentUserId,
    members,
    showCompleteOnly = true
}: ChoreActionsProps) {
    const [loading, setLoading] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [showReassign, setShowReassign] = useState(false)

    const canComplete = isAdmin || chore.assigned_to === currentUserId
    const isPending = chore.status === 'pending'

    const handleComplete = async () => {
        setLoading(true)
        const result = await completeChore(chore.id, houseId)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
        setShowMenu(false)
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this chore?')) return
        setLoading(true)
        const result = await deleteChore(chore.id, houseId)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
        setShowMenu(false)
    }

    const handleReassign = async (newAssignee: string | null) => {
        setLoading(true)
        const result = await reassignChore(chore.id, houseId, newAssignee)
        if (result.error) {
            alert(result.error)
        }
        setLoading(false)
        setShowReassign(false)
        setShowMenu(false)
    }

    if (!canComplete && !isAdmin) {
        return null
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                disabled={loading}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
                {loading ? (
                    <span className="animate-spin">⏳</span>
                ) : (
                    <span>⋮</span>
                )}
            </button>

            {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                    {isPending && canComplete && showCompleteOnly && (
                        <button
                            onClick={handleComplete}
                            className="w-full px-4 py-2 text-left text-green-600 hover:bg-gray-50 rounded-t-lg"
                        >
                            ✓ Mark as Complete
                        </button>
                    )}
                    {isAdmin && (
                        <>
                            <button
                                onClick={() => setShowReassign(true)}
                                className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
                            >
                                ↻ Reassign
                            </button>
                            <button
                                onClick={handleDelete}
                                className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-50 rounded-b-lg"
                            >
                                🗑 Delete
                            </button>
                        </>
                    )}
                </div>
            )}

            {showReassign && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
                    <div className="bg-white rounded-lg p-6 w-80">
                        <h3 className="font-semibold mb-4">Reassign Chore</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleReassign(null)}
                                className={`w-full px-4 py-2 text-left rounded hover:bg-gray-100 ${
                                    chore.assigned_to === null ? 'bg-blue-50 text-blue-600' : ''
                                }`}
                            >
                                Unassigned
                            </button>
                            {members.map((member) => (
                                <button
                                    key={member.user_id}
                                    onClick={() => handleReassign(member.user_id)}
                                    className={`w-full px-4 py-2 text-left rounded hover:bg-gray-100 ${
                                        chore.assigned_to === member.user_id ? 'bg-blue-50 text-blue-600' : ''
                                    }`}
                                >
                                    {member.profiles?.name || 'Unknown'}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowReassign(false)}
                            className="w-full mt-4 px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Click outside to close */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    )
}
