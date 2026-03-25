'use client'

import { useState } from 'react'
import { sendMessage } from './actions'

interface Message {
    id: string
    conversation_id: string
    sender_id: string
    message: string
    created_at: string
}

interface MessageListProps {
    conversationId: string
    messages: Message[]
    currentUserId: string
    otherUserName: string
}

export default function MessageList({ conversationId, messages, currentUserId, otherUserName }: MessageListProps) {
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        setSending(true)
        await sendMessage(conversationId, newMessage)
        setNewMessage('')
        setSending(false)
    }

    return (
        <>
            {/* Header */}
            <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900">{otherUserName}</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                msg.sender_id === currentUserId
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                            }`}
                        >
                            <p>{msg.message}</p>
                            <p className={`text-xs mt-1 ${
                                msg.sender_id === currentUserId ? 'text-indigo-200' : 'text-gray-500'
                            }`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t">
                <div className="flex gap-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-3"
                    />
                    <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </form>
        </>
    )
}
