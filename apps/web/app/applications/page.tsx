import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '../components/Navbar'
import Link from 'next/link'
import ApplicationActions from './ApplicationActions'

export default async function ApplicationsPage() {
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

    // Get user's sent applications with listing details
    const { data: myApplications } = await supabase
        .from('applications')
        .select(`
            *,
            listings:target_id (
                city,
                address,
                rent
            )
        `)
        .eq('applicant_user_id', user.id)
        .order('created_at', { ascending: false })

    // Get applications received for user's listings
    const { data: userListings } = await supabase
        .from('listings')
        .select('id')
        .eq('owner_id', user.id)

    const listingIds = userListings?.map((l: any) => l.id) || []

    const { data: receivedApplications } = listingIds.length > 0
        ? await supabase
            .from('applications')
            .select(`
                *,
                profiles:applicant_user_id (
                    name,
                    occupation,
                    bio,
                    avatar
                ),
                listings:target_id (
                    city,
                    address
                )
            `)
            .in('target_id', listingIds)
            .order('created_at', { ascending: false })
        : { data: [] }

    // Stats
    const pendingSent = myApplications?.filter((a: any) => a.status === 'pending').length || 0
    const acceptedSent = myApplications?.filter((a: any) => a.status === 'accepted').length || 0
    const pendingReceived = receivedApplications?.filter((a: any) => a.status === 'pending').length || 0

    const statusConfig: Record<string, { bg: string, text: string, icon: string }> = {
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
        accepted: { bg: 'bg-green-100', text: 'text-green-800', icon: '✓' },
        rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: '✗' },
        withdrawn: { bg: 'bg-gray-100', text: 'text-gray-800', icon: '↩' },
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Hero Section */}
                <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold mb-2">Applications</h1>
                        <p className="text-rose-100 max-w-xl">
                            Track your room applications and manage incoming requests. 
                            Stay on top of your housing search progress.
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className="text-2xl font-bold text-gray-900">{myApplications?.length || 0}</div>
                        <div className="text-sm text-gray-500">Sent</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className="text-2xl font-bold text-yellow-600">{pendingSent}</div>
                        <div className="text-sm text-gray-500">Pending</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className="text-2xl font-bold text-green-600">{acceptedSent}</div>
                        <div className="text-sm text-gray-500">Accepted</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className="text-2xl font-bold text-rose-600">{pendingReceived}</div>
                        <div className="text-sm text-gray-500">Received (Pending)</div>
                    </div>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Sent Applications */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">My Applications</h3>
                                    <p className="text-sm text-gray-500">Applications you've sent</p>
                                </div>
                            </div>
                        </div>
                        {!myApplications || myApplications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <p className="text-gray-500 mb-4">You haven't applied to any listings yet.</p>
                                <Link href="/rooms" className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium">
                                    Browse available rooms
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {myApplications.map((app: any) => {
                                    const status = statusConfig[app.status] || statusConfig.pending
                                    return (
                                        <div key={app.id} className="p-5 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="font-semibold text-gray-900">
                                                        {app.listings?.city || 'Unknown Listing'}
                                                    </p>
                                                    <p className="text-sm text-gray-500">{app.listings?.address}</p>
                                                </div>
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.text}`}>
                                                    {status.icon} {app.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-400">
                                                    Applied {new Date(app.created_at).toLocaleDateString()}
                                                </span>
                                                {app.listings?.rent && (
                                                    <span className="font-medium text-rose-600">${app.listings.rent}/mo</span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Received Applications */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Received Applications</h3>
                                    <p className="text-sm text-gray-500">Applications for your listings</p>
                                </div>
                            </div>
                        </div>
                        {!receivedApplications || receivedApplications.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <p className="text-gray-500 mb-4">No applications received yet.</p>
                                <Link href="/listings/create" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium">
                                    Create a listing
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {receivedApplications.map((app: any) => {
                                    const status = statusConfig[app.status] || statusConfig.pending
                                    return (
                                        <div key={app.id} className="p-5 hover:bg-gray-50 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold shadow-md">
                                                        {app.profiles?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">
                                                            {app.profiles?.name || 'Anonymous'}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {app.profiles?.occupation || 'No occupation'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${status.bg} ${status.text}`}>
                                                    {status.icon} {app.status}
                                                </span>
                                            </div>

                                            {app.listings && (
                                                <p className="text-xs text-gray-400 mb-2">
                                                    For: {app.listings.city} - {app.listings.address}
                                                </p>
                                            )}

                                            {app.profiles?.bio && (
                                                <p className="text-sm text-gray-600 line-clamp-2 mb-3 bg-gray-50 p-2 rounded-lg">
                                                    "{app.profiles.bio}"
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-400">
                                                    {new Date(app.created_at).toLocaleDateString()}
                                                </span>
                                                {app.status === 'pending' && (
                                                    <ApplicationActions applicationId={app.id} />
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
