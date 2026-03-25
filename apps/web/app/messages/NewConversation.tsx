'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startConversation } from './actions'

interface NewConversationProps {
    recipientId: string
    recipientName: string
}

export default function NewConversation({ recipientId, recipientName }: NewConversationProps) {
    const [message, setMessage] = useState('')
    const [sending, setSending] = useState(false)
    const router = useRouter()

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!message.trim()) return

        setSending(true)
        const result = await startConversation(recipientId, message)
        
        if (result.success && result.conversationId) {
            router.push(`/messages?conv=${result.conversationId}`)
        }
        setSending(false)
    }

    return (
        <div className="bg-white rounded-xl shadow p-6 mb-6 border border-indigo-100">
            <h3 className="font-semibold text-gray-900 mb-2">
                Start conversation with {recipientName}
            </h3>
            <form onSubmit={handleSend} className="space-y-4">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message..."
                    rows={3}
                    className="w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-3"
                />
                <button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                    {sending ? 'Sending...' : 'Send Message'}
                </button>
            </form>
        </div>
    )
}
