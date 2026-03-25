import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { createHouse } from '../actions'
import Link from 'next/link'

export default async function CreateHousePage() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Back Link */}
                <Link 
                    href="/houses" 
                    className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-800 mb-6 font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Houses
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Create a New House</h2>
                                <p className="text-teal-100">Start building your shared living group</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-8">
                        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-8">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-teal-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-teal-800">
                                    <p className="font-medium">What is a House?</p>
                                    <p className="mt-1 text-teal-600">
                                        A house is a group of people looking to live together. As the creator, 
                                        you'll be the admin and can invite others to join your group.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <form action={createHouse} className="space-y-6">
                            <div>
                                <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                                    City / Location
                                </label>
                                <input
                                    type="text"
                                    id="city"
                                    name="city"
                                    required
                                    placeholder="e.g., San Francisco, CA"
                                    className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 p-4 text-gray-900 placeholder:text-gray-400"
                                />
                                <p className="mt-2 text-sm text-gray-500">
                                    Enter the city where your house will be located
                                </p>
                            </div>

                            <div>
                                <label htmlFor="target_members" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Target Number of Members
                                </label>
                                <div className="grid grid-cols-5 gap-3">
                                    {[2, 3, 4, 5, 6].map(num => (
                                        <label key={num} className="relative cursor-pointer">
                                            <input 
                                                type="radio" 
                                                name="target_members" 
                                                value={num} 
                                                defaultChecked={num === 4}
                                                className="peer sr-only"
                                            />
                                            <div className="flex flex-col items-center p-4 rounded-xl border-2 border-gray-200 peer-checked:border-teal-500 peer-checked:bg-teal-50 hover:border-teal-300 transition-colors">
                                                <span className="text-2xl font-bold text-gray-900">{num}</span>
                                                <span className="text-xs text-gray-500">people</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <p className="mt-2 text-sm text-gray-500">
                                    How many people do you want in your house?
                                </p>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold hover:from-teal-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-lg hover:shadow-xl transition-all"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create House
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    )
}
