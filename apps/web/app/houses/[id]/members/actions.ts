'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionErrors, formatSupabaseError } from '@/lib/action-utils'
import { trackServerEvent } from '@/lib/analytics'

export async function removeMember(memberId: string, houseId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Check if current user is admin
        const { data: adminCheck } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .single()

        if (!adminCheck || adminCheck.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        // Prevent removing yourself
        if (memberId === user.id) {
            return { error: 'You cannot remove yourself. Use leave house instead.' }
        }

        // Get the member being removed
        const { data: memberToRemove } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', houseId)
            .eq('user_id', memberId)
            .single()

        if (!memberToRemove) {
            return { error: ActionErrors.NOT_FOUND }
        }

        // Prevent removing other admins (must transfer ownership first)
        if (memberToRemove.role === 'admin') {
            return { error: 'Cannot remove another admin. Transfer ownership first.' }
        }

        // Remove member
        const { error } = await supabase
            .from('house_members')
            .delete()
            .eq('house_id', houseId)
            .eq('user_id', memberId)

        if (error) {
            console.error('Remove member error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity (non-blocking)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'member_removed',
                p_entity_type: 'house_member',
                p_entity_id: memberId,
                p_metadata: {},
            })
        } catch (logErr) {
            console.error('Activity log error:', logErr)
        }

        trackServerEvent({
            category: 'house',
            action: 'member_removed',
            metadata: { houseId, memberId },
        })

        revalidatePath(`/houses/${houseId}`)
        revalidatePath(`/houses/${houseId}/members`)
        return { success: true }
    } catch (err) {
        console.error('removeMember unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function updateMemberRole(memberId: string, houseId: string, newRole: 'admin' | 'member') {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Check if current user is admin
        const { data: adminCheck } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', houseId)
            .eq('user_id', user.id)
            .single()

        if (!adminCheck || adminCheck.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        // Prevent demoting yourself
        if (memberId === user.id && newRole !== 'admin') {
            return { error: 'You cannot demote yourself' }
        }

        // Update role
        const { error } = await supabase
            .from('house_members')
            .update({ role: newRole })
            .eq('house_id', houseId)
            .eq('user_id', memberId)

        if (error) {
            console.error('Update role error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity (non-blocking)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'role_changed',
                p_entity_type: 'house_member',
                p_entity_id: memberId,
                p_metadata: { newRole },
            })
        } catch (logErr) {
            console.error('Activity log error:', logErr)
        }

        trackServerEvent({
            category: 'house',
            action: 'member_role_changed',
            metadata: { houseId, memberId, newRole },
        })

        revalidatePath(`/houses/${houseId}`)
        revalidatePath(`/houses/${houseId}/members`)
        return { success: true }
    } catch (err) {
        console.error('updateMemberRole unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}
