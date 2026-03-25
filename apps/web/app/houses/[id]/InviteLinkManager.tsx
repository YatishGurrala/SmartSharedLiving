'use client'

import { useState, useEffect } from 'react'
import { createInviteLink, getHouseInvites, deleteInvite } from '../actions'

interface Invite {
    id: string
    invite_code: string
    max_uses: number
    uses: number
    expires_at: string | null
    created_at: string
}

interface InviteLinkManagerProps {
    houseId: string
    isAdmin: boolean
}

export default function InviteLinkManager({ houseId, isAdmin }: InviteLinkManagerProps) {
    const [invites, setInvites] = useState<Invite[]>([])
    const [loading, setLoading] = useState(false)
    const [creating, setCreating] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [maxUses, setMaxUses] = useState(10)
    const [expiresDays, setExpiresDays] = useState(7)

    useEffect(() => {
        loadInvites()
    }, [houseId])

    async function loadInvites() {
        setLoading(true)
        const result = await getHouseInvites(houseId)
        setInvites(result.invites || [])
        setLoading(false)
    }

    async function handleCreateInvite() {
        setCreating(true)
        const result = await createInviteLink(houseId, { maxUses, expiresDays })
        if (result.invite) {
            setInvites([result.invite, ...invites])
            setShowCreateForm(false)
        }
        setCreating(false)
    }

    async function handleDeleteInvite(inviteId: string) {
        const result = await deleteInvite(inviteId, houseId)
        if (result.success) {
            setInvites(invites.filter(i => i.id !== inviteId))
        }
    }

    function copyInviteLink(code: string) {
        const link = `${window.location.origin}/houses/join?code=${code}`
        navigator.clipboard.writeText(link)
        setCopied(code)
        setTimeout(() => setCopied(null), 2000)
    }

    if (!isAdmin) {
        return null
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Invite Links</h3>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="text-sm px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    + New Invite
                </button>
            </div>

            {showCreateForm && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Uses
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={maxUses}
                                onChange={(e) => setMaxUses(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Expires In (days)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="30"
                                value={expiresDays}
                                onChange={(e) => setExpiresDays(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateInvite}
                            disabled={creating}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"
                        >
                            {creating ? 'Creating...' : 'Create Invite'}
                        </button>
                        <button
                            onClick={() => setShowCreateForm(false)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
            ) : invites.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <p>No active invites</p>
                    <p className="text-sm">Create an invite link to share with potential members</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {invites.map((invite) => {
                        const isExpired = invite.expires_at && new Date(invite.expires_at) < new Date()
                        const isExhausted = invite.uses >= invite.max_uses
                        const isActive = !isExpired && !isExhausted

                        return (
                            <div
                                key={invite.id}
                                className={`p-3 rounded-lg border ${isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                            {invite.invite_code}
                                        </code>
                                        <span className="text-sm text-gray-500">
                                            {invite.uses}/{invite.max_uses} uses
                                        </span>
                                        {isExpired && (
                                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                Expired
                                            </span>
                                        )}
                                        {isExhausted && !isExpired && (
                                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                                Limit reached
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isActive && (
                                            <button
                                                onClick={() => copyInviteLink(invite.invite_code)}
                                                className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                            >
                                                {copied === invite.invite_code ? '✓ Copied!' : 'Copy Link'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteInvite(invite.id)}
                                            className="text-sm px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                                {invite.expires_at && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        Expires: {new Date(invite.expires_at).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
