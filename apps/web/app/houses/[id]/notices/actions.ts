'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { 
    ActionErrors, 
    validateRequired, 
    validateMaxLength,
    getFormString,
    getFormBoolean,
    formatSupabaseError 
} from '@/lib/action-utils'
import { trackServerEvent } from '@/lib/analytics'

export async function createNotice(houseId: string, formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Validate input
        const title = getFormString(formData, 'title')
        const content = getFormString(formData, 'content')
        
        const titleError = validateRequired(title, 'Title') || validateMaxLength(title, 200, 'Title')
        if (titleError) return { error: titleError }
        
        const contentError = validateRequired(content, 'Content')
        if (contentError) return { error: contentError }

        // Check if user is admin
        const { data: membership } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        if (membership.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        const isPinned = getFormBoolean(formData, 'is_pinned')
        const requiresAck = getFormBoolean(formData, 'requires_acknowledgement')

        const { data: notice, error } = await supabase
            .from('notices')
            .insert({
                house_id: houseId,
                title,
                content,
                is_pinned: isPinned,
                requires_acknowledgement: requiresAck,
                created_by: user.id,
            })
            .select()
            .single()

        if (error) {
            console.error('Create notice error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity (non-blocking)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'notice_posted',
                p_entity_type: 'notice',
                p_entity_id: notice.id,
                p_metadata: { title },
            })
        } catch (logErr) {
            console.error('Activity log error:', logErr)
        }

        // Track analytics
        trackServerEvent({
            category: 'notice',
            action: 'created',
            label: isPinned ? 'pinned' : 'normal',
            metadata: { houseId, noticeId: notice.id },
        })

        revalidatePath(`/houses/${houseId}/notices`)
        return { notice }
    } catch (err) {
        console.error('createNotice unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function acknowledgeNotice(noticeId: string, houseId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Check membership
        const { data: membership } = await supabase
            .from('house_members')
            .select('user_id')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        // Check if notice exists and requires acknowledgement
        const { data: notice } = await supabase
            .from('notices')
            .select('requires_acknowledgement')
            .eq('id', noticeId)
            .single()

        if (!notice) {
            return { error: 'Notice not found' }
        }

        if (!notice.requires_acknowledgement) {
            return { error: 'This notice does not require acknowledgement' }
        }

        // Check if already acknowledged
        const { data: existing } = await supabase
            .from('notice_acknowledgements')
            .select('id')
            .eq('notice_id', noticeId)
            .eq('user_id', user.id)
            .single()

        if (existing) {
            return { success: true } // Already acknowledged - not an error
        }

        const { error } = await supabase
            .from('notice_acknowledgements')
            .insert({
                notice_id: noticeId,
                user_id: user.id,
            })

        if (error) {
            console.error('Acknowledge notice error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        trackServerEvent({
            category: 'notice',
            action: 'acknowledged',
            metadata: { houseId, noticeId },
        })

        revalidatePath(`/houses/${houseId}/notices`)
        return { success: true }
    } catch (err) {
        console.error('acknowledgeNotice unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function updateNotice(noticeId: string, houseId: string, formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Validate input
        const title = getFormString(formData, 'title')
        const content = getFormString(formData, 'content')
        
        const titleError = validateRequired(title, 'Title') || validateMaxLength(title, 200, 'Title')
        if (titleError) return { error: titleError }
        
        const contentError = validateRequired(content, 'Content')
        if (contentError) return { error: contentError }

        // Check if user is admin
        const { data: membership } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        if (membership.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        const isPinned = getFormBoolean(formData, 'is_pinned')

        const { data: notice, error } = await supabase
            .from('notices')
            .update({
                title,
                content,
                is_pinned: isPinned,
                updated_at: new Date().toISOString(),
            })
            .eq('id', noticeId)
            .select()
            .single()

        if (error) {
            console.error('Update notice error:', error)
            return { error: formatSupabaseError(error) }
        }

        revalidatePath(`/houses/${houseId}/notices`)
        return { notice }
    } catch (err) {
        console.error('updateNotice unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function deleteNotice(noticeId: string, houseId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Check if user is admin
        const { data: membership } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        if (membership.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        const { error } = await supabase
            .from('notices')
            .delete()
            .eq('id', noticeId)

        if (error) {
            console.error('Delete notice error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        trackServerEvent({
            category: 'notice',
            action: 'deleted',
            metadata: { houseId, noticeId },
        })

        revalidatePath(`/houses/${houseId}/notices`)
        return { success: true }
    } catch (err) {
        console.error('deleteNotice unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function togglePinNotice(noticeId: string, houseId: string, isPinned: boolean) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Check if user is admin
        const { data: membership } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        if (membership.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        const { error } = await supabase
            .from('notices')
            .update({
                is_pinned: isPinned,
                updated_at: new Date().toISOString(),
            })
            .eq('id', noticeId)

        if (error) {
            console.error('Toggle pin notice error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        trackServerEvent({
            category: 'notice',
            action: isPinned ? 'pinned' : 'unpinned',
            metadata: { houseId, noticeId },
        })

        revalidatePath(`/houses/${houseId}/notices`)
        return { success: true }
    } catch (err) {
        console.error('togglePinNotice unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}
