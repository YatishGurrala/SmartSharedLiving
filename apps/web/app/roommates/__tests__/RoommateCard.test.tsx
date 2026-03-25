import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import RoommateCard from '../RoommateCard'

describe('RoommateCard', () => {
    const defaultRoommate = {
        user_id: 'user-1',
        name: 'John Doe',
        occupation: 'Software Engineer',
        bio: 'Looking for a friendly roommate',
        avatar: undefined,
        compatibilityScore: 85,
        lifestyle_profiles: {
            cleanliness_level: 4,
            social_level: 3,
            sleep_schedule: 'night_owl',
            guest_frequency: 'sometimes',
        },
        housing_preferences: {
            city: 'San Francisco',
            min_budget: 1000,
            max_budget: 2000,
            move_in_date: '2024-03-01',
        },
    }

    it('renders profile name', () => {
        render(<RoommateCard roommate={defaultRoommate} />)
        expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('renders occupation', () => {
        render(<RoommateCard roommate={defaultRoommate} />)
        expect(screen.getByText('Software Engineer')).toBeInTheDocument()
    })

    it('renders bio', () => {
        render(<RoommateCard roommate={defaultRoommate} />)
        expect(screen.getByText(/Looking for a friendly roommate/i)).toBeInTheDocument()
    })

    it('renders compatibility score', () => {
        render(<RoommateCard roommate={defaultRoommate} />)
        expect(screen.getByText(/85%/i)).toBeInTheDocument()
    })

    it('renders city from housing preferences', () => {
        render(<RoommateCard roommate={defaultRoommate} />)
        expect(screen.getByText(/San Francisco/i)).toBeInTheDocument()
    })

    it('renders budget range', () => {
        render(<RoommateCard roommate={defaultRoommate} />)
        expect(screen.getByText(/\$1,?000.*\$2,?000/i)).toBeInTheDocument()
    })

    it('renders avatar initial when no avatar provided', () => {
        render(<RoommateCard roommate={defaultRoommate} />)
        expect(screen.getByText('J')).toBeInTheDocument() // First letter of John
    })

    it('handles missing lifestyle gracefully', () => {
        const roommateWithoutLifestyle = {
            ...defaultRoommate,
            lifestyle_profiles: undefined,
        }
        render(<RoommateCard roommate={roommateWithoutLifestyle} />)
        expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('handles missing housing preferences gracefully', () => {
        const roommateWithoutHousing = {
            ...defaultRoommate,
            housing_preferences: undefined,
        }
        render(<RoommateCard roommate={roommateWithoutHousing} />)
        expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('shows Great Match for high compatibility', () => {
        const highScoreRoommate = { ...defaultRoommate, compatibilityScore: 90 }
        render(<RoommateCard roommate={highScoreRoommate} />)
        expect(screen.getByText(/great match/i)).toBeInTheDocument()
    })

    it('shows Good Match for medium compatibility', () => {
        const mediumScoreRoommate = { ...defaultRoommate, compatibilityScore: 65 }
        render(<RoommateCard roommate={mediumScoreRoommate} />)
        expect(screen.getByText(/good match/i)).toBeInTheDocument()
    })

    it('shows Potential Match for lower compatibility', () => {
        const lowScoreRoommate = { ...defaultRoommate, compatibilityScore: 50 }
        render(<RoommateCard roommate={lowScoreRoommate} />)
        expect(screen.getByText(/potential match/i)).toBeInTheDocument()
    })
})
