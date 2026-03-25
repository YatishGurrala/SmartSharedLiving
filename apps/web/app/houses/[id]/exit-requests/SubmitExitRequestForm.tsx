'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitExitRequest } from './actions'

interface SubmitExitRequestFormProps {
    houseId: string
}

export default function SubmitExitRequestForm({ houseId }: SubmitExitRequestFormProps) {
    const [showForm, setShowForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const result = await submitExitRequest(houseId, formData)

        if (result.error) {
            setError(result.error)
            setLoading(false)
        } else {
            router.refresh()
            setShowForm(false)
        }
    }

    // Calculate minimum date (today)
    const today = new Date().toISOString().split('T')[0]

    if (!showForm) {
        return (
            <button
                onClick={() => setShowForm(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
            >
                + Submit Exit Request
            </button>
        )
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="font-semibold mb-4">Submit Exit Request</h3>
            
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="requested_exit_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Requested Exit Date *
                    </label>
                    <input
                        type="date"
                        id="requested_exit_date"
                        name="requested_exit_date"
                        required
                        min={today}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        This is your preferred move-out date. The admin will review your request.
                    </p>
                </div>

                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
                        Reason (Optional)
                    </label>
                    <textarea
                        id="reason"
                        name="reason"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Let the admin know why you're leaving..."
                    />
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> Once approved, you will be removed from this house. 
                        Make sure to settle any outstanding obligations before your exit date.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit Request'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    )
}
