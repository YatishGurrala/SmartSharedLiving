import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { formatCurrency, formatDate, getStatusColor, isOverdue, percentage } from '@/lib/utils'

interface RentPageProps {
    params: Promise<{ id: string }>
}

export default async function RentPage({ params }: RentPageProps) {
    const { id: houseId } = await params
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

    // Get house
    const { data: house } = await supabase
        .from('houses')
        .select('city')
        .eq('id', houseId)
        .single()

    // Get profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

    // Get rent cycles
    const { data: cycles } = await supabase
        .from('rent_cycles')
        .select('*')
        .eq('house_id', houseId)
        .order('due_date', { ascending: false })

    // Get entries for all cycles
    const cycleIds = cycles?.map(c => c.id) || []
    const { data: entries } = cycleIds.length > 0
        ? await supabase
            .from('rent_entries')
            .select('rent_cycle_id, status, amount, user_id')
            .in('rent_cycle_id', cycleIds)
        : { data: [] }

    const entriesByCycle = (entries || []).reduce((acc: any, e) => {
        if (!acc[e.rent_cycle_id]) acc[e.rent_cycle_id] = []
        acc[e.rent_cycle_id].push(e)
        return acc
    }, {})

    const cyclesWithStats = cycles?.map(c => {
        const cycleEntries = entriesByCycle[c.id] || []
        const paidEntries = cycleEntries.filter((e: any) => e.status === 'paid')
        const userEntry = cycleEntries.find((e: any) => e.user_id === user.id)
        return {
            ...c,
            paidCount: paidEntries.length,
            totalCount: cycleEntries.length,
            collectedAmount: paidEntries.reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0),
            userEntry,
            isOverdue: isOverdue(c.due_date),
        }
    }) || []

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />

            <main className="max-w-4xl mx-auto py-8 px-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/houses" className="hover:text-gray-700">Houses</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}`} className="hover:text-gray-700">{house?.city}</Link>
                    <span>/</span>
                    <span className="text-gray-900">Rent Tracking</span>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Rent Tracking</h1>
                        <p className="text-gray-600">Track rent payments for your house</p>
                    </div>
                    {isAdmin && (
                        <Link
                            href={`/houses/${houseId}/rent/create`}
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                        >
                            + New Rent Cycle
                        </Link>
                    )}
                </div>

                {/* Cycles List */}
                {cyclesWithStats.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Rent Cycles Yet</h3>
                        <p className="text-gray-500 mb-4">Create your first rent cycle to start tracking payments</p>
                        {isAdmin && (
                            <Link
                                href={`/houses/${houseId}/rent/create`}
                                className="inline-flex px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700"
                            >
                                Create Rent Cycle
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {cyclesWithStats.map((cycle: any) => (
                            <div key={cycle.id} className="bg-white rounded-xl border border-gray-200 p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900">{cycle.name}</h3>
                                            {cycle.isOverdue && cycle.paidCount < cycle.totalCount && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                                    Overdue
                                                </span>
                                            )}
                                            {cycle.paidCount === cycle.totalCount && cycle.totalCount > 0 && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                    Complete
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Due: {formatDate(cycle.due_date)} · Total: {formatCurrency(cycle.total_amount)}
                                        </p>
                                    </div>
                                    <Link
                                        href={`/houses/${houseId}/rent/${cycle.id}`}
                                        className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                                    >
                                        View Details →
                                    </Link>
                                </div>

                                {/* Your Status */}
                                {cycle.userEntry && (
                                    <div className={`p-3 rounded-lg mb-4 ${
                                        cycle.userEntry.status === 'paid' 
                                            ? 'bg-green-50 border border-green-200' 
                                            : cycle.isOverdue 
                                                ? 'bg-red-50 border border-red-200'
                                                : 'bg-yellow-50 border border-yellow-200'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">Your Payment:</span>
                                                <span className={`text-sm px-2 py-0.5 rounded ${getStatusColor(cycle.userEntry.status)}`}>
                                                    {cycle.userEntry.status}
                                                </span>
                                            </div>
                                            <span className="font-semibold">{formatCurrency(cycle.userEntry.amount)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Progress */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-teal-500 rounded-full transition-all"
                                                style={{ width: `${percentage(cycle.paidCount, cycle.totalCount)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-500 whitespace-nowrap">
                                            {cycle.paidCount}/{cycle.totalCount} paid
                                        </span>
                                    </div>
                                    <span className="ml-4 text-sm font-medium text-gray-700">
                                        {formatCurrency(cycle.collectedAmount)} collected
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
