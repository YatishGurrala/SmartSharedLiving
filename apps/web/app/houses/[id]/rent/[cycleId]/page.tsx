import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { formatCurrency, formatDate, getStatusColor, getInitials, isOverdue, percentage } from '@/lib/utils'
import RentEntryActions from './RentEntryActions'

interface RentCycleDetailPageProps {
    params: Promise<{ id: string; cycleId: string }>
}

export default async function RentCycleDetailPage({ params }: RentCycleDetailPageProps) {
    const { id: houseId, cycleId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    // Check membership
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .single()

    if (!membership) redirect('/houses')

    const isAdmin = membership.role === 'admin'

    // Get profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    // Get rent cycle
    const { data: cycle } = await supabase
        .from('rent_cycles')
        .select('*')
        .eq('id', cycleId)
        .single()

    if (!cycle) redirect(`/houses/${houseId}/rent`)

    // Get entries with user profiles
    const { data: entries } = await supabase
        .from('rent_entries')
        .select(`
            *,
            profiles:user_id (
                name,
                avatar
            ),
            marker:marked_by (
                name
            )
        `)
        .eq('rent_cycle_id', cycleId)
        .order('created_at', { ascending: true })

    const cycleIsOverdue = isOverdue(cycle.due_date)
    const paidEntries = entries?.filter(e => e.status === 'paid') || []
    const collectedAmount = paidEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0)

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-4xl mx-auto py-8 px-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/houses" className="hover:text-gray-700">Houses</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}`} className="hover:text-gray-700">House</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}/rent`} className="hover:text-gray-700">Rent</Link>
                    <span>/</span>
                    <span className="text-gray-900">{cycle.name}</span>
                </div>

                {/* Header */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{cycle.name}</h1>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span>Period: {formatDate(cycle.start_date)} - {formatDate(cycle.due_date)}</span>
                                {cycleIsOverdue && paidEntries.length < (entries?.length || 0) && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                                        Overdue
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(cycle.total_amount)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500">Collected</p>
                            <p className="text-xl font-bold text-green-600">{formatCurrency(collectedAmount)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500">Remaining</p>
                            <p className="text-xl font-bold text-gray-900">{formatCurrency(cycle.total_amount - collectedAmount)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-500">Progress</p>
                            <p className="text-xl font-bold text-gray-900">
                                {paidEntries.length}/{entries?.length || 0} paid
                            </p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-teal-500 rounded-full transition-all"
                            style={{ width: `${percentage(collectedAmount, cycle.total_amount)}%` }}
                        />
                    </div>

                    {cycle.notes && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">{cycle.notes}</p>
                        </div>
                    )}
                </div>

                {/* Member Payments */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Member Payments</h2>

                    <div className="space-y-3">
                        {entries?.map((entry: any) => {
                            const memberProfile = entry.profiles
                            const entryIsOverdue = entry.status === 'pending' && cycleIsOverdue

                            return (
                                <div 
                                    key={entry.id} 
                                    className={`p-4 rounded-lg border ${
                                        entry.status === 'paid' 
                                            ? 'border-green-200 bg-green-50'
                                            : entryIsOverdue
                                                ? 'border-red-200 bg-red-50'
                                                : 'border-gray-200 bg-white'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                                                {memberProfile?.avatar ? (
                                                    <img src={memberProfile.avatar} alt="" className="w-10 h-10 rounded-full" />
                                                ) : (
                                                    getInitials(memberProfile?.name)
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {memberProfile?.name || 'Unknown'}
                                                    {entry.user_id === user.id && ' (You)'}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(entryIsOverdue ? 'overdue' : entry.status)}`}>
                                                        {entryIsOverdue ? 'overdue' : entry.status}
                                                    </span>
                                                    {entry.paid_at && (
                                                        <span className="text-xs text-gray-500">
                                                            Paid {formatDate(entry.paid_at)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-semibold text-gray-900">
                                                {formatCurrency(entry.amount)}
                                            </span>
                                            
                                            {isAdmin && entry.status !== 'paid' && (
                                                <RentEntryActions
                                                    entryId={entry.id}
                                                    houseId={houseId}
                                                    currentStatus={entry.status}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {entry.notes && (
                                        <p className="mt-2 text-sm text-gray-600 pl-13">{entry.notes}</p>
                                    )}

                                    {entry.marker?.name && entry.status === 'paid' && (
                                        <p className="mt-1 text-xs text-gray-400 pl-13">
                                            Marked by {entry.marker.name}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </main>
        </div>
    )
}
