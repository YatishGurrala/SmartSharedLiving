import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { createChore } from '../actions'

interface CreateChorePageProps {
    params: Promise<{ id: string }>
}

export default async function CreateChorePage({ params }: CreateChorePageProps) {
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

    // Check if admin
    const { data: membership } = await supabase
        .from('house_members')
        .select('role')
        .eq('house_id', houseId)
        .eq('user_id', user.id)
        .single()

    if (!membership || membership.role !== 'admin') {
        redirect(`/houses/${houseId}/chores`)
    }

    // Get house members for assignment
    const { data: members } = await supabase
        .from('house_members')
        .select('user_id, profiles(name)')
        .eq('house_id', houseId)

    // Get house name
    const { data: house } = await supabase
        .from('houses')
        .select('name')
        .eq('id', houseId)
        .single()

    const handleSubmit = async (formData: FormData) => {
        'use server'
        const result = await createChore(houseId, formData)
        if (!result.error) {
            redirect(`/houses/${houseId}/chores`)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />
            <main className="max-w-2xl mx-auto px-4 py-8">
                <Link href={`/houses/${houseId}/chores`} className="text-blue-600 hover:underline text-sm">
                    &larr; Back to Chores
                </Link>
                <h1 className="text-2xl font-bold mt-4 mb-6">Create Chore</h1>

                <form action={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                            Title *
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Clean the kitchen"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add details about the chore..."
                        />
                    </div>

                    <div>
                        <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
                            Assign To
                        </label>
                        <select
                            id="assigned_to"
                            name="assigned_to"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Unassigned</option>
                            {members?.map((member) => (
                                <option key={member.user_id} value={member.user_id}>
                                    {(member.profiles as any)?.name || 'Unknown'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                            Due Date
                        </label>
                        <input
                            type="date"
                            id="due_date"
                            name="due_date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700 mb-1">
                            Recurrence
                        </label>
                        <select
                            id="recurrence"
                            name="recurrence"
                            defaultValue="once"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="once">One-time</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Bi-weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">
                            Note: Recurring chores will need to be manually re-created after completion in MVP
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                        >
                            Create Chore
                        </button>
                        <Link
                            href={`/houses/${houseId}/chores`}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-center"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </main>
        </div>
    )
}
