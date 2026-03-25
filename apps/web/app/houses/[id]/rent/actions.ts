'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionErrors, formatSupabaseError, validateRequired, validatePositiveNumber, getFormString, getFormNumber } from '@/lib/action-utils'
import { trackServerEvent } from '@/lib/analytics'

export async function createRentCycle(houseId: string, formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Validate input
        const name = getFormString(formData, 'name')
        const startDate = getFormString(formData, 'start_date')
        const dueDate = getFormString(formData, 'due_date')
        const totalAmount = getFormNumber(formData, 'total_amount')
        const notes = getFormString(formData, 'notes')
        const memberAmountsJson = getFormString(formData, 'member_amounts')

        const nameError = validateRequired(name, 'Name')
        if (nameError) return { error: nameError }

        const startDateError = validateRequired(startDate, 'Start date')
        if (startDateError) return { error: startDateError }

        const dueDateError = validateRequired(dueDate, 'Due date')
        if (dueDateError) return { error: dueDateError }

        if (totalAmount == null || isNaN(totalAmount)) {
            return { error: 'Total amount is required' }
        }

        const amountError = validatePositiveNumber(totalAmount, 'Total amount')
        if (amountError) return { error: amountError }

        let memberAmounts: { user_id: string; amount: number }[] = []
        try {
            memberAmounts = memberAmountsJson ? JSON.parse(memberAmountsJson) : []
        } catch (e) {
            return { error: 'Invalid member amounts format' }
        }

        if (memberAmounts.length === 0) {
            return { error: 'At least one member must be assigned' }
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

        // Create the cycle
        const { data: cycle, error: cycleError } = await supabase
            .from('rent_cycles')
            .insert({
                house_id: houseId,
                name,
                start_date: startDate,
                due_date: dueDate,
                total_amount: totalAmount,
                notes: notes || null,
                created_by: user.id,
            })
            .select()
            .single()

        if (cycleError) {
            console.error('Create rent cycle error:', cycleError)
            return { error: formatSupabaseError(cycleError) }
        }

        // Create entries for each member
        const entries = memberAmounts.map(m => ({
            rent_cycle_id: cycle.id,
            user_id: m.user_id,
            amount: m.amount,
            status: 'pending',
        }))

        const { error: entriesError } = await supabase
            .from('rent_entries')
            .insert(entries)

        if (entriesError) {
            // Rollback
            await supabase.from('rent_cycles').delete().eq('id', cycle.id)
            console.error('Create rent entries error:', entriesError)
            return { error: 'Could not create rent entries' }
        }

        // Log activity (don't fail if this errors)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'rent_cycle_created',
                p_entity_type: 'rent_cycle',
                p_entity_id: cycle.id,
                p_metadata: { name, total_amount: totalAmount },
            })
        } catch (activityError) {
            console.error('Failed to log activity:', activityError)
        }

        // Track analytics
        trackServerEvent({
            category: 'rent',
            action: 'cycle_created',
            value: totalAmount!,
            metadata: { houseId, cycleId: cycle.id },
        })

        revalidatePath(`/houses/${houseId}/rent`)
        return { cycle }
    } catch (err) {
        console.error('createRentCycle unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function updateRentEntryStatus(
    entryId: string,
    status: 'pending' | 'paid' | 'overdue' | 'waived',
    houseId: string,
    notes?: string
) {
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

        const updateData: Record<string, unknown> = {
            status,
            marked_by: user.id,
            updated_at: new Date().toISOString(),
        }

        if (status === 'paid') {
            updateData.paid_at = new Date().toISOString()
        }

        if (notes !== undefined) {
            updateData.notes = notes
        }

        const { data: entry, error } = await supabase
            .from('rent_entries')
            .update(updateData)
            .eq('id', entryId)
            .select(`
                *,
                rent_cycles (
                    id,
                    house_id,
                    name
                )
            `)
            .single()

        if (error) {
            console.error('Update rent entry error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity if marked as paid (don't fail if this errors)
        if (status === 'paid') {
            try {
                await supabase.rpc('log_activity', {
                    p_house_id: houseId,
                    p_user_id: entry.user_id,
                    p_activity_type: 'rent_marked_paid',
                    p_entity_type: 'rent_entry',
                    p_entity_id: entryId,
                    p_metadata: { cycle_name: (entry.rent_cycles as { name: string }).name, amount: entry.amount },
                })
            } catch (activityError) {
                console.error('Failed to log activity:', activityError)
            }
        }

        // Track analytics
        trackServerEvent({
            category: 'rent',
            action: status === 'paid' ? 'marked_paid' : 'status_changed',
            label: status,
            value: status === 'paid' ? entry.amount : undefined,
            metadata: { houseId, entryId },
        })

        revalidatePath(`/houses/${houseId}/rent`)
        return { entry }
    } catch (err) {
        console.error('updateRentEntryStatus unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function deleteRentCycle(cycleId: string, houseId: string) {
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

        // Delete entries first (cascade should handle this, but just in case)
        await supabase
            .from('rent_entries')
            .delete()
            .eq('rent_cycle_id', cycleId)

        const { error } = await supabase
            .from('rent_cycles')
            .delete()
            .eq('id', cycleId)

        if (error) {
            console.error('Delete rent cycle error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        trackServerEvent({
            category: 'rent',
            action: 'cycle_deleted',
            metadata: { houseId, cycleId },
        })

        revalidatePath(`/houses/${houseId}/rent`)
        return { success: true }
    } catch (err) {
        console.error('deleteRentCycle unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}
