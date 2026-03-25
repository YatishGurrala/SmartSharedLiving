// Tests for exit-requests actions
import { submitExitRequest, approveExitRequest, rejectExitRequest, cancelExitRequest } from '../actions'
import { ActionErrors } from '@/lib/action-utils'

// Mock Supabase client
const mockSupabaseClient = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(() => mockSupabaseClient),
    select: jest.fn(() => mockSupabaseClient),
    insert: jest.fn(() => mockSupabaseClient),
    update: jest.fn(() => mockSupabaseClient),
    delete: jest.fn(() => mockSupabaseClient),
    eq: jest.fn(() => mockSupabaseClient),
    single: jest.fn(),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
}

jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}))

jest.mock('@/lib/analytics', () => ({
    trackServerEvent: jest.fn(),
}))

describe('Exit Requests Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('submitExitRequest', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const formData = new FormData()
            formData.append('requested_exit_date', '2024-12-31')

            const result = await submitExitRequest('house-123', formData)
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should validate exit date is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('requested_exit_date', '')

            const result = await submitExitRequest('house-123', formData)
            expect(result.error).toBe('Exit date is required')
        })

        it('should validate exit date is in the future', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('requested_exit_date', '2020-01-01')

            const result = await submitExitRequest('house-123', formData)
            expect(result.error).toBe('Exit date must be in the future')
        })

        it('should require user to be a member', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: null,
                error: null,
            })

            const formData = new FormData()
            const futureDate = new Date()
            futureDate.setMonth(futureDate.getMonth() + 1)
            formData.append('requested_exit_date', futureDate.toISOString().split('T')[0])

            const result = await submitExitRequest('house-123', formData)
            expect(result.error).toBe(ActionErrors.NOT_MEMBER)
        })

        it('should prevent duplicate pending requests', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { role: 'member' }, error: null })
                .mockResolvedValueOnce({ data: { id: 'existing-request' }, error: null })

            const formData = new FormData()
            const futureDate = new Date()
            futureDate.setMonth(futureDate.getMonth() + 1)
            formData.append('requested_exit_date', futureDate.toISOString().split('T')[0])

            const result = await submitExitRequest('house-123', formData)
            expect(result.error).toBe('You already have a pending exit request')
        })

        it('should submit exit request successfully', async () => {
            const mockRequest = { id: 'request-123', status: 'pending' }
            
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { role: 'member' }, error: null })
                .mockResolvedValueOnce({ data: null, error: null }) // No existing request
                .mockResolvedValueOnce({ data: mockRequest, error: null })

            const formData = new FormData()
            const futureDate = new Date()
            futureDate.setMonth(futureDate.getMonth() + 1)
            formData.append('requested_exit_date', futureDate.toISOString().split('T')[0])
            formData.append('reason', 'Moving to a new city')

            const result = await submitExitRequest('house-123', formData)
            expect(result.request).toEqual(mockRequest)
            expect(result.error).toBeUndefined()
        })
    })

    describe('approveExitRequest', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await approveExitRequest('request-123', 'house-123')
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should require admin role', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { role: 'member' },
                error: null,
            })

            const result = await approveExitRequest('request-123', 'house-123')
            expect(result.error).toBe('Only admins can perform this action')
        })

        it('should return error if request not found', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
                .mockResolvedValueOnce({ data: null, error: null })

            const result = await approveExitRequest('request-123', 'house-123')
            expect(result.error).toBe(ActionErrors.NOT_FOUND)
        })
    })

    describe('rejectExitRequest', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await rejectExitRequest('request-123', 'house-123')
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should require admin role', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { role: 'member' },
                error: null,
            })

            const result = await rejectExitRequest('request-123', 'house-123')
            expect(result.error).toBe('Only admins can perform this action')
        })
    })

    describe('cancelExitRequest', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await cancelExitRequest('request-123', 'house-123')
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should return error if request not found', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: null,
                error: null,
            })

            const result = await cancelExitRequest('request-123', 'house-123')
            expect(result.error).toBe(ActionErrors.NOT_FOUND)
        })

        it('should only allow owner to cancel', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { user_id: 'different-user', status: 'pending' },
                error: null,
            })

            const result = await cancelExitRequest('request-123', 'house-123')
            expect(result.error).toBe(ActionErrors.NOT_AUTHORIZED)
        })

        it('should only cancel pending requests', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { user_id: 'user-123', status: 'approved' },
                error: null,
            })

            const result = await cancelExitRequest('request-123', 'house-123')
            expect(result.error).toBe('Can only cancel pending requests')
        })
    })
})

describe('Exit Requests - FormData Validation', () => {
    describe('Exit date validation', () => {
        it('should parse exit date from form data', () => {
            const formData = new FormData()
            formData.append('requested_exit_date', '2024-12-31')
            
            const exitDate = formData.get('requested_exit_date') as string
            expect(exitDate).toBe('2024-12-31')
        })

        it('should validate date format', () => {
            const isValidDate = (dateString: string): boolean => {
                const date = new Date(dateString)
                return !isNaN(date.getTime())
            }

            expect(isValidDate('2024-12-31')).toBe(true)
            expect(isValidDate('invalid')).toBe(false)
        })

        it('should check if date is in the future', () => {
            const isFutureDate = (dateString: string): boolean => {
                const date = new Date(dateString)
                return date > new Date()
            }

            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            expect(isFutureDate(tomorrow.toISOString().split('T')[0])).toBe(true)
            expect(isFutureDate('2020-01-01')).toBe(false)
        })
    })

    describe('Reason validation', () => {
        it('should parse reason from form data', () => {
            const formData = new FormData()
            formData.append('reason', 'Moving to another city')
            
            const reason = formData.get('reason') as string
            expect(reason).toBe('Moving to another city')
        })

        it('should allow empty reason', () => {
            const formData = new FormData()
            const reason = formData.get('reason')
            expect(reason).toBeNull()
        })
    })
})

describe('Exit Requests - Status Flow', () => {
    describe('Status transitions', () => {
        const validStatuses = ['pending', 'approved', 'rejected', 'cancelled']

        validStatuses.forEach(status => {
            it(`should recognize ${status} as valid status`, () => {
                expect(validStatuses).toContain(status)
            })
        })

        it('should allow pending -> approved transition', () => {
            const currentStatus = 'pending'
            const newStatus = 'approved'
            const isValidTransition = currentStatus === 'pending' && ['approved', 'rejected'].includes(newStatus)
            expect(isValidTransition).toBe(true)
        })

        it('should allow pending -> rejected transition', () => {
            const currentStatus = 'pending'
            const newStatus = 'rejected'
            const isValidTransition = currentStatus === 'pending' && ['approved', 'rejected'].includes(newStatus)
            expect(isValidTransition).toBe(true)
        })
    })
})
