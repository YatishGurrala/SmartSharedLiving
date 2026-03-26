'use client'

import { useState, useTransition } from 'react'
import { updateHouseSettings } from './actions'

interface SettingsFormProps {
    house: {
        id: string
        name: string | null
        city: string
        target_members: number
        description: string | null
    }
}

export default function SettingsForm({ house }: SettingsFormProps) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleSubmit = (formData: FormData) => {
        setError(null)
        setSuccess(false)
        startTransition(async () => {
            const result = await updateHouseSettings(house.id, formData)
            if (result.error) {
                setError(result.error)
            } else {
                setSuccess(true)
                setTimeout(() => setSuccess(false), 3000)
            }
        })
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">House Information</h2>

            <form action={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        House Name <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        defaultValue={house.name || ''}
                        placeholder="e.g., The Maple House"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="city"
                        name="city"
                        required
                        defaultValue={house.city}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="target_members" className="block text-sm font-medium text-gray-700 mb-1">
                        Target Members
                    </label>
                    <input
                        type="number"
                        id="target_members"
                        name="target_members"
                        min={2}
                        max={20}
                        defaultValue={house.target_members}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Description <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                        id="description"
                        name="description"
                        rows={3}
                        defaultValue={house.description || ''}
                        placeholder="Brief description of your house..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        Settings saved successfully!
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                    {isPending ? 'Saving...' : 'Save Changes'}
                </button>
            </form>
        </div>
    )
}
