'use client'

import Link from 'next/link'

interface RoommateCardProps {
    roommate: {
        user_id: string
        name?: string
        bio?: string
        occupation?: string
        avatar?: string
        compatibilityScore: number
        lifestyle_profiles?: {
            cleanliness_level?: number
            sleep_schedule?: string
            social_level?: number
            guest_frequency?: string
        }
        housing_preferences?: {
            city?: string
            min_budget?: number
            max_budget?: number
            move_in_date?: string
        }
    }
}

export default function RoommateCard({ roommate }: RoommateCardProps) {
    const lifestyle = roommate.lifestyle_profiles
    const housing = roommate.housing_preferences
    const score = roommate.compatibilityScore

    const getScoreColor = () => {
        if (score >= 80) return 'bg-green-100 text-green-700 border-green-200'
        if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }

    const getScoreLabel = () => {
        if (score >= 80) return 'Great Match'
        if (score >= 60) return 'Good Match'
        return 'Potential Match'
    }

    const renderStars = (level: number | undefined) => {
        const filled = level || 0
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                        key={star}
                        className={`w-4 h-4 ${star <= filled ? 'text-yellow-400' : 'text-gray-200'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                ))}
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all duration-300">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xl">
                                {(roommate.name || '?').charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">{roommate.name || 'Anonymous'}</h3>
                            <p className="text-sm text-gray-500">{roommate.occupation || 'Looking for a place'}</p>
                        </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getScoreColor()}`}>
                        {score}% {getScoreLabel()}
                    </span>
                </div>

                {/* Bio */}
                {roommate.bio && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{roommate.bio}</p>
                )}

                {/* Lifestyle Stats */}
                {lifestyle && (
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                </svg>
                                Cleanliness
                            </span>
                            {renderStars(lifestyle.cleanliness_level)}
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Social
                            </span>
                            {renderStars(lifestyle.social_level)}
                        </div>
                        {lifestyle.sleep_schedule && (
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                    Schedule
                                </span>
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                    {lifestyle.sleep_schedule.replace('_', ' ')}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Housing Preferences */}
                {housing && (
                    <div className="pt-4 border-t border-gray-100 space-y-2">
                        {housing.city && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Looking in {housing.city}
                            </div>
                        )}
                        {(housing.min_budget || housing.max_budget) && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Budget: ${housing.min_budget || 0} - ${housing.max_budget || '∞'}
                            </div>
                        )}
                        {housing.move_in_date && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Move-in: {new Date(housing.move_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <Link
                    href={`/messages?recipient=${roommate.user_id}`}
                    className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-center text-sm"
                >
                    Message
                </Link>
                <Link
                    href={`/roommates/${roommate.user_id}`}
                    className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium text-sm"
                >
                    View Profile
                </Link>
            </div>
        </div>
    )
}
