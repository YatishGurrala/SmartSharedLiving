'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionErrors, formatSupabaseError, validateRequired, validateFutureDate, getFormString } from '@/lib/action-utils'
import { trackServerEvent } from '@/lib/analytics'

export async function submitExitRequest(houseId: string, formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Validate input
        const requestedExitDate = getFormString(formData, 'requested_exit_date')
        
        const dateError = validateRequired(requestedExitDate, 'Exit date')
        if (dateError) return { error: dateError }
        
        const futureDateError = validateFutureDate(requestedExitDate!, 'Exit date')
        if (futureDateError) return { error: futureDateError }

        const reason = getFormString(formData, 'reason')

        // Check membership
        const { data: membership } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        // Check if already has a pending exit request
        const { data: existingRequest } = await supabase
            .from('exit_requests')
            .select('id')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .single()

        if (existingRequest) {
            return { error: 'You already have a pending exit request' }
        }

        const { data: request, error } = await supabase
            .from('exit_requests')
            .insert({
                house_id: houseId,
                user_id: user.id,
                reason,
                requested_exit_date: requestedExitDate,
                status: 'pending',
            })
            .select()
            .single()

        if (error) {
            console.error('Submit exit request error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity (don't fail if this errors)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'exit_request_submitted',
                p_entity_type: 'exit_request',
                p_entity_id: request.id,
                p_metadata: { requested_exit_date: requestedExitDate },
            })
        } catch (activityError) {
            console.error('Failed to log activity:', activityError)
        }

        // Track analytics
        trackServerEvent({
            category: 'exit_request',
            action: 'submitted',
            metadata: { houseId, requestId: request.id, requestedExitDate: requestedExitDate! },
        })

        revalidatePath(`/houses/${houseId}/exit-requests`)
        return { request }
    } catch (err) {
        console.error('submitExitRequest unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function approveExitRequest(requestId: string, houseId: string) {
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

        // Get the exit request
        const { data: request } = await supabase
            .from('exit_requests')
            .select('user_id, requested_exit_date')
            .eq('id', requestId)
            .single()

        if (!request) {
            return { error: ActionErrors.NOT_FOUND }
        }

        // Update exit request status
        const { error: updateError } = await supabase
            .from('exit_requests')
            .update({
                status: 'approved',
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)

        if (updateError) {
            console.error('Approve exit request error:', updateError)
            return { error: formatSupabaseError(updateError) }
        }

        // Remove user from house
        const { error: removeError } = await supabase
            .from('house_members')
            .delete()
            .eq('house_id', houseId)
            .eq('user_id', request.user_id)

        if (removeError) {
            console.error('Remove member error:', removeError)
            return { error: 'Could not remove member from house' }
        }

        // Log activity (don't fail if this errors)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'member_left',
                p_entity_type: 'exit_request',
                p_entity_id: requestId,
                p_metadata: { removed_user_id: request.user_id },
            })
        } catch (activityError) {
            console.error('Failed to log activity:', activityError)
        }

        // Track analytics
        trackServerEvent({
            category: 'exit_request',
            action: 'approved',
            metadata: { houseId, requestId },
        })

        revalidatePath(`/houses/${houseId}/exit-requests`)
        revalidatePath(`/houses/${houseId}`)
        return { success: true }
    } catch (err) {
        console.error('approveExitRequest unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function rejectExitRequest(requestId: string, houseId: string, reason?: string) {
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
            .from('exit_requests')
            .update({
                status: 'rejected',
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId)

        if (error) {
            console.error('Reject exit request error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        trackServerEvent({
            category: 'exit_request',
            action: 'rejected',
            metadata: { houseId, requestId },
        })

        revalidatePath(`/houses/${houseId}/exit-requests`)
        return { success: true }
    } catch (err) {
        console.error('rejectExitRequest unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function cancelExitRequest(requestId: string, houseId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Verify the request belongs to this user and is pending
        const { data: request } = await supabase
            .from('exit_requests')
            .select('user_id, status')
            .eq('id', requestId)
            .single()

        if (!request) {
            return { error: ActionErrors.NOT_FOUND }
        }

        if (request.user_id !== user.id) {
            return { error: ActionErrors.NOT_AUTHORIZED }
        }

        if (request.status !== 'pending') {
            return { error: 'Can only cancel pending requests' }
        }

        const { error } = await supabase
            .from('exit_requests')
            .delete()
            .eq('id', requestId)

        if (error) {
            console.error('Cancel exit request error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        trackServerEvent({
            category: 'exit_request',
            action: 'cancelled',
            metadata: { houseId, requestId },
        })

        revalidatePath(`/houses/${houseId}/exit-requests`)
        return { success: true }
    } catch (err) {
        console.error('cancelExitRequest unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}
