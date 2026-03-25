'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(conversationId: string, messageText: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    const { error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            message: messageText
        })

    if (error) {
        return { error: 'Could not send message' }
    }

    revalidatePath('/messages')
    return { success: true }
}

export async function startConversation(recipientId: string, messageText: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'Not authenticated' }
    }

    // Create a deterministic conversation ID from both user IDs
    const ids = [user.id, recipientId].sort()
    const conversationId = `dm_${ids[0]}_${ids[1]}`

    const { error } = await supabase
        .from('messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            message: messageText
        })

    if (error) {
        return { error: 'Could not send message' }
    }

    revalidatePath('/messages')
    return { success: true, conversationId }
}
