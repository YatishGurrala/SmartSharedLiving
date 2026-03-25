'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { 
    createAppError, 
    ErrorCodes, 
    logError, 
    validateRequired,
    validateRange,
    tryCatch,
    type Result 
} from '@/lib/errors'
import { trackServerEvent } from '@/lib/analytics'

export async function updateProfile(formData: FormData): Promise<void> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth/login')
    }

    try {
        // Validate and extract profile data
        const name = formData.get('name') as string
        const bio = formData.get('bio') as string
        const occupation = formData.get('occupation') as string

        validateRequired(name, 'Name')

        // Update profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                user_id: user.id,
                name,
                bio,
                occupation,
            })

        if (profileError) {
            logError(profileError, { action: 'updateProfile', step: 'profile' })
            throw createAppError(ErrorCodes.DB_ERROR, 'Failed to update profile')
        }

        // Update lifestyle profile
        const cleanlinessLevel = parseInt(formData.get('cleanliness_level') as string, 10)
        const socialLevel = parseInt(formData.get('social_level') as string, 10)
        const sleepSchedule = formData.get('sleep_schedule') as string
        const guestFrequency = formData.get('guest_frequency') as string

        if (cleanlinessLevel) validateRange(cleanlinessLevel, 1, 5, 'Cleanliness level')
        if (socialLevel) validateRange(socialLevel, 1, 5, 'Social level')

        const { error: lifestyleError } = await supabase
            .from('lifestyle_profiles')
            .upsert({
                user_id: user.id,
                cleanliness_level: cleanlinessLevel || null,
                sleep_schedule: sleepSchedule || null,
                social_level: socialLevel || null,
                guest_frequency: guestFrequency || null,
            })

        if (lifestyleError) {
            logError(lifestyleError, { action: 'updateProfile', step: 'lifestyle' })
        }

        // Update housing preferences
        const city = formData.get('city') as string
        const minBudget = parseFloat(formData.get('min_budget') as string)
        const maxBudget = parseFloat(formData.get('max_budget') as string)
        const moveInDate = formData.get('move_in_date') as string

        if (city) {
            const { error: housingError } = await supabase
                .from('housing_preferences')
                .upsert({
                    user_id: user.id,
                    city,
                    min_budget: minBudget || null,
                    max_budget: maxBudget || null,
                    move_in_date: moveInDate || null,
                })

            if (housingError) {
                logError(housingError, { action: 'updateProfile', step: 'housing' })
            }
        }

        trackServerEvent({
            category: 'profile',
            action: 'updated',
            metadata: { userId: user.id },
        })

        revalidatePath('/profile')
        revalidatePath('/profile/edit')
    } catch (error) {
        logError(error, { action: 'updateProfile' })
        redirect('/profile/edit?error=Failed to update profile')
    }

    redirect('/profile')
}

export async function getFullProfile(): Promise<Result<any>> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { success: false, error: createAppError(ErrorCodes.AUTH_REQUIRED) }
    }

    return tryCatch(async () => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

        const { data: lifestyle } = await supabase
            .from('lifestyle_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single()

        const { data: housing } = await supabase
            .from('housing_preferences')
            .select('*')
            .eq('user_id', user.id)
            .single()

        return {
            ...profile,
            lifestyle,
            housing,
            email: user.email,
        }
    })
}
