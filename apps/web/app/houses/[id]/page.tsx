import { createClient } from '@/utils/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Navbar from '../../components/Navbar'
import InviteMemberForm from './InviteMemberForm'
import { leaveHouse } from '../actions'
import Link from 'next/link'

interface HouseDetailPageProps {
    params: Promise<{ id: string }>
}

export default async function HouseDetailPage({ params }: HouseDetailPageProps) {
    const { id } = await params
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

    // Get house details
    const { data: house, error: houseError } = await supabase
        .from('houses')
        .select('*')
        .eq('id', id)
        .single()

    if (houseError || !house) {
        notFound()
    }

    // Check if user is a member
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', id)
        .eq('user_id', user.id)
        .single()

    if (!membership) {
        redirect('/houses')
    }

    const isAdmin = membership.role === 'admin'

    // Get all members with their profiles
    const { data: members } = await supabase
        .from('house_members')
        .select(`
            user_id,
            role,
            status,
            profiles (
                name,
                occupation,
                avatar,
                bio
            )
        `)
        .eq('house_id', id)

    // Dashboard Data: Agreements needing acceptance
    const { data: pendingAgreements } = await supabase
        .from('agreements')
        .select('id, title')
        .eq('house_id', id)
        .eq('status', 'active')
        .not('id', 'in', `(SELECT agreement_id FROM agreement_acceptances WHERE user_id = '${user.id}')`)

    // Dashboard Data: Pending/Overdue chores assigned to user
    const { data: userChores } = await supabase
        .from('chores')
        .select('id, title, due_date, status')
        .eq('house_id', id)
        .eq('assigned_to', user.id)
        .eq('status', 'pending')

    const overdueChores = userChores?.filter(c => c.due_date && new Date(c.due_date) < new Date()) || []

    // Dashboard Data: Unacknowledged notices
    const { data: unacknowledgedNotices } = await supabase
        .from('notices')
        .select('id, title')
        .eq('house_id', id)
        .eq('requires_acknowledgement', true)
        .not('id', 'in', `(SELECT notice_id FROM notice_acknowledgements WHERE user_id = '${user.id}')`)

    // Dashboard Data: Current rent cycle status for user
    const { data: currentRentEntry } = await supabase
        .from('rent_entries')
        .select('id, amount, status, rent_cycles(label, due_date)')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    // Dashboard Data: Recent activity (last 5)
    const { data: recentActivity } = await supabase
        .from('activity_logs')
        .select('id, activity_type, metadata, created_at, profiles(full_name)')
        .eq('house_id', id)
        .order('created_at', { ascending: false })
        .limit(5)

    const leaveHouseWithId = leaveHouse.bind(null, id)
    const memberCount = members?.length || 0
    const progressPercentage = Math.min((memberCount / house.target_members) * 100, 100)

    const formatActivityType = (type: string) => {
        const labels: Record<string, string> = {
            'agreement_created': 'created an agreement',
            'agreement_accepted': 'accepted an agreement',
            'rent_cycle_created': 'created a rent cycle',
            'rent_paid': 'marked rent as paid',
            'chore_created': 'created a chore',
            'chore_completed': 'completed a chore',
            'notice_posted': 'posted a notice',
            'exit_request_submitted': 'submitted an exit request',
            'member_joined': 'joined the house',
            'member_left': 'left the house',
        }
        return labels[type] || type.replace(/_/g, ' ')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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

                {/* House Header */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 mb-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">{house.city}</h1>
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                                            house.status === 'active' 
                                                ? 'bg-green-400/20 text-green-100' 
                                                : 'bg-yellow-400/20 text-yellow-100'
                                        }`}>
                                            {house.status === 'active' ? '✓ Active' : '⏳ Forming'}
                                        </span>
                                        {isAdmin && (
                                            <span className="px-3 py-1 text-sm font-medium rounded-full bg-white/20 text-white">
                                                👑 You're the Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {!isAdmin && (
                                <div className="flex gap-2">
                                    <Link
                                        href={`/houses/${id}/exit-requests`}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Exit Requests
                                    </Link>
                                </div>
                            )}
                            {isAdmin && (
                                <Link
                                    href={`/houses/${id}/exit-requests`}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                                >
                                    Exit Requests
                                </Link>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-teal-100">Group Progress</span>
                                <span className="font-semibold">{memberCount} / {house.target_members} members</span>
                            </div>
                            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-white rounded-full transition-all duration-500"
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <Link href={`/houses/${id}/agreements`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all">
                        <div className="text-2xl mb-2">📋</div>
                        <h3 className="font-semibold text-gray-900">Agreements</h3>
                        <p className="text-sm text-gray-500">House rules</p>
                    </Link>
                    <Link href={`/houses/${id}/rent`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all">
                        <div className="text-2xl mb-2">💰</div>
                        <h3 className="font-semibold text-gray-900">Rent</h3>
                        <p className="text-sm text-gray-500">Track payments</p>
                    </Link>
                    <Link href={`/houses/${id}/chores`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all">
                        <div className="text-2xl mb-2">🧹</div>
                        <h3 className="font-semibold text-gray-900">Chores</h3>
                        <p className="text-sm text-gray-500">Tasks & duties</p>
                    </Link>
                    <Link href={`/houses/${id}/notices`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all">
                        <div className="text-2xl mb-2">📢</div>
                        <h3 className="font-semibold text-gray-900">Notices</h3>
                        <p className="text-sm text-gray-500">Announcements</p>
                    </Link>
                    <Link href={`/houses/${id}/members`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all">
                        <div className="text-2xl mb-2">👥</div>
                        <h3 className="font-semibold text-gray-900">Members</h3>
                        <p className="text-sm text-gray-500">Manage people</p>
                    </Link>
                    <Link href={`/houses/${id}/settings`} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-teal-200 hover:shadow-md transition-all">
                        <div className="text-2xl mb-2">⚙️</div>
                        <h3 className="font-semibold text-gray-900">Settings</h3>
                        <p className="text-sm text-gray-500">House options</p>
                    </Link>
                </div>

                {/* Dashboard Alerts */}
                {((pendingAgreements && pendingAgreements.length > 0) || 
                  overdueChores.length > 0 || 
                  (unacknowledgedNotices && unacknowledgedNotices.length > 0) ||
                  currentRentEntry) && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Action Required</h2>
                        <div className="space-y-3">
                            {pendingAgreements && pendingAgreements.length > 0 && (
                                <Link href={`/houses/${id}/agreements`} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
                                    <span className="text-yellow-600 text-xl">📋</span>
                                    <div>
                                        <p className="font-medium text-yellow-800">
                                            {pendingAgreements.length} agreement{pendingAgreements.length > 1 ? 's' : ''} need your acceptance
                                        </p>
                                        <p className="text-sm text-yellow-700">{pendingAgreements[0].title}</p>
                                    </div>
                                </Link>
                            )}
                            {overdueChores.length > 0 && (
                                <Link href={`/houses/${id}/chores`} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                    <span className="text-red-600 text-xl">⏰</span>
                                    <div>
                                        <p className="font-medium text-red-800">
                                            {overdueChores.length} overdue chore{overdueChores.length > 1 ? 's' : ''}
                                        </p>
                                        <p className="text-sm text-red-700">{overdueChores[0].title}</p>
                                    </div>
                                </Link>
                            )}
                            {unacknowledgedNotices && unacknowledgedNotices.length > 0 && (
                                <Link href={`/houses/${id}/notices`} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                                    <span className="text-blue-600 text-xl">📢</span>
                                    <div>
                                        <p className="font-medium text-blue-800">
                                            {unacknowledgedNotices.length} notice{unacknowledgedNotices.length > 1 ? 's' : ''} need acknowledgement
                                        </p>
                                        <p className="text-sm text-blue-700">{unacknowledgedNotices[0].title}</p>
                                    </div>
                                </Link>
                            )}
                            {currentRentEntry && (
                                <Link href={`/houses/${id}/rent`} className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                                    <span className="text-orange-600 text-xl">💰</span>
                                    <div>
                                        <p className="font-medium text-orange-800">
                                            Rent payment pending
                                        </p>
                                        <p className="text-sm text-orange-700">
                                            ${currentRentEntry.amount} due for {(currentRentEntry.rent_cycles as any)?.label || 'current cycle'}
                                        </p>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                {recentActivity && recentActivity.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
                        <div className="space-y-3">
                            {recentActivity.map((activity: any) => (
                                <div key={activity.id} className="flex items-center gap-3 text-sm">
                                    <span className="text-gray-400">
                                        {new Date(activity.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-gray-600">
                                        {activity.profiles?.full_name || 'Someone'}{' '}
                                        {formatActivityType(activity.activity_type)}
                                        {activity.metadata?.title && ` "${activity.metadata.title}"`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Members Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Members</h2>
                            <p className="text-sm text-gray-500 mt-1">People in your house group</p>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 rounded-lg">
                            <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-sm font-semibold text-teal-700">{memberCount} Members</span>
                        </div>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                        {members?.map((member: any) => (
                            <div key={member.user_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-400 flex items-center justify-center text-white font-bold shadow-md">
                                        {member.profiles?.name?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-gray-900">
                                                {member.profiles?.name || 'Unknown'}
                                            </p>
                                            {member.user_id === user.id && (
                                                <span className="text-xs text-teal-600 font-medium">(You)</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            {member.profiles?.occupation || 'No occupation set'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    member.role === 'admin' 
                                        ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200' 
                                        : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {member.role === 'admin' ? '👑 Admin' : 'Member'}
                                </span>
                            </div>
                        ))}
                    </div>

                    {memberCount < house.target_members && (
                        <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
                            <div className="flex items-center gap-2 text-sm text-teal-700">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Looking for {house.target_members - memberCount} more member{house.target_members - memberCount > 1 ? 's' : ''}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Invite Section (Admin only) */}
                {isAdmin && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Invite Members</h2>
                                <p className="text-sm text-gray-500">Add new people to your house</p>
                            </div>
                        </div>
                        <InviteMemberForm houseId={id} />
                    </div>
                )}
            </main>
        </div>
    )
}
