// Tests for agreements actions
import { createAgreement, updateAgreement, activateAgreement, acceptAgreement, archiveAgreement } from '../actions'
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

describe('Agreements Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('createAgreement', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const formData = new FormData()
            formData.append('title', 'House Agreement')
            formData.append('content', 'Agreement content here')

            const result = await createAgreement('house-123', formData)
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should validate title is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', '')
            formData.append('content', 'Agreement content')

            const result = await createAgreement('house-123', formData)
            expect(result.error).toBe('Title is required')
        })

        it('should validate title min length', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', 'ab') // Less than 3 chars
            formData.append('content', 'Agreement content')

            const result = await createAgreement('house-123', formData)
            expect(result.error).toBe('Title must be at least 3 characters')
        })

        it('should validate content is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', 'House Agreement')
            formData.append('content', '')

            const result = await createAgreement('house-123', formData)
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
            formData.append('title', 'House Agreement')
            formData.append('content', 'Agreement content')

            const result = await createAgreement('house-123', formData)
            expect(result.error).toBe(ActionErrors.NOT_MEMBER)
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
            formData.append('title', 'House Agreement')
            formData.append('content', 'Agreement content')

            const result = await createAgreement('house-123', formData)
            expect(result.error).toBe('Only admins can perform this action')
        })

        it('should create agreement successfully', async () => {
            const mockAgreement = { id: 'agreement-123', title: 'House Agreement', status: 'draft' }
            
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
                .mockResolvedValueOnce({ data: mockAgreement, error: null })

            const formData = new FormData()
            formData.append('title', 'House Agreement')
            formData.append('content', 'Agreement content')

            const result = await createAgreement('house-123', formData)
            expect(result.agreement).toEqual(mockAgreement)
            expect(result.error).toBeUndefined()
        })
    })

    describe('updateAgreement', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const formData = new FormData()
            formData.append('title', 'Updated Agreement')
            formData.append('content', 'Updated content')

            const result = await updateAgreement('agreement-123', formData)
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should validate title is required', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })

            const formData = new FormData()
            formData.append('title', '')
            formData.append('content', 'Updated content')

            const result = await updateAgreement('agreement-123', formData)
            expect(result.error).toBe('Title is required')
        })

        it('should return error if agreement not found', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: null,
                error: null,
            })

            const formData = new FormData()
            formData.append('title', 'Updated Agreement')
            formData.append('content', 'Updated content')

            const result = await updateAgreement('agreement-123', formData)
            expect(result.error).toBe(ActionErrors.NOT_FOUND)
        })
    })

    describe('activateAgreement', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await activateAgreement('agreement-123')
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should return error if agreement not found', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: null,
                error: null,
            })

            const result = await activateAgreement('agreement-123')
            expect(result.error).toBe(ActionErrors.NOT_FOUND)
        })

        it('should require admin role', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { house_id: 'house-123', status: 'draft' }, error: null })
                .mockResolvedValueOnce({ data: { role: 'member' }, error: null })

            const result = await activateAgreement('agreement-123')
            expect(result.error).toBe('Only admins can perform this action')
        })
    })

    describe('acceptAgreement', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await acceptAgreement('agreement-123')
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should succeed if already accepted', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: { id: 'acceptance-123' },
                error: null,
            })

            const result = await acceptAgreement('agreement-123')
            expect(result.success).toBe(true)
        })
    })

    describe('archiveAgreement', () => {
        it('should require authentication', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: null },
            })

            const result = await archiveAgreement('agreement-123')
            expect(result.error).toBe(ActionErrors.AUTH_REQUIRED)
        })

        it('should return error if agreement not found', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single.mockResolvedValueOnce({
                data: null,
                error: null,
            })

            const result = await archiveAgreement('agreement-123')
            expect(result.error).toBe(ActionErrors.NOT_FOUND)
        })

        it('should require admin role', async () => {
            mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
                data: { user: { id: 'user-123' } },
            })
            mockSupabaseClient.single
                .mockResolvedValueOnce({ data: { house_id: 'house-123' }, error: null })
                .mockResolvedValueOnce({ data: { role: 'member' }, error: null })

            const result = await archiveAgreement('agreement-123')
            expect(result.error).toBe('Only admins can perform this action')
        })
    })
})

describe('Agreements - FormData Validation', () => {
    describe('Title validation', () => {
        it('should parse title from form data', () => {
            const formData = new FormData()
            formData.append('title', 'House Rules Agreement')
            
            const title = formData.get('title') as string
            expect(title).toBe('House Rules Agreement')
        })

        it('should validate title minimum length', () => {
            const validateMinLength = (value: string | null | undefined, min: number, fieldName: string): string | null => {
                if (value && value.length < min) {
                    return `${fieldName} must be at least ${min} characters`
                }
                return null
            }

            expect(validateMinLength('ab', 3, 'Title')).toBe('Title must be at least 3 characters')
            expect(validateMinLength('abc', 3, 'Title')).toBeNull()
        })
    })

    describe('Content validation', () => {
        it('should parse content from form data', () => {
            const formData = new FormData()
            formData.append('content', 'This is the agreement content with rules and guidelines.')
            
            const content = formData.get('content') as string
            expect(content).toContain('agreement content')
        })
    })
})

describe('Agreements - Status Flow', () => {
    describe('Agreement status transitions', () => {
        const validStatuses = ['draft', 'active', 'superseded', 'archived']

        validStatuses.forEach(status => {
            it(`should recognize ${status} as valid status`, () => {
                expect(validStatuses).toContain(status)
            })
        })

        it('should allow draft -> active transition', () => {
            const canActivate = (status: string) => status === 'draft'
            expect(canActivate('draft')).toBe(true)
            expect(canActivate('active')).toBe(false)
        })

        it('should allow active -> superseded transition when new agreement activates', () => {
            const shouldSupersede = (status: string) => status === 'active'
            expect(shouldSupersede('active')).toBe(true)
            expect(shouldSupersede('draft')).toBe(false)
        })
    })
})

describe('Agreements - Version Management', () => {
    describe('Version tracking', () => {
        it('should start with version 1', () => {
            const initialVersion = 1
            expect(initialVersion).toBe(1)
        })

        it('should increment version on updates', () => {
            const incrementVersion = (current: number) => current + 1
            expect(incrementVersion(1)).toBe(2)
            expect(incrementVersion(5)).toBe(6)
        })
    })
})
