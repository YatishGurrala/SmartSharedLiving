import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../components/Navbar'
import Link from 'next/link'

export default async function ProfilePage() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

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

    // Calculate profile completeness
    const checkItems = [
        profile?.name,
        profile?.occupation,
        profile?.bio,
        lifestyle?.cleanliness_level,
        lifestyle?.social_level,
        housing?.city,
        housing?.min_budget,
    ]
    const completedItems = checkItems.filter(Boolean).length
    const completeness = Math.round((completedItems / checkItems.length) * 100)

    // Star rating helper
    const renderStars = (value: number | null, max: number = 5) => {
        if (!value) return <span className="text-gray-400">Not set</span>
        return (
            <div className="flex gap-0.5">
                {[...Array(max)].map((_, i) => (
                    <svg
                        key={i}
                        className={`w-4 h-4 ${i < value ? 'text-yellow-400' : 'text-gray-200'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center shadow-xl">
                                    <span className="text-white font-bold text-4xl">
                                        {profile?.name?.charAt(0) || '?'}
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">{profile?.name || 'Welcome!'}</h1>
                                    <p className="text-violet-200">{profile?.occupation || 'Add your occupation'}</p>
                                    <p className="text-violet-300 text-sm mt-1">{user.email}</p>
                                </div>
                            </div>
                            <Link
                                href="/profile/edit"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-violet-700 rounded-xl font-semibold hover:bg-violet-50 transition-colors shadow-lg"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Profile
                            </Link>
                        </div>

                        {/* Profile Completeness */}
                        <div className="mt-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-violet-200">Profile Completeness</span>
                                <span className="font-semibold">{completeness}%</span>
                            </div>
                            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                        completeness === 100 ? 'bg-green-400' : 'bg-white'
                                    }`}
                                    style={{ width: `${completeness}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Basic Info */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">About Me</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-sm text-gray-500 mb-1">Bio</p>
                                <p className="text-gray-900">{profile?.bio || <span className="text-gray-400 italic">Tell others about yourself...</span>}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 mb-1">Name</p>
                                    <p className="font-medium text-gray-900">{profile?.name || 'Not set'}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 mb-1">Occupation</p>
                                    <p className="font-medium text-gray-900">{profile?.occupation || 'Not set'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lifestyle */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Lifestyle</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Cleanliness</p>
                                    <p className="text-xs text-gray-500">How tidy do you keep things?</p>
                                </div>
                                {renderStars(lifestyle?.cleanliness_level)}
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Social Level</p>
                                    <p className="text-xs text-gray-500">How social are you at home?</p>
                                </div>
                                {renderStars(lifestyle?.social_level)}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 mb-1">Sleep Schedule</p>
                                    <p className="font-medium text-gray-900 capitalize">
                                        {lifestyle?.sleep_schedule?.replace('_', ' ') || 'Not set'}
                                    </p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    <p className="text-xs text-gray-500 mb-1">Guest Frequency</p>
                                    <p className="font-medium text-gray-900 capitalize">
                                        {lifestyle?.guest_frequency || 'Not set'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Housing Preferences - Full Width */}
                    <div className="md:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Housing Preferences</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    <p className="text-xs text-teal-600 font-medium">Preferred City</p>
                                </div>
                                <p className="font-bold text-gray-900">{housing?.city || 'Not set'}</p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs text-green-600 font-medium">Budget Range</p>
                                </div>
                                <p className="font-bold text-gray-900">
                                    {housing?.min_budget && housing?.max_budget
                                        ? `$${housing.min_budget} - $${housing.max_budget}`
                                        : 'Not set'}
                                </p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-xs text-orange-600 font-medium">Move-in Date</p>
                                </div>
                                <p className="font-bold text-gray-900">
                                    {housing?.move_in_date 
                                        ? new Date(housing.move_in_date).toLocaleDateString()
                                        : 'Not set'}
                                </p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs text-violet-600 font-medium">Status</p>
                                </div>
                                <p className="font-bold text-gray-900">
                                    {housing?.city ? 'Active' : 'Incomplete'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
