import { createHouse, leaveHouse, inviteMember } from '../actions'

// Mock Supabase
jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve({
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: { user: { id: 'test-user-id', email: 'test@test.com' } },
                error: null,
            }),
        },
        from: jest.fn().mockReturnValue({
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { id: 'new-house-id' }, error: null }),
            delete: jest.fn().mockReturnThis(),
        }),
    })),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
    redirect: jest.fn(),
}))

// Mock next/cache
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}))

describe('Houses Actions', () => {
    describe('createHouse', () => {
        it('should be a function', () => {
            expect(typeof createHouse).toBe('function')
        })

        it('should handle form data', async () => {
            const formData = new FormData()
            formData.append('city', 'San Francisco')
            formData.append('target_members', '4')
            
            // Test that it doesn't throw
            await expect(createHouse(formData)).resolves.not.toThrow()
        })
    })

    describe('leaveHouse', () => {
        it('should be a function', () => {
            expect(typeof leaveHouse).toBe('function')
        })

        it('should accept a house id', async () => {
            const houseId = 'test-house-id'
            
            await expect(leaveHouse(houseId)).resolves.not.toThrow()
        })
    })

    describe('inviteMember', () => {
        it('should be a function', () => {
            expect(typeof inviteMember).toBe('function')
        })

        it('should handle form data with email', async () => {
            const formData = new FormData()
            formData.append('email', 'invite@test.com')
            formData.append('houseId', 'test-house-id')
            
            await expect(inviteMember(formData)).resolves.not.toThrow()
        })
    })
})
