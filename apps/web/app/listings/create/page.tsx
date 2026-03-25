import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../../components/Navbar'
import CreateListingForm from './CreateListingForm'
import Link from 'next/link'

export default async function CreateListingPage() {
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
                    href="/listings" 
                    className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-800 mb-6 font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Listings
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Create a New Listing</h2>
                                <p className="text-orange-100">List your rooms to find roommates</p>
                            </div>
                        </div>
                    </div>

                    {/* Form Container */}
                    <div className="p-8">
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8">
                            <div className="flex gap-3">
                                <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div className="text-sm text-orange-800">
                                    <p className="font-medium">Listing Tips</p>
                                    <p className="mt-1 text-orange-600">
                                        Include accurate details about your property and rooms. 
                                        Complete listings attract more qualified applicants.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <CreateListingForm />
                    </div>
                </div>
            </main>
        </div>
    )
}
