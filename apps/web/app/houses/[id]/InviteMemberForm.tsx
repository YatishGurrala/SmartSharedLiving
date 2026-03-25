'use client'

import { useState } from 'react'
import { inviteMember } from '../actions'

interface InviteMemberFormProps {
    houseId: string
}

export default function InviteMemberForm({ houseId }: InviteMemberFormProps) {
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const result = await inviteMember(houseId, email)

        if (result.error) {
            setMessage({ type: 'error', text: result.error })
        } else {
            setMessage({ type: 'success', text: 'Member invited successfully!' })
            setEmail('')
        }

        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {message && (
                <div className={`p-3 rounded-md text-sm ${
                    message.type === 'success' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                }`}>
                    {message.text}
                </div>
            )}
            <div className="flex gap-3">
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter member's email"
                    required
                    className="flex-1 rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-3"
                />
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Inviting...' : 'Invite'}
                </button>
            </div>
            <p className="text-sm text-gray-500">
                The user must have an account on Smart Shared Living to be invited.
            </p>
        </form>
    )
}
