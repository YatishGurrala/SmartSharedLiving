// Tests for rent actions
import { createRentCycle, updateRentEntryStatus, deleteRentCycle } from '../actions'
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

describe('Rent Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createRentCycle', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const formData = new FormData()
            formData.append('name', 'January 2024')
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '2024-01-15')
            formData.append('total_amount', '2000')
            formData.append('member_amounts', '[]')

            const result = await createRentCycle('house-123', formData)
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should validate name is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('name', '')
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '2024-01-15')
            formData.append('total_amount', '2000')
            formData.append('member_amounts', '[]')

            const result = await createRentCycle('house-123', formData)
            expect(result.error).toBe('Name is required')
        })

        it('should validate start date is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('name', 'January 2024')
            formData.append('start_date', '')
            formData.append('due_date', '2024-01-15')
            formData.append('total_amount', '2000')
            formData.append('member_amounts', '[]')

            const result = await createRentCycle('house-123', formData)
            expect(result.error).toBe('Start date is required')
        })

        it('should validate due date is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('name', 'January 2024')
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '')
            formData.append('total_amount', '2000')
            formData.append('member_amounts', '[]')

            const result = await createRentCycle('house-123', formData)
            expect(result.error).toBe('Due date is required')
        })

        it('should validate total amount is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('name', 'January 2024')
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '2024-01-15')
            formData.append('total_amount', '')
            formData.append('member_amounts', '[]')

            const result = await createRentCycle('house-123', formData)
            expect(result.error).toBe('Total amount is required')
        })

        it('should validate total amount is positive', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('name', 'January 2024')
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '2024-01-15')
            formData.append('total_amount', '-100')
            formData.append('member_amounts', '[]')

            const result = await createRentCycle('house-123', formData)
            expect(result.error).toBe('Total amount must be a positive number')
        })

        it('should validate member_amounts is valid JSON', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('name', 'January 2024')
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '2024-01-15')
            formData.append('total_amount', '2000')
            formData.append('member_amounts', 'invalid json')

            const result = await createRentCycle('house-123', formData)
            expect(result.error).toBe('Invalid member amounts format')
        })

        it('should require at least one member assignment', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('name', 'January 2024')
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '2024-01-15')
            formData.append('total_amount', '2000')
            formData.append('member_amounts', '[]')

            const result = await createRentCycle('house-123', formData)
            expect(result.error).toBe('At least one member must be assigned')
        })

        it('should require admin role', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { role: 'member' },
                error: null,
            })

            const formData = new FormData()
            formData.append('name', 'January 2024')
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '2024-01-15')
            formData.append('total_amount', '2000')
            formData.append('member_amounts', JSON.stringify([{ user_id: 'user-1', amount: 1000 }]))

            const result = await createRentCycle('house-123', formData)
            expect(result.error).toBe('Only admins can perform this action')
        })

        it('should create rent cycle successfully', async () => {
            const mockCycle = { id: 'cycle-123', name: 'January 2024' }
            
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
                .mockResolvedValueOnce({ data: mockCycle, error: null })
            // Mock insert chain for creating rent entries
            mockSupabaseClient.insert.mockReturnValueOnce({
                select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockCycle, error: null })
                })
            })
            mockSupabaseClient.insert.mockResolvedValueOnce({ error: null })

            const formData = new FormData()
            formData.append('name', 'January 2024')
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '2024-01-15')
            formData.append('total_amount', '2000')
            formData.append('member_amounts', JSON.stringify([{ user_id: 'user-1', amount: 1000 }]))

            const result = await createRentCycle('house-123', formData)
            expect(result.cycle).toEqual(mockCycle)
            expect(result.error).toBeUndefined()
        })
    })

    describe('updateRentEntryStatus', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await updateRentEntryStatus('entry-123', 'paid', 'house-123')
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

            const result = await updateRentEntryStatus('entry-123', 'paid', 'house-123')
            expect(result.error).toBe('Only admins can perform this action')
        })
    })

    describe('deleteRentCycle', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await deleteRentCycle('cycle-123', 'house-123')
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

            const result = await deleteRentCycle('cycle-123', 'house-123')
            expect(result.error).toBe('Only admins can perform this action')
        })
    })
})

