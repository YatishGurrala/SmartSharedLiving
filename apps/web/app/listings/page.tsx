import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../components/Navbar'
import Link from 'next/link'

export default async function ListingsPage() {
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

    // Get user's own listings
    const { data: myListings, error: listingsError } = await supabase
        .from('listings')
        .select(`
            id,
            city,
            address,
            rent,
            available_from,
            created_at,
            rooms (
                id,
                rent,
                available
            )
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

    if (listingsError) {
        console.error('Error fetching listings:', listingsError)
    }

    // Calculate stats
    const totalListings = myListings?.length || 0
    const activeListings = myListings?.filter((l: any) => l.rooms?.some((r: any) => r.available)).length || 0
    const totalRooms = myListings?.reduce((acc: number, l: any) => acc + (l.rooms?.length || 0), 0) || 0
    const availableRooms = myListings?.reduce((acc: number, l: any) => acc + (l.rooms?.filter((r: any) => r.available).length || 0), 0) || 0

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">My Listings</h1>
                            <p className="text-orange-100 max-w-xl">
                                Manage your property listings and rooms. Track availability, 
                                view applications, and find the perfect roommates for your space.
                            </p>
                        </div>
                        <Link
                            href="/listings/create"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-700 rounded-xl font-semibold hover:bg-orange-50 transition-colors shadow-lg"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Listing
                        </Link>
                    </div>
                </div>

                {/* Stats Summary */}
                {totalListings > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="text-2xl font-bold text-gray-900">{totalListings}</div>
                            <div className="text-sm text-gray-500">Total Listings</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="text-2xl font-bold text-green-600">{activeListings}</div>
                            <div className="text-sm text-gray-500">Active</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="text-2xl font-bold text-orange-600">{totalRooms}</div>
                            <div className="text-sm text-gray-500">Total Rooms</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                            <div className="text-2xl font-bold text-amber-600">{availableRooms}</div>
                            <div className="text-sm text-gray-500">Available Rooms</div>
                        </div>
                    </div>
                )}

                {!myListings || myListings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg p-12 border border-gray-100 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">No listings yet</h3>
                            <p className="text-gray-500 mb-8">
                                Create your first listing to start finding roommates for your space. 
                                Add your property details and rooms to attract compatible tenants.
                            </p>
                            <Link
                                href="/listings/create"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Create Your First Listing
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {myListings.map((listing: any) => {
                            const availableRooms = listing.rooms?.filter((r: any) => r.available).length || 0
                            const totalRooms = listing.rooms?.length || 0
                            const isActive = availableRooms > 0

                            return (
                                <Link
                                    key={listing.id}
                                    href={`/listings/${listing.id}`}
                                    className="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-orange-200 transition-all duration-300"
                                >
                                    {/* Image Placeholder */}
                                    <div className="h-40 bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center relative">
                                        <svg className="w-16 h-16 text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <span className={`absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full shadow ${
                                            isActive 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-gray-500 text-white'
                                        }`}>
                                            {isActive ? 'Active' : 'Full'}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{listing.city}</h3>
                                        <p className="text-sm text-gray-600 mt-1 truncate">{listing.address}</p>
                                        
                                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                                            <span className="text-xl font-bold text-orange-600">${listing.rent}<span className="text-sm font-normal text-gray-500">/mo</span></span>
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                </svg>
                                                <span>{availableRooms}/{totalRooms} available</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-xs text-gray-400">
                                                Available from {new Date(listing.available_from).toLocaleDateString()}
                                            </span>
                                            <span className="text-sm text-orange-600 font-medium group-hover:translate-x-1 transition-transform">
                                                Manage →
                                            </span>
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
