import { submitProfileSetup } from './actions'

export default function ProfileSetupPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-gray-900">Complete your profile</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Tell us about yourself to find the perfect housemates.
                    </p>
                </div>

                <form action={submitProfileSetup} className="space-y-8">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold border-b pb-2">Basic Info</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                <input required name="name" type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Occupation</label>
                                <input required name="occupation" type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bio</label>
                            <textarea required name="bio" rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2"></textarea>
                        </div>
                    </div>

                    {/* Lifestyle */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold border-b pb-2">Lifestyle Preferences</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cleanliness Level (1-5)</label>
                                <input required name="cleanliness_level" type="number" min="1" max="5" defaultValue="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Social Level (1-5)</label>
                                <input required name="social_level" type="number" min="1" max="5" defaultValue="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sleep Schedule</label>
                                <select required name="sleep_schedule" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2">
                                    <option value="early_bird">Early Bird</option>
                                    <option value="night_owl">Night Owl</option>
                                    <option value="flexible">Flexible</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Guest Frequency</label>
                                <select required name="guest_frequency" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2">
                                    <option value="rarely">Rarely</option>
                                    <option value="sometimes">Sometimes</option>
                                    <option value="often">Often</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Housing */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-semibold border-b pb-2">Housing Preferences</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">City</label>
                            <input required name="city" type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2" />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Min Budget</label>
                                <input required name="min_budget" type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Max Budget</label>
                                <input required name="max_budget" type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Target Move-in Date</label>
                            <input required name="move_in_date" type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 p-2" />
                        </div>
                    </div>

                    <div className="pt-5">
                        <button
                            type="submit"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Save Profile
                        </button>
                    </div>
                </form>

            </div>
        </div>
    )
}
