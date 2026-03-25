import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/app/components/Navbar'
import { createNotice } from '../actions'

interface CreateNoticePageProps {
    params: Promise<{ id: string }>
}

export default async function CreateNoticePage({ params }: CreateNoticePageProps) {
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
        redirect(`/houses/${houseId}/notices`)
    }

    // Get house name
    const { data: house } = await supabase
        .from('houses')
        .select('name')
        .eq('id', houseId)
        .single()

    const handleSubmit = async (formData: FormData) => {
        'use server'
        const result = await createNotice(houseId, formData)
        if (!result.error) {
            redirect(`/houses/${houseId}/notices`)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName={profile?.name || user.email || 'User'} />
            <main className="max-w-2xl mx-auto px-4 py-8">
                <Link href={`/houses/${houseId}/notices`} className="text-blue-600 hover:underline text-sm">
                    &larr; Back to Notices
                </Link>
                <h1 className="text-2xl font-bold mt-4 mb-6">Post Notice</h1>

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
                            placeholder="e.g., Important: Internet maintenance this weekend"
                        />
                    </div>

                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                            Content *
                        </label>
                        <textarea
                            id="content"
                            name="content"
                            required
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Write your notice here..."
                        />
                    </div>

                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="is_pinned"
                                value="true"
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">📌 Pin this notice</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="requires_acknowledgement"
                                value="true"
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Require acknowledgement</span>
                        </label>
                    </div>

                    <p className="text-sm text-gray-500">
                        Pinned notices appear at the top of the list. Notices requiring acknowledgement will prompt all members to confirm they&apos;ve read them.
                    </p>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                        >
                            Post Notice
                        </button>
                        <Link
                            href={`/houses/${houseId}/notices`}
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
