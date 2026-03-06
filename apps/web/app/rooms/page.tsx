import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '../auth/login/actions'

export default async function RoomsPage() {
    const supabase = await createClient()

    // 1. Enforce Authentication
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    // 2. Fetch User Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm border-b px-4 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-indigo-600">Smart Shared Living</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-700">
                        Welcome, {profile?.name || user.email}
                    </span>
                    <form action={signout}>
                        <button className="text-sm text-red-600 hover:text-red-800 font-medium">Log out</button>
                    </form>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Discover Rooms (Coming Soon)</h2>
                <div className="bg-white rounded-xl shadow p-6 border border-gray-100 flex items-center justify-center min-h-[400px]">
                    <p className="text-gray-500">The Discovery Engine will feed room listings here.</p>
                </div>
            </main>
        </div>
    )
}
