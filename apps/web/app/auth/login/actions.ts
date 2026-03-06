'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
        redirect('/auth/login?message=Could not authenticate user')
    }

    revalidatePath('/', 'layout')
    // Go to profile setup if needed, or dashboard
    redirect('/profile/setup')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { data: authData, error } = await supabase.auth.signUp(data)

    if (error) {
        redirect(`/auth/signup?message=${encodeURIComponent(error.message)}`)
    }

    if (authData.user && !authData.session) {
        redirect('/auth/signup?message=Check your email to confirm your account')
    }

    revalidatePath('/', 'layout')
    redirect('/profile/setup')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
}
