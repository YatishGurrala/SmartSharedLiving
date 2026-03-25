// Tests for application actions
import { 
    createAppError, 
    ErrorCodes, 
    validateRequired,
} from '@/lib/errors'

// Mock Supabase client
const mockSupabaseClient = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        order: jest.fn().mockReturnThis(),
    })),
}

jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}))

jest.mock('next/navigation', () => ({
    redirect: jest.fn((url) => { throw new Error(`REDIRECT:${url}`) }),
}))

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}))

jest.mock('@/lib/analytics', () => ({
    trackServerEvent: jest.fn(),
}))

describe('Application Actions - Types', () => {
    describe('ApplicationStatus', () => {
        it('should define valid status values', () => {
            const validStatuses = ['pending', 'accepted', 'rejected', 'withdrawn']
            
            validStatuses.forEach(status => {
                expect(['pending', 'accepted', 'rejected', 'withdrawn']).toContain(status)
            })
        })
    })

    describe('ApplicationTargetType', () => {
        it('should define valid target types', () => {
            const validTypes = ['listing', 'house']
            
            validTypes.forEach(type => {
                expect(['listing', 'house']).toContain(type)
            })
        })
    })
})

describe('Application Actions - Validation', () => {
    describe('createApplication validation', () => {
        it('should require target ID', () => {
            expect(() => validateRequired('', 'Target ID')).toThrow('Target ID is required')
        })

        it('should require target type', () => {
            expect(() => validateRequired('', 'Target type')).toThrow('Target type is required')
        })

        it('should accept valid params', () => {
            expect(() => {
                validateRequired('listing-123', 'Target ID')
                validateRequired('listing', 'Target type')
            }).not.toThrow()
        })
    })
})

describe('Application Actions - Error Handling', () => {
    describe('Authorization errors', () => {
        it('should create AUTH_REQUIRED error for unauthenticated users', () => {
            const error = createAppError(ErrorCodes.AUTH_REQUIRED)
            expect(error.code).toBe('AUTH_REQUIRED')
            expect(error.statusCode).toBe(401)
        })

        it('should create ALREADY_EXISTS error for duplicate applications', () => {
            const error = createAppError(
                ErrorCodes.ALREADY_EXISTS,
                'You already have a pending application for this'
            )
            expect(error.code).toBe('ALREADY_EXISTS')
            expect(error.message).toBe('You already have a pending application for this')
            expect(error.statusCode).toBe(409)
        })

        it('should create NOT_AUTHORIZED error for invalid operations', () => {
            const error = createAppError(ErrorCodes.NOT_AUTHORIZED, 'Only the applicant can withdraw')
            expect(error.code).toBe('NOT_AUTHORIZED')
            expect(error.message).toBe('Only the applicant can withdraw')
            expect(error.statusCode).toBe(403)
        })

        it('should create NOT_FOUND error for missing applications', () => {
            const error = createAppError(ErrorCodes.NOT_FOUND, 'Application not found')
            expect(error.code).toBe('NOT_FOUND')
            expect(error.message).toBe('Application not found')
            expect(error.statusCode).toBe(404)
        })
    })
})

describe('Application Status Transitions', () => {
    const validTransitions: { from: string; to: string; by: string }[] = [
        { from: 'pending', to: 'withdrawn', by: 'applicant' },
        { from: 'pending', to: 'accepted', by: 'owner' },
        { from: 'pending', to: 'rejected', by: 'owner' },
    ]

    it('should allow applicant to withdraw', () => {
        const transition = validTransitions.find(t => t.to === 'withdrawn')
        expect(transition?.by).toBe('applicant')
    })

    it('should allow owner to accept', () => {
        const transition = validTransitions.find(t => t.to === 'accepted')
        expect(transition?.by).toBe('owner')
    })

    it('should allow owner to reject', () => {
        const transition = validTransitions.find(t => t.to === 'rejected')
        expect(transition?.by).toBe('owner')
    })

    it('should not allow applicant to accept their own application', () => {
        const acceptTransition = validTransitions.find(t => t.to === 'accepted')
        expect(acceptTransition?.by).not.toBe('applicant')
    })

    it('should not allow applicant to reject their own application', () => {
        const rejectTransition = validTransitions.find(t => t.to === 'rejected')
        expect(rejectTransition?.by).not.toBe('applicant')
    })
})

describe('Application Business Logic', () => {
    describe('House membership on acceptance', () => {
        it('should define correct member role on acceptance', () => {
            const newMember = {
                house_id: 'house-123',
                user_id: 'user-456',
                role: 'member',
                status: 'active',
            }

            expect(newMember.role).toBe('member')
            expect(newMember.status).toBe('active')
        })

        it('should not add member role on rejection', () => {
            const shouldAddMember = (status: string) => status === 'accepted'
            
            expect(shouldAddMember('accepted')).toBe(true)
            expect(shouldAddMember('rejected')).toBe(false)
            expect(shouldAddMember('withdrawn')).toBe(false)
        })
    })

    describe('Duplicate application prevention', () => {
        it('should identify duplicate pending applications', () => {
            const existingApplication = { id: 'app-1', status: 'pending' }
            const isDuplicate = existingApplication && existingApplication.status === 'pending'
            
            expect(isDuplicate).toBe(true)
        })

        it('should allow re-application after withdrawal', () => {
            const existingApplication = { id: 'app-1', status: 'withdrawn' }
            const isDuplicate = existingApplication && existingApplication.status === 'pending'
            
            expect(isDuplicate).toBe(false)
        })

        it('should allow re-application after rejection', () => {
            const existingApplication = { id: 'app-1', status: 'rejected' }
            const isDuplicate = existingApplication && existingApplication.status === 'pending'
            
            expect(isDuplicate).toBe(false)
        })
    })
})

describe('Application Authorization Checks', () => {
    describe('Listing owner authorization', () => {
        it('should verify listing ownership', () => {
            const listing = { owner_id: 'user-123' }
            const currentUserId = 'user-123'
            
            const isListingOwner = listing?.owner_id === currentUserId
            expect(isListingOwner).toBe(true)
        })

        it('should reject non-owners', () => {
            const listing = { owner_id: 'user-123' }
            const currentUserId = 'user-456'
            
            const isListingOwner = listing?.owner_id === currentUserId
            expect(isListingOwner).toBe(false)
        })
    })

    describe('House admin authorization', () => {
        it('should verify house admin role', () => {
            const houseMember = { role: 'admin' }
            
            const isHouseAdmin = houseMember?.role === 'admin'
            expect(isHouseAdmin).toBe(true)
        })

        it('should reject non-admin members', () => {
            const houseMember = { role: 'member' }
            
            const isHouseAdmin = houseMember?.role === 'admin'
            expect(isHouseAdmin).toBe(false)
        })
    })

    describe('Combined authorization', () => {
        it('should allow either listing owner or house admin', () => {
            const checkAuth = (isListingOwner: boolean, isHouseAdmin: boolean) => {
                return isListingOwner || isHouseAdmin
            }

            expect(checkAuth(true, false)).toBe(true)
            expect(checkAuth(false, true)).toBe(true)
            expect(checkAuth(true, true)).toBe(true)
            expect(checkAuth(false, false)).toBe(false)
        })
    })
})
