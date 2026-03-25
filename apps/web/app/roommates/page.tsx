import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../components/Navbar'
import Link from 'next/link'
import RoommateCard from './RoommateCard'
import RoommatesFilter from './RoommatesFilter'

interface RoommatesPageProps {
    searchParams: Promise<{ city?: string; minBudget?: string; maxBudget?: string }>
}

export default async function RoommatesPage({ searchParams }: RoommatesPageProps) {
    const supabase = await createClient()
    const params = await searchParams

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    const { data: myPrefs } = await supabase
        .from('housing_preferences')
        .select('city, min_budget, max_budget')
        .eq('user_id', user.id)
        .single()

    const { data: myLifestyle } = await supabase
        .from('lifestyle_profiles')
        .select('cleanliness_level, social_level')
        .eq('user_id', user.id)
        .single()

    // Fetch all profiles with their preferences
    const { data: potentialRoommates } = await supabase
        .from('profiles')
        .select(`
            user_id,
            name,
            bio,
            occupation,
            avatar,
            lifestyle_profiles (
                cleanliness_level,
                sleep_schedule,
                social_level,
                guest_frequency
            ),
            housing_preferences (
                city,
                min_budget,
                max_budget,
                move_in_date
            )
        `)
        .neq('user_id', user.id)
        .limit(50)

    // Get unique cities for filter
    const cities = [...new Set(
        potentialRoommates
            ?.filter((r: any) => r.housing_preferences?.city)
            .map((r: any) => r.housing_preferences.city) || []
    )]

    // Apply filters
    let filteredRoommates = potentialRoommates || []

    const filterCity = params.city || myPrefs?.city
    if (filterCity) {
        filteredRoommates = filteredRoommates.filter((r: any) =>
            r.housing_preferences?.city?.toLowerCase() === filterCity.toLowerCase()
        )
    }

    if (params.minBudget) {
        filteredRoommates = filteredRoommates.filter((r: any) =>
            r.housing_preferences?.max_budget >= parseFloat(params.minBudget!)
        )
    }

    if (params.maxBudget) {
        filteredRoommates = filteredRoommates.filter((r: any) =>
            r.housing_preferences?.min_budget <= parseFloat(params.maxBudget!)
        )
    }

    // Calculate compatibility score
    const roommatesWithScore = filteredRoommates.map((roommate: any) => {
        let score = 50 // Base score
        if (myLifestyle && roommate.lifestyle_profiles) {
            const cleanDiff = Math.abs(
                (myLifestyle.cleanliness_level || 3) - (roommate.lifestyle_profiles.cleanliness_level || 3)
            )
            const socialDiff = Math.abs(
                (myLifestyle.social_level || 3) - (roommate.lifestyle_profiles.social_level || 3)
            )
            score = 100 - (cleanDiff * 10) - (socialDiff * 10)
        }
        return { ...roommate, compatibilityScore: Math.max(score, 0) }
    }).sort((a: any, b: any) => b.compatibilityScore - a.compatibilityScore)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 mb-8 text-white">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">
                        Find Compatible Roommates
                    </h1>
                    <p className="text-purple-100 text-lg max-w-2xl">
                        Connect with people who share your lifestyle and housing preferences. We calculate compatibility based on your profile.
                    </p>
                </div>

                {/* Filters */}
                <RoommatesFilter 
                    cities={cities} 
                    currentFilters={params}
                    defaultCity={myPrefs?.city}
                />

                {/* Results Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <p className="text-gray-600">
                            <span className="font-semibold text-gray-900">{roommatesWithScore.length}</span> potential roommates
                            {filterCity && <span className="text-gray-500"> in {filterCity}</span>}
                        </p>
                    </div>
                    {!myLifestyle && (
                        <Link
                            href="/profile/edit"
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            Complete profile for better matches →
                        </Link>
                    )}
                </div>

                {roommatesWithScore.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 border border-gray-100 text-center">
                        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No roommates found</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            {filterCity
                                ? `No one is currently looking in ${filterCity}. Try adjusting your filters.`
                                : 'Set your housing preferences to find compatible roommates.'}
                        </p>
                        <div className="flex gap-3 justify-center">
                            {filterCity && (
                                <Link
                                    href="/roommates"
                                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Clear Filters
                                </Link>
                            )}
                            <Link
                                href="/profile/edit"
                                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                            >
                                Update Preferences
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {roommatesWithScore.map((roommate: any) => (
                            <RoommateCard key={roommate.user_id} roommate={roommate} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
