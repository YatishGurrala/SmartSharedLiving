import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../components/Navbar'
import MessageList from './MessageList'
import NewConversation from './NewConversation'

interface MessagesPageProps {
    searchParams: Promise<{ to?: string; conv?: string }>
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
    const params = await searchParams
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    // Get all unique conversations for this user
    const { data: messages } = await supabase
        .from('messages')
        .select('conversation_id, sender_id, message, created_at')
        .order('created_at', { ascending: false })

    // Filter to conversations involving this user and group by conversation
    const userConversations = messages?.filter(m => 
        m.conversation_id.includes(user.id) || m.sender_id === user.id
    ) || []

    // Get unique conversation IDs
    const conversationIds = [...new Set(userConversations.map(m => m.conversation_id))]

    // Get the latest message for each conversation
    const conversations = conversationIds.map(convId => {
        const msgs = userConversations.filter(m => m.conversation_id === convId)
        const latestMsg = msgs[0]
        
        // Extract other user ID from conversation ID (format: dm_uuid1_uuid2)
        const parts = convId.replace('dm_', '').split('_')
        const otherUserId = parts.find((p: string) => p !== user.id) || parts[0]
        
        return {
            id: convId,
            otherUserId,
            lastMessage: latestMsg?.message,
            lastMessageAt: latestMsg?.created_at
        }
    })

    // Get profile info for other users in conversations
    const otherUserIds = conversations.map(c => c.otherUserId)
    const { data: otherProfiles } = await supabase
        .from('profiles')
        .select('user_id, name, avatar')
        .in('user_id', otherUserIds)

    const conversationsWithProfiles = conversations.map(conv => ({
        ...conv,
        otherUser: otherProfiles?.find(p => p.user_id === conv.otherUserId)
    }))

    // If starting new conversation
    let newConversationUser = null
    if (params.to) {
        const { data } = await supabase
            .from('profiles')
            .select('user_id, name')
            .eq('user_id', params.to)
            .single()
        newConversationUser = data
    }

    // Get messages for selected conversation
    let selectedMessages: any[] = []
    let selectedConversation = null
    if (params.conv) {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', params.conv)
            .order('created_at', { ascending: true })
        selectedMessages = data || []
        selectedConversation = conversationsWithProfiles.find(c => c.id === params.conv)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Messages</h1>
                            <p className="text-sky-100">
                                Chat with potential roommates and house members
                            </p>
                        </div>
                    </div>
                </div>

                {newConversationUser && (
                    <div className="mb-6">
                        <NewConversation 
                            recipientId={newConversationUser.user_id} 
                            recipientName={newConversationUser.name} 
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Conversations List */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-sky-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-bold text-gray-900">Conversations</h3>
                                </div>
                                <span className="px-2 py-1 text-xs font-semibold bg-sky-100 text-sky-700 rounded-full">
                                    {conversationsWithProfiles.length}
                                </span>
                            </div>
                        </div>
                        {conversationsWithProfiles.length === 0 ? (
                            <div className="p-6 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <p className="text-gray-500 text-sm mb-2">No conversations yet</p>
                                <p className="text-xs text-gray-400">Find roommates to start chatting!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {conversationsWithProfiles.map(conv => (
                                    <a
                                        key={conv.id}
                                        href={`/messages?conv=${conv.id}`}
                                        className={`block p-4 hover:bg-sky-50 transition-colors ${
                                            params.conv === conv.id ? 'bg-sky-50 border-l-4 border-sky-500' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-blue-400 flex items-center justify-center text-white font-bold shadow">
                                                {conv.otherUser?.name?.charAt(0) || '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-gray-900 truncate">
                                                    {conv.otherUser?.name || 'Unknown'}
                                                </p>
                                                <p className="text-sm text-gray-500 truncate">
                                                    {conv.lastMessage || 'No messages yet'}
                                                </p>
                                            </div>
                                            {conv.lastMessageAt && (
                                                <span className="text-xs text-gray-400">
                                                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Message Thread */}
                    <div className="md:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col min-h-[500px] overflow-hidden">
                        {params.conv && selectedConversation ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-400 flex items-center justify-center text-white font-bold shadow">
                                        {selectedConversation.otherUser?.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{selectedConversation.otherUser?.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">Direct message</p>
                                    </div>
                                </div>
                                <MessageList
                                    conversationId={params.conv}
                                    messages={selectedMessages}
                                    currentUserId={user.id}
                                    otherUserName={selectedConversation.otherUser?.name || 'Unknown'}
                                />
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <p className="text-lg font-medium text-gray-700 mb-1">No conversation selected</p>
                                <p className="text-sm text-gray-400">Select a conversation to view messages</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
