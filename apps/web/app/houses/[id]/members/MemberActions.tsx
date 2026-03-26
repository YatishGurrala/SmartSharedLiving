'use client'

import { useState, useTransition } from 'react'
import { removeMember, updateMemberRole } from './actions'

interface MemberActionsProps {
    memberId: string
    houseId: string
    currentRole: string
    memberName: string
}

export default function MemberActions({ memberId, houseId, currentRole, memberName }: MemberActionsProps) {
    const [isPending, startTransition] = useTransition()
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleRoleChange = () => {
        setError(null)
        const newRole = currentRole === 'admin' ? 'member' : 'admin'
        startTransition(async () => {
            const result = await updateMemberRole(memberId, houseId, newRole)
            if (result.error) {
                setError(result.error)
            }
        })
    }

    const handleRemove = () => {
        setError(null)
        startTransition(async () => {
            const result = await removeMember(memberId, houseId)
            if (result.error) {
                setError(result.error)
            }
            setShowConfirm(false)
        })
    }

    return (
        <div className="relative">
            <div className="flex items-center space-x-2">
                {/* Role Toggle */}
                <button
                    onClick={handleRoleChange}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                >
                    {currentRole === 'admin' ? 'Demote' : 'Promote'}
                </button>

                {/* Remove Button */}
                <button
                    onClick={() => setShowConfirm(true)}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                >
                    Remove
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <p className="absolute right-0 mt-1 text-xs text-red-600 whitespace-nowrap">
                    {error}
                </p>
            )}

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Remove Member
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to remove {memberName} from the house? They will lose access to all house data.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={isPending}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRemove}
                                disabled={isPending}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                            >
                                {isPending ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
