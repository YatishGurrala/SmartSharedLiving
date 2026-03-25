'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ActionErrors, formatSupabaseError, validateRequired, validateMinLength, getFormString } from '@/lib/action-utils'
import { trackServerEvent } from '@/lib/analytics'

export async function createAgreement(houseId: string, formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Validate input
        const title = getFormString(formData, 'title')
        const content = getFormString(formData, 'content')

        const titleError = validateRequired(title, 'Title')
        if (titleError) return { error: titleError }

        const titleLengthError = validateMinLength(title!, 3, 'Title')
        if (titleLengthError) return { error: titleLengthError }

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

        const { data: agreement, error } = await supabase
            .from('agreements')
            .insert({
                house_id: houseId,
                title,
                content,
                created_by: user.id,
                status: 'draft',
                version: 1,
            })
            .select()
            .single()

        if (error) {
            console.error('Create agreement error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity (don't fail if this errors)
        try {
            await supabase.rpc('log_activity', {
                p_house_id: houseId,
                p_user_id: user.id,
                p_activity_type: 'agreement_created',
                p_entity_type: 'agreement',
                p_entity_id: agreement.id,
                p_metadata: { title },
            })
        } catch (activityError) {
            console.error('Failed to log activity:', activityError)
        }

        // Track analytics
        trackServerEvent({
            category: 'agreement',
            action: 'created',
            metadata: { houseId, agreementId: agreement.id },
        })

        revalidatePath(`/houses/${houseId}/agreements`)
        return { agreement }
    } catch (err) {
        console.error('createAgreement unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function updateAgreement(agreementId: string, formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Validate input
        const title = getFormString(formData, 'title')
        const content = getFormString(formData, 'content')

        const titleError = validateRequired(title, 'Title')
        if (titleError) return { error: titleError }

        const contentError = validateRequired(content, 'Content')
        if (contentError) return { error: contentError }

        // Get agreement to check house
        const { data: existingAgreement } = await supabase
            .from('agreements')
            .select('house_id')
            .eq('id', agreementId)
            .single()

        if (!existingAgreement) {
            return { error: ActionErrors.NOT_FOUND }
        }

        // Check if user is admin
        const { data: membership } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', existingAgreement.house_id)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        if (membership.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        const { data: agreement, error } = await supabase
            .from('agreements')
            .update({
                title,
                content,
                updated_at: new Date().toISOString(),
            })
            .eq('id', agreementId)
            .select()
            .single()

        if (error) {
            console.error('Update agreement error:', error)
            return { error: formatSupabaseError(error) }
        }

        revalidatePath(`/houses/${existingAgreement.house_id}/agreements`)
        return { agreement }
    } catch (err) {
        console.error('updateAgreement unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function activateAgreement(agreementId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Get agreement details
        const { data: agreement } = await supabase
            .from('agreements')
            .select('house_id, status')
            .eq('id', agreementId)
            .single()

        if (!agreement) {
            return { error: ActionErrors.NOT_FOUND }
        }

        // Check if user is admin
        const { data: membership } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', agreement.house_id)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        if (membership.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        // Supersede existing active agreements
        await supabase
            .from('agreements')
            .update({ status: 'superseded', updated_at: new Date().toISOString() })
            .eq('house_id', agreement.house_id)
            .eq('status', 'active')

        // Activate this agreement
        const { error } = await supabase
            .from('agreements')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', agreementId)

        if (error) {
            console.error('Activate agreement error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        trackServerEvent({
            category: 'agreement',
            action: 'activated',
            metadata: { houseId: agreement.house_id, agreementId },
        })

        revalidatePath(`/houses/${agreement.house_id}/agreements`)
        return { success: true }
    } catch (err) {
        console.error('activateAgreement unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function acceptAgreement(agreementId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Check if already accepted
        const { data: existing } = await supabase
            .from('agreement_acceptances')
            .select('id')
            .eq('agreement_id', agreementId)
            .eq('user_id', user.id)
            .single()

        if (existing) {
            return { success: true } // Already accepted
        }

        const { error } = await supabase
            .from('agreement_acceptances')
            .insert({
                agreement_id: agreementId,
                user_id: user.id,
            })

        if (error) {
            console.error('Accept agreement error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Log activity (don't fail if this errors)
        try {
            const { data: agreement } = await supabase
                .from('agreements')
                .select('house_id, title')
                .eq('id', agreementId)
                .single()

            if (agreement) {
                await supabase.rpc('log_activity', {
                    p_house_id: agreement.house_id,
                    p_user_id: user.id,
                    p_activity_type: 'agreement_accepted',
                    p_entity_type: 'agreement',
                    p_entity_id: agreementId,
                    p_metadata: { title: agreement.title },
                })

                revalidatePath(`/houses/${agreement.house_id}/agreements`)
            }
        } catch (activityError) {
            console.error('Failed to log activity:', activityError)
        }

        // Track analytics
        trackServerEvent({
            category: 'agreement',
            action: 'accepted',
            metadata: { agreementId },
        })

        return { success: true }
    } catch (err) {
        console.error('acceptAgreement unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}

export async function archiveAgreement(agreementId: string) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { error: ActionErrors.AUTH_REQUIRED }
        }

        // Get agreement details
        const { data: agreement } = await supabase
            .from('agreements')
            .select('house_id')
            .eq('id', agreementId)
            .single()

        if (!agreement) {
            return { error: ActionErrors.NOT_FOUND }
        }

        // Check if user is admin
        const { data: membership } = await supabase
            .from('house_members')
            .select('role')
            .eq('house_id', agreement.house_id)
            .eq('user_id', user.id)
            .single()

        if (!membership) {
            return { error: ActionErrors.NOT_MEMBER }
        }

        if (membership.role !== 'admin') {
            return { error: ActionErrors.NOT_ADMIN }
        }

        const { error } = await supabase
            .from('agreements')
            .update({ status: 'archived', updated_at: new Date().toISOString() })
            .eq('id', agreementId)

        if (error) {
            console.error('Archive agreement error:', error)
            return { error: formatSupabaseError(error) }
        }

        // Track analytics
        trackServerEvent({
            category: 'agreement',
            action: 'archived',
            metadata: { houseId: agreement.house_id, agreementId },
        })

        revalidatePath(`/houses/${agreement.house_id}/agreements`)
        return { success: true }
    } catch (err) {
        console.error('archiveAgreement unexpected error:', err)
        return { error: ActionErrors.SERVER_ERROR }
    }
}
