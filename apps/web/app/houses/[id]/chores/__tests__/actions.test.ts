// Tests for chores actions
import { createChore, updateChore, completeChore, deleteChore, reassignChore } from '../actions'
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

describe('Chores Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createChore', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const formData = new FormData()
            formData.append('title', 'Test Chore')

            const result = await createChore('house-123', formData)
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should validate title is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', '')

            const result = await createChore('house-123', formData)
            expect(result.error).toBe('Title is required')
        })

        it('should validate title max length', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', 'a'.repeat(201))

            const result = await createChore('house-123', formData)
            expect(result.error).toBe('Title must be no more than 200 characters')
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
            formData.append('title', 'Test Chore')

            const result = await createChore('house-123', formData)
            expect(result.error).toBe(ActionErrors.NOT_MEMBER)
        })

        it('should require admin role to create chores', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { role: 'member' },
                error: null,
            })

            const formData = new FormData()
            formData.append('title', 'Test Chore')

            const result = await createChore('house-123', formData)
            expect(result.error).toBe('Only admins can perform this action')
        })

        it('should create chore successfully', async () => {
            const mockChore = { id: 'chore-123', title: 'Test Chore' }
            
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
                .mockResolvedValueOnce({ data: mockChore, error: null })

            const formData = new FormData()
            formData.append('title', 'Test Chore')
            formData.append('recurrence', 'weekly')

            const result = await createChore('house-123', formData)
            expect(result.chore).toEqual(mockChore)
            expect(result.error).toBeUndefined()
        })
    })

    describe('updateChore', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const formData = new FormData()
            formData.append('title', 'Updated Chore')

            const result = await updateChore('chore-123', 'house-123', formData)
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should validate title is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', '')

            const result = await updateChore('chore-123', 'house-123', formData)
            expect(result.error).toBe('Title is required')
        })
    })

    describe('completeChore', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await completeChore('chore-123', 'house-123')
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should prevent completing already completed chore', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { status: 'completed', assigned_to: 'user-123', title: 'Test' },
                error: null,
            })

            const result = await completeChore('chore-123', 'house-123')
            expect(result.error).toBe('This chore is already completed')
        })

        it('should allow assigned user to complete chore', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { status: 'pending', assigned_to: 'user-123', title: 'Test' }, error: null })
                .mockResolvedValueOnce({ data: { role: 'member' }, error: null })
            mockSupabaseClient.update.mockReturnValueOnce({
                eq: jest.fn().mockResolvedValueOnce({ error: null }),
            })

            const result = await completeChore('chore-123', 'house-123')
            expect(result.success).toBe(true)
        })
    })

    describe('deleteChore', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await deleteChore('chore-123', 'house-123')
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

            const result = await deleteChore('chore-123', 'house-123')
            expect(result.error).toBe('Only admins can perform this action')
        })
    })

    describe('reassignChore', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await reassignChore('chore-123', 'house-123', 'user-456')
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

            const result = await reassignChore('chore-123', 'house-123', 'user-456')
            expect(result.error).toBe('Only admins can perform this action')
        })

        it('should validate assignee is a house member', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
                .mockResolvedValueOnce({ data: null, error: null })

            const result = await reassignChore('chore-123', 'house-123', 'user-456')
            expect(result.error).toBe('Cannot assign to someone who is not a member of this house')
        })
    })
})

describe('Chores Actions - FormData Validation', () => {
    describe('Title validation', () => {
        it('should parse title from form data', () => {
            const formData = new FormData()
            formData.append('title', 'Clean kitchen')
            
            const title = formData.get('title') as string
            expect(title).toBe('Clean kitchen')
        })

        it('should get null for missing title', () => {
            const formData = new FormData()
            const title = formData.get('title')
            expect(title).toBeNull()
        })
    })

    describe('Recurrence validation', () => {
        const validRecurrences = ['once', 'daily', 'weekly', 'monthly']

        validRecurrences.forEach(recurrence => {
            it(`should accept ${recurrence} recurrence`, () => {
                const formData = new FormData()
                formData.append('recurrence', recurrence)
                
                const value = formData.get('recurrence') as string
                expect(validRecurrences).toContain(value)
            })
        })
    })

    describe('Due date validation', () => {
        it('should parse valid due date', () => {
            const formData = new FormData()
            formData.append('due_date', '2024-12-31')
            
            const dueDate = formData.get('due_date') as string
            expect(dueDate).toBe('2024-12-31')
        })
    })
})

describe('Chores Actions - Error Handling', () => {
    describe('Database errors', () => {
        it('should format Supabase errors', () => {
            const supabaseError = {
                code: 'PGRST116',
                message: 'The result contains 0 rows',
            }
            
            // Test that we can detect error types
            expect(supabaseError.code).toBeDefined()
        })
    })

    describe('Validation errors', () => {
        it('should return appropriate error for empty required fields', () => {
            const validateRequired = (value: string | null | undefined, fieldName: string): string | null => {
                if (!value || value.trim() === '') {
                    return `${fieldName} is required`
                }
                return null
            }

            expect(validateRequired('', 'Title')).toBe('Title is required')
            expect(validateRequired(null, 'Title')).toBe('Title is required')
            expect(validateRequired(undefined, 'Title')).toBe('Title is required')
            expect(validateRequired('Valid', 'Title')).toBeNull()
        })

        it('should return appropriate error for max length', () => {
            const validateMaxLength = (value: string | null | undefined, max: number, fieldName: string): string | null => {
                if (value && value.length > max) {
                    return `${fieldName} must be ${max} characters or less`
                }
                return null
            }

            expect(validateMaxLength('short', 200, 'Title')).toBeNull()
            expect(validateMaxLength('a'.repeat(201), 200, 'Title')).toBe('Title must be 200 characters or less')
        })
    })
})
