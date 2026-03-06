'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function submitProfileSetup(formData: FormData) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/auth/login')
    }

    // 1. Insert Profile
    const profileData = {
        user_id: user.id,
        name: formData.get('name') as string,
        bio: formData.get('bio') as string,
        occupation: formData.get('occupation') as string,
    }

    await supabase.from('profiles').upsert(profileData)

    // 2. Insert Lifestyle Profile
    const lifestyleData = {
        user_id: user.id,
        cleanliness_level: parseInt(formData.get('cleanliness_level') as string, 10),
        sleep_schedule: formData.get('sleep_schedule') as string,
        social_level: parseInt(formData.get('social_level') as string, 10),
        guest_frequency: formData.get('guest_frequency') as string,
    }

    await supabase.from('lifestyle_profiles').upsert(lifestyleData)

    // 3. Insert Housing Preferences
    const housingData = {
        user_id: user.id,
        city: formData.get('city') as string,
        min_budget: parseFloat(formData.get('min_budget') as string),
        max_budget: parseFloat(formData.get('max_budget') as string),
        move_in_date: formData.get('move_in_date') as string,
    }

    await supabase.from('housing_preferences').upsert(housingData)

    // Redirect to discovery feed or home
    redirect('/rooms')
}
