'use client'

import { useState, useTransition } from 'react'
import { leaveHouse, deleteHouse } from './actions'

interface DangerZoneProps {
    houseId: string
    isAdmin: boolean
    isCreator: boolean
    memberCount: number
}

export default function DangerZone({ houseId, isAdmin, isCreator, memberCount }: DangerZoneProps) {
    const [isPending, startTransition] = useTransition()
    const [showLeaveModal, setShowLeaveModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deleteConfirmText, setDeleteConfirmText] = useState('')

    const handleLeave = () => {
        setError(null)
        startTransition(async () => {
            const result = await leaveHouse(houseId)
            if (result?.error) {
                setError(result.error)
            }
        })
    }

    const handleDelete = () => {
        if (deleteConfirmText !== 'DELETE') return
        setError(null)
        startTransition(async () => {
            const result = await deleteHouse(houseId)
            if (result?.error) {
                setError(result.error)
            }
        })
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>

            {error && (
                <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                {/* Leave House */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                        <h3 className="font-medium text-gray-900">Leave House</h3>
                        <p className="text-sm text-gray-500">
                            Remove yourself from this house
                        </p>
                        {isAdmin && memberCount > 1 && (
                            <p className="text-xs text-orange-600 mt-1">
                                You must promote another admin before leaving
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowLeaveModal(true)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition font-medium"
                    >
                        Leave
                    </button>
                </div>

                {/* Delete House (Creator only) */}
                {isCreator && (
                    <div className="flex items-center justify-between p-4 border border-red-300 rounded-lg bg-red-50/30">
                        <div>
                            <h3 className="font-medium text-red-700">Delete House</h3>
                            <p className="text-sm text-red-600">
                                Permanently delete this house and all data
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Leave Confirmation Modal */}
            {showLeaveModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Leave House?
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to leave? You will lose access to all house data.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowLeaveModal(false)}
                                disabled={isPending}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLeave}
                                disabled={isPending}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {isPending ? 'Leaving...' : 'Leave House'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-red-600 mb-2">
                            Delete House Permanently
                        </h3>
                        <p className="text-gray-600 mb-4">
                            This action cannot be undone. All house data including agreements, chores, rent cycles, and notices will be permanently deleted.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type <span className="font-mono bg-gray-100 px-1 rounded">DELETE</span> to confirm
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                placeholder="DELETE"
                            />
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => {
                                    setShowDeleteModal(false)
                                    setDeleteConfirmText('')
                                }}
                                disabled={isPending}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isPending || deleteConfirmText !== 'DELETE'}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:bg-red-300"
                            >
                                {isPending ? 'Deleting...' : 'Delete Forever'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
