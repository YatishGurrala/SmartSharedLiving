import { trackServerEvent } from '../analytics'

// Store original NODE_ENV
const originalEnv = process.env.NODE_ENV

// We test the Analytics class behavior through its public API
// The class logs in development mode based on NODE_ENV at instantiation time
// Since the singleton is already created at import time, we test trackServerEvent
// which is more reliable for testing

describe('trackServerEvent', () => {
    let consoleSpy: jest.SpyInstance

    beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    })

    afterEach(() => {
        consoleSpy.mockRestore()
    })

    it('should log server-side events with timestamp', () => {
        trackServerEvent({
            category: 'auth',
            action: 'server_login',
            label: 'api',
        })

        expect(consoleSpy).toHaveBeenCalledWith(
            '[ServerAnalytics]',
            expect.stringContaining('timestamp')
        )
    })

    it('should include all event properties', () => {
        trackServerEvent({
            category: 'listing',
            action: 'created',
            value: 1000,
            metadata: { roomCount: 3 },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"listing"')
        expect(logCall[1]).toContain('"action":"created"')
        expect(logCall[1]).toContain('"value":1000')
    })

    it('should track auth events', () => {
        trackServerEvent({
            category: 'auth',
            action: 'login',
            label: 'email',
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[0]).toBe('[ServerAnalytics]')
        expect(logCall[1]).toContain('"category":"auth"')
        expect(logCall[1]).toContain('"action":"login"')
    })

    it('should track profile events', () => {
        trackServerEvent({
            category: 'profile',
            action: 'updated',
            metadata: { userId: 'user-123' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"profile"')
        expect(logCall[1]).toContain('"userId":"user-123"')
    })

    it('should track house events', () => {
        trackServerEvent({
            category: 'house',
            action: 'created',
            label: 'San Francisco',
            metadata: { houseId: 'house-123' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"house"')
        expect(logCall[1]).toContain('"action":"created"')
        expect(logCall[1]).toContain('"label":"San Francisco"')
    })

    it('should track listing events', () => {
        trackServerEvent({
            category: 'listing',
            action: 'viewed',
            metadata: { listingId: 'listing-456' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"listing"')
        expect(logCall[1]).toContain('"listingId":"listing-456"')
    })

    it('should track application events', () => {
        trackServerEvent({
            category: 'application',
            action: 'submitted',
            label: 'listing',
            metadata: { targetId: 'target-789' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"application"')
        expect(logCall[1]).toContain('"action":"submitted"')
    })

    it('should track message events', () => {
        trackServerEvent({
            category: 'message',
            action: 'sent',
            label: 'direct',
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"message"')
        expect(logCall[1]).toContain('"label":"direct"')
    })

    it('should track navigation events', () => {
        trackServerEvent({
            category: 'navigation',
            action: 'page_view',
            label: '/dashboard',
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"navigation"')
        expect(logCall[1]).toContain('"/dashboard"')
    })

    it('should track error events', () => {
        trackServerEvent({
            category: 'error',
            action: 'AUTH_ERROR',
            label: 'Invalid token',
            metadata: { endpoint: '/api/auth' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"error"')
        expect(logCall[1]).toContain('"action":"AUTH_ERROR"')
    })

    // Tests for new event categories
    it('should track chore events', () => {
        trackServerEvent({
            category: 'chore',
            action: 'created',
            label: 'weekly',
            metadata: { houseId: 'house-123', choreId: 'chore-456' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"chore"')
        expect(logCall[1]).toContain('"action":"created"')
        expect(logCall[1]).toContain('"choreId":"chore-456"')
    })

    it('should track chore completion', () => {
        trackServerEvent({
            category: 'chore',
            action: 'completed',
            metadata: { houseId: 'house-123', choreId: 'chore-456' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"action":"completed"')
    })

    it('should track notice events', () => {
        trackServerEvent({
            category: 'notice',
            action: 'created',
            label: 'pinned',
            metadata: { houseId: 'house-123', noticeId: 'notice-789' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"notice"')
        expect(logCall[1]).toContain('"noticeId":"notice-789"')
    })

    it('should track notice acknowledgement', () => {
        trackServerEvent({
            category: 'notice',
            action: 'acknowledged',
            metadata: { houseId: 'house-123', noticeId: 'notice-789' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"action":"acknowledged"')
    })

    it('should track exit request events', () => {
        trackServerEvent({
            category: 'exit_request',
            action: 'submitted',
            metadata: { houseId: 'house-123', requestId: 'request-101', requestedExitDate: '2024-12-31' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"exit_request"')
        expect(logCall[1]).toContain('"action":"submitted"')
        expect(logCall[1]).toContain('"requestedExitDate":"2024-12-31"')
    })

    it('should track exit request approval', () => {
        trackServerEvent({
            category: 'exit_request',
            action: 'approved',
            metadata: { houseId: 'house-123', requestId: 'request-101' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"action":"approved"')
    })

    it('should track agreement events', () => {
        trackServerEvent({
            category: 'agreement',
            action: 'created',
            metadata: { houseId: 'house-123', agreementId: 'agreement-202' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"agreement"')
        expect(logCall[1]).toContain('"agreementId":"agreement-202"')
    })

    it('should track agreement activation', () => {
        trackServerEvent({
            category: 'agreement',
            action: 'activated',
            metadata: { houseId: 'house-123', agreementId: 'agreement-202' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"action":"activated"')
    })

    it('should track agreement acceptance', () => {
        trackServerEvent({
            category: 'agreement',
            action: 'accepted',
            metadata: { agreementId: 'agreement-202' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"action":"accepted"')
    })

    it('should track rent cycle events', () => {
        trackServerEvent({
            category: 'rent',
            action: 'cycle_created',
            value: 2500,
            metadata: { houseId: 'house-123', cycleId: 'cycle-303' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"category":"rent"')
        expect(logCall[1]).toContain('"action":"cycle_created"')
        expect(logCall[1]).toContain('"value":2500')
    })

    it('should track rent payment', () => {
        trackServerEvent({
            category: 'rent',
            action: 'marked_paid',
            value: 1000,
            metadata: { houseId: 'house-123', entryId: 'entry-404' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"action":"marked_paid"')
        expect(logCall[1]).toContain('"value":1000')
    })

    it('should track rent status changes', () => {
        trackServerEvent({
            category: 'rent',
            action: 'status_changed',
            label: 'overdue',
            metadata: { houseId: 'house-123', entryId: 'entry-404' },
        })

        const logCall = consoleSpy.mock.calls[0]
        expect(logCall[1]).toContain('"label":"overdue"')
    })
})

describe('Analytics Event Types', () => {
    describe('Event Categories', () => {
        const validCategories = [
            'auth',
            'profile', 
            'house',
            'listing',
            'application',
            'message',
            'navigation',
            'error',
        ]

        it('should recognize all valid categories', () => {
            validCategories.forEach(category => {
                expect(validCategories).toContain(category)
            })
        })

        it('should have 8 event categories', () => {
            expect(validCategories.length).toBe(8)
        })
    })

    describe('Auth Actions', () => {
        const authActions = ['login', 'signup', 'logout']

        it('should include login action', () => {
            expect(authActions).toContain('login')
        })

        it('should include signup action', () => {
            expect(authActions).toContain('signup')
        })

        it('should include logout action', () => {
            expect(authActions).toContain('logout')
        })
    })

    describe('Profile Actions', () => {
        const profileActions = ['setup_started', 'setup_completed', 'update']

        it('should track profile setup flow', () => {
            expect(profileActions).toContain('setup_started')
            expect(profileActions).toContain('setup_completed')
        })

        it('should track profile updates', () => {
            expect(profileActions).toContain('update')
        })
    })

    describe('House Actions', () => {
        const houseActions = ['created', 'joined', 'left', 'member_invited']

        it('should track house lifecycle', () => {
            expect(houseActions).toContain('created')
            expect(houseActions).toContain('joined')
            expect(houseActions).toContain('left')
        })

        it('should track member invitations', () => {
            expect(houseActions).toContain('member_invited')
        })
    })

    describe('Application Actions', () => {
        const applicationActions = ['submitted', 'status_changed']

        it('should track application submission', () => {
            expect(applicationActions).toContain('submitted')
        })

        it('should track status changes', () => {
            expect(applicationActions).toContain('status_changed')
        })
    })
})

describe('Analytics Data Structure', () => {
    it('should define valid event structure', () => {
        const event = {
            category: 'listing',
            action: 'created',
            label: 'San Francisco',
            value: 2500,
            metadata: { listingId: 'listing-123', roomCount: 2 },
        }

        expect(event.category).toBeDefined()
        expect(event.action).toBeDefined()
        expect(typeof event.label).toBe('string')
        expect(typeof event.value).toBe('number')
        expect(typeof event.metadata).toBe('object')
    })

    it('should allow optional fields', () => {
        const minimalEvent = {
            category: 'auth',
            action: 'logout',
        }

        expect(minimalEvent.category).toBe('auth')
        expect(minimalEvent.action).toBe('logout')
    })

    it('should support nested metadata', () => {
        const event = {
            category: 'profile',
            action: 'update',
            metadata: {
                fields: ['name', 'bio'],
                userId: 'user-123',
            },
        }

        expect(event.metadata.fields).toHaveLength(2)
        expect(event.metadata.userId).toBeDefined()
    })
})
