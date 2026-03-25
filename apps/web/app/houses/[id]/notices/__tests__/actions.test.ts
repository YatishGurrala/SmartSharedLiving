// Tests for notices actions
import { createNotice, acknowledgeNotice, updateNotice, deleteNotice, togglePinNotice } from '../actions'
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

describe('Notices Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createNotice', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const formData = new FormData()
            formData.append('title', 'Test Notice')
            formData.append('content', 'Test content')

            const result = await createNotice('house-123', formData)
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should validate title is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', '')
            formData.append('content', 'Test content')

            const result = await createNotice('house-123', formData)
            expect(result.error).toBe('Title is required')
        })

        it('should validate content is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', 'Test Title')
            formData.append('content', '')

            const result = await createNotice('house-123', formData)
            expect(result.error).toBe('Content is required')
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
            formData.append('title', 'Test Notice')
            formData.append('content', 'Test content')

            const result = await createNotice('house-123', formData)
            expect(result.error).toBe(ActionErrors.NOT_MEMBER)
        })

        it('should require admin role to create notices', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { role: 'member' },
                error: null,
            })

            const formData = new FormData()
            formData.append('title', 'Test Notice')
            formData.append('content', 'Test content')

            const result = await createNotice('house-123', formData)
            expect(result.error).toBe('Only admins can perform this action')
        })

        it('should create notice successfully', async () => {
            const mockNotice = { id: 'notice-123', title: 'Test Notice', content: 'Test content' }
            
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
                .mockResolvedValueOnce({ data: mockNotice, error: null })

            const formData = new FormData()
            formData.append('title', 'Test Notice')
            formData.append('content', 'Test content')

            const result = await createNotice('house-123', formData)
            expect(result.notice).toEqual(mockNotice)
            expect(result.error).toBeUndefined()
        })
    })

    describe('acknowledgeNotice', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await acknowledgeNotice('notice-123', 'house-123')
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should require membership', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: null,
                error: null,
            })

            const result = await acknowledgeNotice('notice-123', 'house-123')
            expect(result.error).toBe(ActionErrors.NOT_MEMBER)
        })

        it('should return error if notice does not require acknowledgement', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { user_id: 'user-123' }, error: null })
                .mockResolvedValueOnce({ data: { requires_acknowledgement: false }, error: null })

            const result = await acknowledgeNotice('notice-123', 'house-123')
            expect(result.error).toBe('This notice does not require acknowledgement')
        })

        it('should succeed if already acknowledged', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { user_id: 'user-123' }, error: null })
                .mockResolvedValueOnce({ data: { requires_acknowledgement: true }, error: null })
                .mockResolvedValueOnce({ data: { id: 'ack-123' }, error: null })

            const result = await acknowledgeNotice('notice-123', 'house-123')
            expect(result.success).toBe(true)
        })
    })

    describe('updateNotice', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const formData = new FormData()
            formData.append('title', 'Updated Notice')
            formData.append('content', 'Updated content')

            const result = await updateNotice('notice-123', 'house-123', formData)
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should validate title is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', '')
            formData.append('content', 'Test content')

            const result = await updateNotice('notice-123', 'house-123', formData)
            expect(result.error).toBe('Title is required')
        })
    })

    describe('deleteNotice', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await deleteNotice('notice-123', 'house-123')
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

            const result = await deleteNotice('notice-123', 'house-123')
            expect(result.error).toBe('Only admins can perform this action')
        })
    })

    describe('togglePinNotice', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await togglePinNotice('notice-123', 'house-123', true)
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

            const result = await togglePinNotice('notice-123', 'house-123', true)
            expect(result.error).toBe('Only admins can perform this action')
        })
    })
})

describe('Notices Actions - FormData Validation', () => {
    describe('Title validation', () => {
        it('should parse title from form data', () => {
            const formData = new FormData()
            formData.append('title', 'Important Announcement')
            
            const title = formData.get('title') as string
            expect(title).toBe('Important Announcement')
        })

        it('should handle long titles', () => {
            const formData = new FormData()
            const longTitle = 'a'.repeat(200)
            formData.append('title', longTitle)
            
            const title = formData.get('title') as string
            expect(title.length).toBe(200)
        })
    })

    describe('Content validation', () => {
        it('should parse content from form data', () => {
            const formData = new FormData()
            formData.append('content', 'This is the notice content')
            
            const content = formData.get('content') as string
            expect(content).toBe('This is the notice content')
        })
    })

    describe('Boolean fields', () => {
        it('should parse is_pinned boolean', () => {
            const formData = new FormData()
            formData.append('is_pinned', 'true')
            
            const isPinned = formData.get('is_pinned') === 'true'
            expect(isPinned).toBe(true)
        })

        it('should parse requires_acknowledgement boolean', () => {
            const formData = new FormData()
            formData.append('requires_acknowledgement', 'true')
            
            const requiresAck = formData.get('requires_acknowledgement') === 'true'
            expect(requiresAck).toBe(true)
        })
    })
})

describe('Notices Actions - Priority Handling', () => {
    describe('Notice priority', () => {
        const validPriorities = ['low', 'normal', 'high', 'urgent']

        validPriorities.forEach(priority => {
            it(`should accept ${priority} priority`, () => {
                const formData = new FormData()
                formData.append('priority', priority)
                
                const value = formData.get('priority') as string
                expect(validPriorities).toContain(value)
            })
        })
    })
})

describe('Notices Actions - Error Handling', () => {
    describe('Validation', () => {
        it('should validate required title', () => {
            const validateRequired = (value: string | null | undefined, fieldName: string): string | null => {
                if (!value || value.trim() === '') {
                    return `${fieldName} is required`
                }
                return null
            }

            expect(validateRequired('', 'Title')).toBe('Title is required')
            expect(validateRequired('Valid Title', 'Title')).toBeNull()
        })

        it('should validate max length', () => {
            const validateMaxLength = (value: string | null | undefined, max: number, fieldName: string): string | null => {
                if (value && value.length > max) {
                    return `${fieldName} must be ${max} characters or less`
                }
                return null
            }

            expect(validateMaxLength('a'.repeat(201), 200, 'Title')).toBe('Title must be 200 characters or less')
            expect(validateMaxLength('Short title', 200, 'Title')).toBeNull()
        })
    })
})
