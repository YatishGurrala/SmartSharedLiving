'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { ActionErrors, validateRequired, validateMaxLength, getFormString, getFormNumber, formatSupabaseError } from '@/lib/action-utils'
import { trackServerEvent } from '@/lib/analytics'

export async function updateHouseSettings(houseId: string, formData: FormData) {
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

        if (!membership || membership.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        // Validate input
        const name = getFormString(formData, 'name')
        const city = getFormString(formData, 'city')
        const targetMembers = getFormNumber(formData, 'target_members')
        const description = getFormString(formData, 'description') || null

        const cityError = validateRequired(city, 'City')
        if (cityError) return { error: cityError }

        const cityMaxError = validateMaxLength(city, 100, 'City')
        if (cityMaxError) return { error: cityMaxError }

        if (name) {
            const nameMaxError = validateMaxLength(name, 100, 'Name')
            if (nameMaxError) return { error: nameMaxError }
        }

        if (targetMembers !== null && targetMembers < 2) {
            return { error: 'Target members must be at least 2' }
        }

        // Update house
        const { error } = await supabase
            .from('houses')
            .update({
                name: name || null,
                city,
                target_members: targetMembers || undefined,
                description,
            })
            .eq('id', houseId)

        if (error) {
            console.error('Update house error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity (non-blocking)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'house_updated',
                p_entity_type: 'house',
                p_entity_id: houseId,
                p_metadata: { city },
            })
        } catch (logErr) {
            console.error('Activity log error:', logErr)
        }

        trackServerEvent({
            category: 'house',
            action: 'settings_updated',
            metadata: { houseId },
        })

        revalidatePath(`/houses/${houseId}`)
        revalidatePath(`/houses/${houseId}/settings`)
        return { success: true }
    } catch (err) {
        console.error('updateHouseSettings unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function leaveHouse(houseId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: ActionErrors.AUTH_REQUIRED }
    }

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

    // Check if user is the only admin
    if (membership.role === 'admin') {
        const { count } = await supabase
            .from('house_members')
            .select('*', { count: 'exact', head: true })
            .eq('house_id', houseId)
            .eq('role', 'admin')

        if (count === 1) {
            // Check if there are other members
            const { count: memberCount } = await supabase
                .from('house_members')
                .select('*', { count: 'exact', head: true })
                .eq('house_id', houseId)

            if (memberCount && memberCount > 1) {
                return { error: 'You must promote another member to admin before leaving' }
            }
        }
    }

    // Remove membership
    const { error } = await supabase
        .from('house_members')
        .delete()
        .eq('house_id', houseId)
        .eq('user_id', user.id)

    if (error) {
        console.error('Leave house error:', error)
        return { error: formatSupabaseError(error) }
    }

    trackServerEvent({
        category: 'house',
        action: 'member_left',
        metadata: { houseId },
    })

    redirect('/houses')
}

export async function deleteHouse(houseId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Check if user is creator/admin
        const { data: house } = await supabase
            .from('houses')
            .select('created_by')
            .eq('id', houseId)
            .single()

        if (!house || house.created_by !== user.id) {
            return { error: 'Only the house creator can delete the house' }
        }

        // Delete house (cascade will handle members, etc.)
        const { error } = await supabase
            .from('houses')
            .delete()
            .eq('id', houseId)

        if (error) {
            console.error('Delete house error:', error)
            return { error: formatSupabaseError(error) }
        }

        trackServerEvent({
            category: 'house',
            action: 'deleted',
            metadata: { houseId },
        })

        redirect('/houses')
    } catch (err) {
        console.error('deleteHouse unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}
