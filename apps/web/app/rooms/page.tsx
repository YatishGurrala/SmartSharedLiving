import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../components/Navbar'
import Link from 'next/link'
import RoomsFilter from './RoomsFilter'

interface RoomsPageProps {
    searchParams: Promise<{ city?: string; minRent?: string; maxRent?: string }>
}

export default async function RoomsPage({ searchParams }: RoomsPageProps) {
    const supabase = await createClient()
    const params = await searchParams

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

    // Build query with filters
    let query = supabase
        .from('listings')
        .select(`
            id,
            city,
            address,
            rent,
            available_from,
            owner_id,
            profiles:owner_id (name),
            rooms (id, rent, available)
        `)
        .order('created_at', { ascending: false })

    if (params.city) {
        query = query.ilike('city', `%${params.city}%`)
    }
    if (params.minRent) {
        query = query.gte('rent', parseFloat(params.minRent))
    }
    if (params.maxRent) {
        query = query.lte('rent', parseFloat(params.maxRent))
    }

    const { data: listings } = await query.limit(30)

    // Get unique cities for filter
    const { data: allListings } = await supabase
        .from('listings')
        .select('city')
    const cities = [...new Set(allListings?.map(l => l.city) || [])]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 mb-8 text-white">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">
                        Find Your Perfect Room
                    </h1>
                    <p className="text-indigo-100 text-lg max-w-2xl">
                        Browse verified listings from trusted hosts. Filter by location, price, and availability.
                    </p>
                </div>

                {/* Filters */}
                <RoomsFilter cities={cities} currentFilters={params} />

                {/* Results Count */}
                <div className="flex items-center justify-between mb-6">
                    <p className="text-gray-600">
                        <span className="font-semibold text-gray-900">{listings?.length || 0}</span> listings found
                    </p>
                    <Link
                        href="/listings/create"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Post a Listing
                    </Link>
                </div>

                {!listings || listings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-12 border border-gray-100 text-center">
                        <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings found</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                            {params.city || params.minRent || params.maxRent
                                ? 'Try adjusting your filters to see more results.'
                                : 'Be the first to post a listing, or find roommates to form a house!'}
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link
                                href="/listings/create"
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            >
                                Post a Listing
                            </Link>
                            <Link
                                href="/roommates"
                                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Find Roommates
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {listings.map((listing: any) => {
                            const availableRooms = listing.rooms?.filter((r: any) => r.available).length || 0
                            const totalRooms = listing.rooms?.length || 0
                            const ownerName = (listing.profiles as any)?.name || 'Host'

                            return (
                                <Link
                                    key={listing.id}
                                    href={`/rooms/${listing.id}`}
                                    className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-indigo-200 transition-all duration-300"
                                >
                                    {/* Image Placeholder */}
                                    <div className="h-48 bg-gradient-to-br from-indigo-100 to-purple-100 relative">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg className="w-16 h-16 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                            </svg>
                                        </div>
                                        {/* Badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                availableRooms > 0
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {availableRooms > 0 ? `${availableRooms} Room${availableRooms > 1 ? 's' : ''} Available` : 'Fully Occupied'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {listing.city}
                                                </h3>
                                                <p className="text-sm text-gray-500 line-clamp-1">{listing.address}</p>
                                            </div>
                                            <span className="text-lg font-bold text-indigo-600">${listing.rent}</span>
                                        </div>

                                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                {new Date(listing.available_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                {totalRooms} Room{totalRooms !== 1 ? 's' : ''}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-4">
                                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-sm">
                                                {ownerName.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm text-gray-600">{ownerName}</span>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
