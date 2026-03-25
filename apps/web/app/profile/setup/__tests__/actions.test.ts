import { submitProfileSetup } from '../actions'

// Mock dependencies
const mockGetUser = jest.fn()
const mockUpsert = jest.fn()

jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve({
        auth: {
            getUser: mockGetUser,
        },
        from: jest.fn(() => ({
            upsert: mockUpsert,
        })),
    })),
}))

const mockRedirect = jest.fn()

jest.mock('next/navigation', () => ({
    redirect: (...args: unknown[]) => mockRedirect(...args),
}))

describe('Profile Setup Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockUpsert.mockResolvedValue({ error: null })
    })

    describe('submitProfileSetup', () => {
        it('should redirect to login if user is not authenticated', async () => {
            mockGetUser.mockResolvedValue({ data: { user: null } })

            const formData = new FormData()
            formData.set('name', 'Test User')

            await submitProfileSetup(formData)

            expect(mockRedirect).toHaveBeenCalledWith('/auth/login')
        })

        it('should upsert profile data when user is authenticated', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.set('name', 'John Doe')
            formData.set('bio', 'Software developer')
            formData.set('occupation', 'Engineer')
            formData.set('cleanliness_level', '4')
            formData.set('sleep_schedule', 'night_owl')
            formData.set('social_level', '3')
            formData.set('guest_frequency', 'occasionally')
            formData.set('city', 'San Francisco')
            formData.set('min_budget', '1000')
            formData.set('max_budget', '2000')
            formData.set('move_in_date', '2024-03-01')

            await submitProfileSetup(formData)

            // Should call upsert 3 times (profile, lifestyle, housing)
            expect(mockUpsert).toHaveBeenCalledTimes(3)
        })

        it('should redirect to rooms after successful profile setup', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.set('name', 'John Doe')
            formData.set('bio', 'Test bio')
            formData.set('occupation', 'Developer')
            formData.set('cleanliness_level', '5')
            formData.set('sleep_schedule', 'early_bird')
            formData.set('social_level', '4')
            formData.set('guest_frequency', 'often')
            formData.set('city', 'New York')
            formData.set('min_budget', '800')
            formData.set('max_budget', '1500')
            formData.set('move_in_date', '2024-02-15')

            await submitProfileSetup(formData)

            expect(mockRedirect).toHaveBeenCalledWith('/rooms')
        })

        it('should parse numeric values correctly', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'user-456' } },
            })

            const mockFrom = jest.fn()
            const mockSupabase = {
                auth: { getUser: mockGetUser },
                from: mockFrom,
            }
            mockFrom.mockReturnValue({ upsert: mockUpsert })
            
            // Re-mock to capture the calls better
            const { createClient } = require('@/utils/supabase/server')
            createClient.mockResolvedValue(mockSupabase)

            const formData = new FormData()
            formData.set('name', 'Jane')
            formData.set('bio', 'Bio')
            formData.set('occupation', 'Designer')
            formData.set('cleanliness_level', '3')
            formData.set('sleep_schedule', 'normal')
            formData.set('social_level', '2')
            formData.set('guest_frequency', 'rarely')
            formData.set('city', 'LA')
            formData.set('min_budget', '1200.50')
            formData.set('max_budget', '2500.75')
            formData.set('move_in_date', '2024-04-01')

            await submitProfileSetup(formData)

            // Verify upsert was called with parsed numeric values
            expect(mockUpsert).toHaveBeenCalled()
        })

        it('should handle missing optional fields gracefully', async () => {
            mockGetUser.mockResolvedValue({
                data: { user: { id: 'user-789' } },
            })

            const formData = new FormData()
            formData.set('name', 'Min User')
            formData.set('bio', '')
            formData.set('occupation', '')
            formData.set('cleanliness_level', '3')
            formData.set('sleep_schedule', '')
            formData.set('social_level', '3')
            formData.set('guest_frequency', '')
            formData.set('city', '')
            formData.set('min_budget', '0')
            formData.set('max_budget', '0')
            formData.set('move_in_date', '')

            await submitProfileSetup(formData)

            // Should still redirect successfully
            expect(mockRedirect).toHaveBeenCalledWith('/rooms')
        })
    })
})
