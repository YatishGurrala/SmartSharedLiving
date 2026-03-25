import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import ChoreActions from './ChoreActions'

interface ChoresPageProps {
    params: Promise<{ id: string }>
}

export default async function ChoresPage({ params }: ChoresPageProps) {
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

    // Get chores with assigned user info
    const { data: chores } = await supabase
        .from('chores')
        .select(`
            *,
            assigned_profile:profiles!chores_assigned_to_fkey(name),
            creator_profile:profiles!chores_created_by_fkey(name)
        `)
        .eq('house_id', houseId)
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

    // Get house members for filtering
    const { data: members } = await supabase
        .from('house_members')
        .select('user_id, profiles(name)')
        .eq('house_id', houseId)

    const pendingChores = chores?.filter(c => c.status === 'pending') || []
    const completedChores = chores?.filter(c => c.status === 'completed') || []

    const formatDate = (date: string | null) => {
        if (!date) return 'No due date'
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    }

    const isOverdue = (dueDate: string | null) => {
        if (!dueDate) return false
        return new Date(dueDate) < new Date()
    }

    const getRecurrenceLabel = (recurrence: string) => {
        const labels: Record<string, string> = {
            'once': 'One-time',
            'daily': 'Daily',
            'weekly': 'Weekly',
            'biweekly': 'Bi-weekly',
            'monthly': 'Monthly',
        }
        return labels[recurrence] || recurrence
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
                        <h1 className="text-2xl font-bold mt-2">Chores</h1>
                    </div>
                    {isAdmin && (
                        <Link
                            href={`/houses/${houseId}/chores/create`}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Create Chore
                        </Link>
                    )}
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{pendingChores.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600">Overdue</p>
                        <p className="text-2xl font-bold text-red-600">
                            {pendingChores.filter(c => isOverdue(c.due_date)).length}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-green-600">{completedChores.length}</p>
                    </div>
                </div>

                {/* Pending Chores */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold mb-4">Pending Chores</h2>
                    {pendingChores.length === 0 ? (
                        <div className="bg-white p-6 rounded-lg shadow-sm text-center text-gray-500">
                            No pending chores. {isAdmin ? 'Create one to get started!' : ''}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingChores.map((chore) => (
                                <div
                                    key={chore.id}
                                    className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${
                                        isOverdue(chore.due_date)
                                            ? 'border-red-500'
                                            : 'border-yellow-500'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{chore.title}</h3>
                                            {chore.description && (
                                                <p className="text-sm text-gray-600 mt-1">{chore.description}</p>
                                            )}
                                            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                                                <span>
                                                    Assigned: {chore.assigned_profile?.name || 'Unassigned'}
                                                </span>
                                                <span>|</span>
                                                <span className={isOverdue(chore.due_date) ? 'text-red-600 font-medium' : ''}>
                                                    Due: {formatDate(chore.due_date)}
                                                    {isOverdue(chore.due_date) && ' (Overdue)'}
                                                </span>
                                                <span>|</span>
                                                <span>{getRecurrenceLabel(chore.recurrence)}</span>
                                            </div>
                                        </div>
                                        <ChoreActions
                                            chore={chore}
                                            houseId={houseId}
                                            isAdmin={isAdmin}
                                            currentUserId={user.id}
                                            members={(members || []) as any}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Completed Chores */}
                {completedChores.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold mb-4">Completed Chores</h2>
                        <div className="space-y-3">
                            {completedChores.slice(0, 10).map((chore) => (
                                <div
                                    key={chore.id}
                                    className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500 opacity-75"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-medium line-through text-gray-500">{chore.title}</h3>
                                            <p className="text-sm text-gray-400">
                                                Completed {formatDate(chore.completed_at)}
                                            </p>
                                        </div>
                                        {isAdmin && (
                                            <ChoreActions
                                                chore={chore}
                                                houseId={houseId}
                                                isAdmin={isAdmin}
                                                currentUserId={user.id}
                                                members={(members || []) as any}
                                                showCompleteOnly={false}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
