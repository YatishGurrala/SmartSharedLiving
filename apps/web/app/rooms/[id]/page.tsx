import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Navbar from '../../components/Navbar'
import Link from 'next/link'
import ApplyButton from './ApplyButton'

interface RoomDetailPageProps {
    params: Promise<{ id: string }>
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
    const supabase = await createClient()
    const { id } = await params

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/auth/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

    // Fetch listing with owner details
    const { data: listing } = await supabase
        .from('listings')
        .select(`
            *,
            rooms (id, rent, available),
            profiles:owner_id (name, bio, occupation, avatar)
        `)
        .eq('id', id)
        .single()

    if (!listing) {
        notFound()
    }

    // Check if user already applied
    const { data: existingApplication } = await supabase
        .from('applications')
        .select('id, status')
        .eq('applicant_user_id', user.id)
        .eq('target_id', id)
        .single()

    const isOwner = listing.owner_id === user.id
    const ownerProfile = listing.profiles as any
    const availableRooms = listing.rooms?.filter((r: any) => r.available) || []
    const totalRooms = listing.rooms?.length || 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Back Link */}
                <Link
                    href="/rooms"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 group"
                >
                    <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to listings
                </Link>

                {/* Image Gallery Placeholder */}
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl h-64 md:h-96 mb-8 flex items-center justify-center">
                    <div className="text-center">
                        <svg className="w-20 h-20 text-indigo-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-indigo-400">Property Photos</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Title Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{listing.city}</h1>
                                    <p className="text-gray-500">{listing.address}</p>
                                </div>
                                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                                    availableRooms.length > 0
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {availableRooms.length > 0 ? 'Available' : 'Occupied'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-indigo-600">${listing.rent}</p>
                                    <p className="text-sm text-gray-500">per month</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
                                    <p className="text-sm text-gray-500">Total Rooms</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-green-600">{availableRooms.length}</p>
                                    <p className="text-sm text-gray-500">Available</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                    <p className="text-lg font-medium text-gray-900">
                                        {new Date(listing.available_from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </p>
                                    <p className="text-sm text-gray-500">Move-in</p>
                                </div>
                            </div>
                        </div>

                        {/* Rooms Section */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Rooms</h2>
                            {totalRooms === 0 ? (
                                <p className="text-gray-500">No room details available.</p>
                            ) : (
                                <div className="space-y-3">
                                    {listing.rooms?.map((room: any, index: number) => (
                                        <div
                                            key={room.id}
                                            className={`flex items-center justify-between p-4 rounded-xl ${
                                                room.available
                                                    ? 'bg-green-50 border border-green-100'
                                                    : 'bg-gray-50 border border-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    room.available ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">Room {index + 1}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {room.available ? 'Available now' : 'Currently occupied'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-gray-900">${room.rent}/mo</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Host Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-sm font-medium text-gray-500 mb-4">HOSTED BY</h3>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-lg">
                                    {(ownerProfile?.name || 'H').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">{ownerProfile?.name || 'Host'}</p>
                                    {ownerProfile?.occupation && (
                                        <p className="text-sm text-gray-500">{ownerProfile.occupation}</p>
                                    )}
                                </div>
                            </div>
                            {ownerProfile?.bio && (
                                <p className="text-sm text-gray-600 mb-4">{ownerProfile.bio}</p>
                            )}
                            
                            {!isOwner && (
                                <Link
                                    href={`/messages?recipient=${listing.owner_id}`}
                                    className="w-full px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center block"
                                >
                                    Message Host
                                </Link>
                            )}
                        </div>

                        {/* Apply Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            {isOwner ? (
                                <div className="text-center">
                                    <p className="text-gray-500 mb-4">This is your listing</p>
                                    <Link
                                        href="/listings"
                                        className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-center block"
                                    >
                                        Manage Listing
                                    </Link>
                                </div>
                            ) : existingApplication ? (
                                <div className="text-center">
                                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${
                                        existingApplication.status === 'pending' ? 'bg-yellow-100' :
                                        existingApplication.status === 'accepted' ? 'bg-green-100' : 'bg-red-100'
                                    }`}>
                                        {existingApplication.status === 'pending' && (
                                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        )}
                                        {existingApplication.status === 'accepted' && (
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                        {existingApplication.status === 'rejected' && (
                                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <p className="font-medium text-gray-900 capitalize">{existingApplication.status}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {existingApplication.status === 'pending' && 'Your application is being reviewed'}
                                        {existingApplication.status === 'accepted' && 'Congratulations! Your application was accepted'}
                                        {existingApplication.status === 'rejected' && 'Unfortunately, your application was not accepted'}
                                    </p>
                                </div>
                            ) : availableRooms.length > 0 ? (
                                <>
                                    <p className="text-center text-gray-600 mb-4">
                                        Interested in this place? Apply now to get in touch with the host.
                                    </p>
                                    <ApplyButton listingId={listing.id} />
                                </>
                            ) : (
                                <div className="text-center">
                                    <p className="text-gray-500">No rooms currently available</p>
                                </div>
                            )}
                        </div>

                        {/* Share */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Share Listing
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