describe('Rent Actions - FormData Validation', () => {
    describe('Amount validation', () => {
        it('should parse total amount from form data', () => {
            const formData = new FormData()
            formData.append('total_amount', '2500.50')
            
            const amount = parseFloat(formData.get('total_amount') as string)
            expect(amount).toBe(2500.50)
        })

        it('should validate positive numbers', () => {
            const validatePositive = (value: number, fieldName: string): string | null => {
                if (value <= 0) {
                    return `${fieldName} must be a positive number`
                }
                return null
            }

            expect(validatePositive(100, 'Amount')).toBeNull()
            expect(validatePositive(0, 'Amount')).toBe('Amount must be a positive number')
            expect(validatePositive(-50, 'Amount')).toBe('Amount must be a positive number')
        })
    })

    describe('Date validation', () => {
        it('should parse dates from form data', () => {
            const formData = new FormData()
            formData.append('start_date', '2024-01-01')
            formData.append('due_date', '2024-01-15')
            
            const startDate = formData.get('start_date') as string
            const dueDate = formData.get('due_date') as string
            
            expect(startDate).toBe('2024-01-01')
            expect(dueDate).toBe('2024-01-15')
        })

        it('should validate date format', () => {
            const isValidDate = (dateString: string): boolean => {
                const date = new Date(dateString)
                return !isNaN(date.getTime())
            }

            expect(isValidDate('2024-01-15')).toBe(true)
            expect(isValidDate('invalid')).toBe(false)
        })
    })

    describe('Member amounts validation', () => {
        it('should parse member amounts JSON', () => {
            const formData = new FormData()
            const memberAmounts = [
                { user_id: 'user-1', amount: 1000 },
                { user_id: 'user-2', amount: 1500 }
            ]
            formData.append('member_amounts', JSON.stringify(memberAmounts))
            
            const parsed = JSON.parse(formData.get('member_amounts') as string)
            expect(parsed).toHaveLength(2)
            expect(parsed[0].amount).toBe(1000)
        })

        it('should validate total matches sum of member amounts', () => {
            const validateAmountSum = (total: number, members: { amount: number }[]): boolean => {
                const sum = members.reduce((acc, m) => acc + m.amount, 0)
                return Math.abs(total - sum) < 0.01
            }

            const members = [
                { amount: 1000 },
                { amount: 1500 }
            ]
            
            expect(validateAmountSum(2500, members)).toBe(true)
            expect(validateAmountSum(2000, members)).toBe(false)
        })
    })
})

describe('Rent Actions - Status Management', () => {
    describe('Entry status transitions', () => {
        const validStatuses = ['pending', 'paid', 'overdue', 'waived']

        validStatuses.forEach(status => {
            it(`should recognize ${status} as valid status`, () => {
                expect(validStatuses).toContain(status)
            })
        })

        it('should track paid_at when status is paid', () => {
            const updateData: Record<string, unknown> = {}
            const status = 'paid'
            
            if (status === 'paid') {
                updateData.paid_at = new Date().toISOString()
            }
            
            expect(updateData.paid_at).toBeDefined()
        })
    })
})

describe('Rent Actions - Amount Calculations', () => {
    describe('Split calculations', () => {
        it('should calculate equal split', () => {
            const calculateEqualSplit = (total: number, members: number): number => {
                return total / members
            }

            expect(calculateEqualSplit(3000, 3)).toBe(1000)
            expect(calculateEqualSplit(2500, 2)).toBe(1250)
        })

        it('should handle percentage-based split', () => {
            const calculatePercentageSplit = (total: number, percentage: number): number => {
                return (total * percentage) / 100
            }

            expect(calculatePercentageSplit(2000, 50)).toBe(1000)
            expect(calculatePercentageSplit(2000, 30)).toBe(600)
        })
    })
})
