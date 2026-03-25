import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../../components/Navbar'
import { updateProfile } from '../actions'
import Link from 'next/link'

export default async function EditProfilePage() {
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

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Back Link */}
                <Link 
                    href="/profile" 
                    className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 mb-6 font-medium"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Profile
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-6 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Edit Profile</h2>
                                <p className="text-violet-200">Update your personal information</p>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <form action={updateProfile} className="p-8 space-y-8">
                        {/* Basic Info Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Basic Info</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                                        <input
                                            required
                                            name="name"
                                            type="text"
                                            defaultValue={profile?.name || ''}
                                            placeholder="Your full name"
                                            className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 p-3 text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Occupation</label>
                                        <input
                                            name="occupation"
                                            type="text"
                                            defaultValue={profile?.occupation || ''}
                                            placeholder="e.g., Software Engineer"
                                            className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 p-3 text-gray-900"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Bio</label>
                                    <textarea
                                        name="bio"
                                        rows={3}
                                        defaultValue={profile?.bio || ''}
                                        placeholder="Tell potential roommates about yourself..."
                                        className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 p-3 text-gray-900"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Lifestyle Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Lifestyle Preferences</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Cleanliness Level</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(level => (
                                                <label key={level} className="flex-1">
                                                    <input 
                                                        type="radio" 
                                                        name="cleanliness_level" 
                                                        value={level}
                                                        defaultChecked={lifestyle?.cleanliness_level === level || (!lifestyle?.cleanliness_level && level === 3)}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="text-center p-3 rounded-xl border-2 border-gray-200 peer-checked:border-pink-500 peer-checked:bg-pink-50 cursor-pointer hover:border-pink-300 transition-colors">
                                                        <span className="font-bold text-gray-900">{level}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">1 = Relaxed, 5 = Very Tidy</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Social Level</label>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map(level => (
                                                <label key={level} className="flex-1">
                                                    <input 
                                                        type="radio" 
                                                        name="social_level" 
                                                        value={level}
                                                        defaultChecked={lifestyle?.social_level === level || (!lifestyle?.social_level && level === 3)}
                                                        className="peer sr-only"
                                                    />
                                                    <div className="text-center p-3 rounded-xl border-2 border-gray-200 peer-checked:border-pink-500 peer-checked:bg-pink-50 cursor-pointer hover:border-pink-300 transition-colors">
                                                        <span className="font-bold text-gray-900">{level}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">1 = Quiet, 5 = Very Social</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Sleep Schedule</label>
                                        <select
                                            name="sleep_schedule"
                                            defaultValue={lifestyle?.sleep_schedule || 'flexible'}
                                            className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 p-3 text-gray-900"
                                        >
                                            <option value="early_bird">🌅 Early Bird</option>
                                            <option value="night_owl">🦉 Night Owl</option>
                                            <option value="flexible">⏰ Flexible</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Guest Frequency</label>
                                        <select
                                            name="guest_frequency"
                                            defaultValue={lifestyle?.guest_frequency || 'sometimes'}
                                            className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 p-3 text-gray-900"
                                        >
                                            <option value="rarely">Rarely</option>
                                            <option value="sometimes">Sometimes</option>
                                            <option value="often">Often</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Housing Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Housing Preferences</h3>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred City</label>
                                    <input
                                        name="city"
                                        type="text"
                                        defaultValue={housing?.city || ''}
                                        placeholder="e.g., San Francisco, CA"
                                        className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 p-3 text-gray-900"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Min Budget ($)</label>
                                        <input
                                            name="min_budget"
                                            type="number"
                                            defaultValue={housing?.min_budget || ''}
                                            placeholder="e.g., 1000"
                                            className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 p-3 text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Max Budget ($)</label>
                                        <input
                                            name="max_budget"
                                            type="number"
                                            defaultValue={housing?.max_budget || ''}
                                            placeholder="e.g., 2000"
                                            className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 p-3 text-gray-900"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Target Move-in Date</label>
                                    <input
                                        name="move_in_date"
                                        type="date"
                                        defaultValue={housing?.move_in_date || ''}
                                        className="block w-full rounded-xl border-gray-200 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 p-3 text-gray-900"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold hover:from-violet-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 shadow-lg hover:shadow-xl transition-all"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}
