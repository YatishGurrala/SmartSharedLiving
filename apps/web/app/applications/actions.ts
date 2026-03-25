'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { 
    createAppError, 
    ErrorCodes, 
    logError, 
    validateRequired,
    tryCatch,
    type Result 
} from '@/lib/errors'
import { trackServerEvent } from '@/lib/analytics'

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export type ApplicationTargetType = 'listing' | 'house'

interface CreateApplicationParams {
    targetId: string
    targetType: ApplicationTargetType
    message?: string
}

export async function createApplication(
    params: CreateApplicationParams
): Promise<Result<{ applicationId: string }>> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: createAppError(ErrorCodes.AUTH_REQUIRED) }
    }

    return tryCatch(async () => {
        validateRequired(params.targetId, 'Target ID')
        validateRequired(params.targetType, 'Target type')

        // Check for existing application
        const { data: existing } = await supabase
            .from('applications')
            .select('id, status')
            .eq('applicant_user_id', user.id)
            .eq('target_id', params.targetId)
            .single()

        if (existing && existing.status === 'pending') {
            throw createAppError(
                ErrorCodes.ALREADY_EXISTS,
                'You already have a pending application for this'
            )
        }

        // Create application
        const { data: application, error } = await supabase
            .from('applications')
            .insert({
                applicant_user_id: user.id,
                target_id: params.targetId,
                status: 'pending',
            })
            .select()
            .single()

        if (error || !application) {
            logError(error, { action: 'createApplication', params })
            throw createAppError(ErrorCodes.DB_ERROR, 'Failed to create application')
        }

        trackServerEvent({
            category: 'application',
            action: 'submitted',
            label: params.targetType,
            metadata: { targetId: params.targetId, applicationId: application.id },
        })

        revalidatePath('/applications')
        return { applicationId: application.id }
    })
}

export async function updateApplicationStatus(
    applicationId: string,
    status: ApplicationStatus
): Promise<Result<{ success: boolean }>> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: createAppError(ErrorCodes.AUTH_REQUIRED) }
    }

    return tryCatch(async () => {
        // Get application details
        const { data: application } = await supabase
            .from('applications')
            .select('target_id, applicant_user_id')
            .eq('id', applicationId)
            .single()

        if (!application) {
            throw createAppError(ErrorCodes.NOT_FOUND, 'Application not found')
        }

        // Check authorization - either applicant (for withdraw) or target owner
        const isApplicant = application.applicant_user_id === user.id
        
        if (status === 'withdrawn' && !isApplicant) {
            throw createAppError(ErrorCodes.NOT_AUTHORIZED, 'Only the applicant can withdraw')
        }

        if ((status === 'accepted' || status === 'rejected') && isApplicant) {
            throw createAppError(ErrorCodes.NOT_AUTHORIZED, 'Applicants cannot accept/reject their own application')
        }

        // If not applicant, verify ownership of target
        if (!isApplicant) {
            // Check if user owns the listing
            const { data: listing } = await supabase
                .from('listings')
                .select('owner_id')
                .eq('id', application.target_id)
                .single()

            // Check if user is admin of the house
            const { data: houseMember } = await supabase
                .from('house_members')
                .select('role')
                .eq('house_id', application.target_id)
                .eq('user_id', user.id)
                .single()

            const isListingOwner = listing?.owner_id === user.id
            const isHouseAdmin = houseMember?.role === 'admin'

            if (!isListingOwner && !isHouseAdmin) {
                throw createAppError(ErrorCodes.NOT_AUTHORIZED)
            }
        }

        // Update status
        const { error } = await supabase
            .from('applications')
            .update({ status })
            .eq('id', applicationId)

        if (error) {
            throw createAppError(ErrorCodes.DB_ERROR, 'Failed to update application')
        }

        // If accepted for house, add as member
        if (status === 'accepted') {
            const { data: house } = await supabase
                .from('houses')
                .select('id')
                .eq('id', application.target_id)
                .single()

            if (house) {
                await supabase.from('house_members').insert({
                    house_id: house.id,
                    user_id: application.applicant_user_id,
                    role: 'member',
                    status: 'active',
                })
            }
        }

        trackServerEvent({
            category: 'application',
            action: 'status_changed',
            label: status,
            metadata: { applicationId },
        })

        revalidatePath('/applications')
        return { success: true }
    })
}

export async function getMyApplications(): Promise<Result<any[]>> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: createAppError(ErrorCodes.AUTH_REQUIRED) }
    }

    return tryCatch(async () => {
        const { data, error } = await supabase
            .from('applications')
            .select('*')
            .eq('applicant_user_id', user.id)
            .order('created_at', { ascending: false })

        if (error) {
            throw createAppError(ErrorCodes.DB_ERROR)
        }

        return data || []
    })
}

export async function getApplicationsForTarget(
    targetId: string
): Promise<Result<any[]>> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: createAppError(ErrorCodes.AUTH_REQUIRED) }
    }

    return tryCatch(async () => {
        const { data, error } = await supabase
            .from('applications')
            .select(`
                *,
                profiles:applicant_user_id (
                    name,
                    bio,
                    occupation
                )
            `)
            .eq('target_id', targetId)
            .order('created_at', { ascending: false })

        if (error) {
            throw createAppError(ErrorCodes.DB_ERROR)
        }

        return data || []
    })
}
