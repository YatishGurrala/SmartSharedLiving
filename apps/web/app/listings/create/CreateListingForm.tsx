'use client'

import { useState } from 'react'
import { createListing } from '../actions'

interface CreateListingFormProps {
    onSubmit?: () => void
}

export default function CreateListingForm({ onSubmit }: CreateListingFormProps) {
    const [roomCount, setRoomCount] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        setIsSubmitting(true)
        setError(null)

        try {
            await createListing(formData)
            onSubmit?.()
        } catch (err) {
            setError('Failed to create listing. Please try again.')
            setIsSubmitting(false)
        }
    }

    return (
        <form action={handleSubmit} className="space-y-8">
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Property Details */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b pb-2">Property Details</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                            City *
                        </label>
                        <input
                            type="text"
                            id="city"
                            name="city"
                            required
                            placeholder="e.g., San Francisco, CA"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-3"
                        />
                    </div>
                    <div>
                        <label htmlFor="rent" className="block text-sm font-medium text-gray-700">
                            Total Monthly Rent ($) *
                        </label>
                        <input
                            type="number"
                            id="rent"
                            name="rent"
                            required
                            min="0"
                            step="0.01"
                            placeholder="2500"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-3"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Address *
                    </label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        required
                        placeholder="123 Main Street, Apt 4B"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-3"
                    />
                </div>

                <div>
                    <label htmlFor="available_from" className="block text-sm font-medium text-gray-700">
                        Available From *
                    </label>
                    <input
                        type="date"
                        id="available_from"
                        name="available_from"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-3"
                    />
                </div>
            </div>

            {/* Rooms */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b pb-2">Rooms</h3>
                
                <div>
                    <label htmlFor="room_count" className="block text-sm font-medium text-gray-700">
                        Number of Rooms Available *
                    </label>
                    <select
                        id="room_count"
                        name="room_count"
                        required
                        value={roomCount}
                        onChange={(e) => setRoomCount(parseInt(e.target.value, 10))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-3"
                    >
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                            <option key={num} value={num}>
                                {num} {num === 1 ? 'room' : 'rooms'}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-3">
                    {Array.from({ length: roomCount }, (_, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
                            <span className="text-sm font-medium text-gray-700 w-20">
                                Room {i + 1}
                            </span>
                            <div className="flex-1">
                                <input
                                    type="number"
                                    name={`room_${i + 1}_rent`}
                                    placeholder="Room rent (optional)"
                                    min="0"
                                    step="0.01"
                                    className="block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2 text-sm"
                                />
                            </div>
                            <span className="text-xs text-gray-500">/month</span>
                        </div>
                    ))}
                    <p className="text-xs text-gray-500">
                        Leave room rent blank to auto-split total rent evenly.
                    </p>
                </div>
            </div>

            <div className="pt-4">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? 'Creating...' : 'Create Listing'}
                </button>
            </div>
        </form>
    )
}
