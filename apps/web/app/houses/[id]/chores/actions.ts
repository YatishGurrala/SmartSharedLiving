'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { 
    ActionErrors, 
    validateRequired, 
    validateMaxLength,
    getFormString,
    formatSupabaseError 
} from '@/lib/action-utils'
import { trackServerEvent } from '@/lib/analytics'

export async function createChore(houseId: string, formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Validate input
        const title = getFormString(formData, 'title')
        const titleError = validateRequired(title, 'Title') || validateMaxLength(title, 200, 'Title')
        if (titleError) {
            return { error: titleError }
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

        const description = getFormString(formData, 'description') || null
        const assignedTo = getFormString(formData, 'assigned_to') || null
        const dueDate = getFormString(formData, 'due_date') || null
        const recurrence = getFormString(formData, 'recurrence') || 'once'

        const { data: chore, error } = await supabase
            .from('chores')
            .insert({
                house_id: houseId,
                title,
                description,
                assigned_to: assignedTo || null,
                due_date: dueDate || null,
                recurrence,
                status: 'pending',
                created_by: user.id,
            })
            .select()
            .single()

        if (error) {
            console.error('Create chore error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity (non-blocking)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'chore_created',
                p_entity_type: 'chore',
                p_entity_id: chore.id,
                p_metadata: { title },
            })
        } catch (logErr) {
            console.error('Activity log error:', logErr)
        }

        // Track analytics
        trackServerEvent({
            category: 'chore',
            action: 'created',
            label: recurrence,
            metadata: { houseId, choreId: chore.id },
        })

        revalidatePath(`/houses/${houseId}/chores`)
        return { chore }
    } catch (err) {
        console.error('createChore unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function updateChore(choreId: string, houseId: string, formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Validate input
        const title = getFormString(formData, 'title')
        const titleError = validateRequired(title, 'Title') || validateMaxLength(title, 200, 'Title')
        if (titleError) {
            return { error: titleError }
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

        const description = getFormString(formData, 'description') || null
        const assignedTo = getFormString(formData, 'assigned_to') || null
        const dueDate = getFormString(formData, 'due_date') || null
        const recurrence = getFormString(formData, 'recurrence')

        const { data: chore, error } = await supabase
            .from('chores')
            .update({
                title,
                description,
                assigned_to: assignedTo || null,
                due_date: dueDate || null,
                recurrence,
                updated_at: new Date().toISOString(),
            })
            .eq('id', choreId)
            .select()
            .single()

        if (error) {
            console.error('Update chore error:', error)
            return { error: formatSupabaseError(error) }
        }

        revalidatePath(`/houses/${houseId}/chores`)
        return { chore }
    } catch (err) {
        console.error('updateChore unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function completeChore(choreId: string, houseId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Get chore to check if user is assigned or admin
        const { data: chore } = await supabase
            .from('chores')
            .select('assigned_to, title, status')
            .eq('id', choreId)
            .single()

        if (!chore) {
            return { error: 'Chore not found' }
        }

        if (chore.status === 'completed') {
            return { error: 'This chore is already completed' }
        }

        // Check permissions
        const { data: membership } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        const isAdmin = membership.role === 'admin'
        const isAssigned = chore.assigned_to === user.id

        if (!isAdmin && !isAssigned) {
            return { error: 'You can only complete chores assigned to you' }
        }

        const { error } = await supabase
            .from('chores')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', choreId)

        if (error) {
            console.error('Complete chore error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity (non-blocking)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'chore_completed',
                p_entity_type: 'chore',
                p_entity_id: choreId,
                p_metadata: { title: chore.title },
            })
        } catch (logErr) {
            console.error('Activity log error:', logErr)
        }

        // Track analytics
        trackServerEvent({
            category: 'chore',
            action: 'completed',
            metadata: { houseId, choreId },
        })

        revalidatePath(`/houses/${houseId}/chores`)
        return { success: true }
    } catch (err) {
        console.error('completeChore unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function deleteChore(choreId: string, houseId: string) {
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
            .from('chores')
            .delete()
            .eq('id', choreId)

        if (error) {
            console.error('Delete chore error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        trackServerEvent({
            category: 'chore',
            action: 'deleted',
            metadata: { houseId, choreId },
        })

        revalidatePath(`/houses/${houseId}/chores`)
        return { success: true }
    } catch (err) {
        console.error('deleteChore unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function reassignChore(choreId: string, houseId: string, newAssignee: string | null) {
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

        // Verify new assignee is a member (if assigning to someone)
        if (newAssignee) {
            const { data: assigneeMembership } = await supabase
                .from('house_members')
                .select('user_id')
                .eq('house_id', houseId)
                .eq('user_id', newAssignee)
                .single()

            if (!assigneeMembership) {
                return { error: 'Cannot assign to someone who is not a member of this house' }
            }
        }

        const { error } = await supabase
            .from('chores')
            .update({
                assigned_to: newAssignee,
                updated_at: new Date().toISOString(),
            })
            .eq('id', choreId)

        if (error) {
            console.error('Reassign chore error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        if (newAssignee) {
            trackServerEvent({
                category: 'chore',
                action: 'assigned',
                metadata: { houseId, choreId, assigneeId: newAssignee },
            })
        }

        revalidatePath(`/houses/${houseId}/chores`)
        return { success: true }
    } catch (err) {
        console.error('reassignChore unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}
