import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import ExitRequestActions from './ExitRequestActions'
import SubmitExitRequestForm from './SubmitExitRequestForm'

interface ExitRequestsPageProps {
    params: Promise<{ id: string }>
}

export default async function ExitRequestsPage({ params }: ExitRequestsPageProps) {
    const { id: houseId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/auth/login')
    }

    // Get user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    // Check membership
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .single()

    if (!membership) {
        redirect('/houses')
    }

    const isAdmin = membership.role === 'admin'

    // Get house info
    const { data: house } = await supabase
        .from('houses')
        .select('name')
        .eq('id', houseId)
        .single()

    // Get exit requests
    const { data: exitRequests } = await supabase
        .from('exit_requests')
        .select(`
            *,
            user_profile:profiles!exit_requests_user_id_fkey(full_name),
            reviewer_profile:profiles!exit_requests_reviewed_by_fkey(full_name)
        `)
        .eq('house_id', houseId)
        .order('created_at', { ascending: false })

    // Check if current user has a pending request
    const userPendingRequest = exitRequests?.find(
        r => r.user_id === user.id && r.status === 'pending'
    )

    const pendingRequests = exitRequests?.filter(r => r.status === 'pending') || []
    const resolvedRequests = exitRequests?.filter(r => r.status !== 'pending') || []

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800'
            case 'approved':
                return 'bg-green-100 text-green-800'
            case 'rejected':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />
            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <Link href={`/houses/${houseId}`} className="text-blue-600 hover:underline text-sm">
                            &larr; Back to {house?.name || 'House'}
                        </Link>
                        <h1 className="text-2xl font-bold mt-2">Exit Requests</h1>
                    </div>
                </div>

                {/* Submit Exit Request Form (for non-admins or admins with multiple members) */}
                {!userPendingRequest && (
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">Request to Leave</h2>
                        <SubmitExitRequestForm houseId={houseId} />
                    </section>
                )}

                {/* User's pending request */}
                {userPendingRequest && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-medium text-yellow-800">Your Exit Request is Pending</p>
                                <p className="text-sm text-yellow-700 mt-1">
                                    Requested exit date: {formatDate(userPendingRequest.requested_exit_date)}
                                </p>
                                {userPendingRequest.reason && (
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Reason: {userPendingRequest.reason}
                                    </p>
                                )}
                            </div>
                            <ExitRequestActions
                                request={userPendingRequest}
                                houseId={houseId}
                                isAdmin={false}
                                isOwnRequest={true}
                            />
                        </div>
                    </div>
                )}

                {/* Pending Requests (Admin view) */}
                {isAdmin && pendingRequests.length > 0 && (
                    <section className="mb-8">
                        <h2 className="text-lg font-semibold mb-4">Pending Requests</h2>
                        <div className="space-y-4">
                            {pendingRequests.map((request) => (
                                <div key={request.id} className="bg-white p-5 rounded-lg shadow-sm border border-yellow-200">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-semibold">
                                                    {request.user_profile?.full_name || 'Unknown'}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                                                    {request.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-2">
                                                <strong>Requested exit date:</strong> {formatDate(request.requested_exit_date)}
                                            </p>
                                            {request.reason && (
                                                <p className="text-sm text-gray-600 mt-1">
                                                    <strong>Reason:</strong> {request.reason}
                                                </p>
                                            )}
                                            <p className="text-sm text-gray-500 mt-2">
                                                Submitted {formatDate(request.created_at)}
                                            </p>
                                        </div>
                                        {request.user_id !== user.id && (
                                            <ExitRequestActions
                                                request={request}
                                                houseId={houseId}
                                                isAdmin={true}
                                                isOwnRequest={false}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Resolved Requests History */}
                {resolvedRequests.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold mb-4">Request History</h2>
                        <div className="space-y-3">
                            {resolvedRequests.map((request) => (
                                <div key={request.id} className="bg-white p-4 rounded-lg shadow-sm opacity-75">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-medium">
                                                    {request.user_profile?.full_name || 'Unknown'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                                                    {request.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {request.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                                                {request.reviewer_profile?.full_name || 'Admin'} on{' '}
                                                {formatDate(request.reviewed_at)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {exitRequests?.length === 0 && !userPendingRequest && (
                    <p className="text-gray-500 text-center py-8">No exit requests yet.</p>
                )}
            </main>
        </div>
    )
}
