'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAgreement } from '../actions'
import Navbar from '@/app/components/Navbar'
import Link from 'next/link'

interface CreateAgreementPageProps {
    params: Promise<{ id: string }>
}

export default function CreateAgreementPage({ params }: CreateAgreementPageProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [houseId, setHouseId] = useState<string>('')

    // Unwrap params
    useState(() => {
        params.then(p => setHouseId(p.id))
    })

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)

        const result = await createAgreement(houseId, formData)
        
        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            router.push(`/houses/${houseId}/agreements`)
        }
    }

    if (!houseId) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar userName="User" />

            <main className="max-w-3xl mx-auto py-8 px-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/houses" className="hover:text-gray-700">Houses</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}`} className="hover:text-gray-700">House</Link>
                    <span>/</span>
                    <Link href={`/houses/${houseId}/agreements`} className="hover:text-gray-700">Agreements</Link>
                    <span>/</span>
                    <span className="text-gray-900">Create</span>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Agreement</h1>
                    <p className="text-gray-600 mb-6">
                        Draft a new house agreement. You can edit it before activating.
                    </p>

                    <form action={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Agreement Title
                            </label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                required
                                placeholder="e.g., House Rules & Responsibilities"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                                Agreement Content
                            </label>
                            <textarea
                                id="content"
                                name="content"
                                rows={15}
                                required
                                placeholder="Write your house agreement here. Include rules about:&#10;- Common areas&#10;- Quiet hours&#10;- Guest policies&#10;- Cleaning responsibilities&#10;- Rent and bills&#10;- etc."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Tip: Be clear and specific. This will be shown to all house members.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center gap-4 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Draft'}
                            </button>
                            <Link
                                href={`/houses/${houseId}/agreements`}
                                className="px-6 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </Link>
                        </div>

                        <p className="text-sm text-gray-500">
                            Note: The agreement will be created as a draft. You can activate it later to require acceptance from all members.
                        </p>
                    </form>
                </div>
            </main>
        </div>
    )
}
