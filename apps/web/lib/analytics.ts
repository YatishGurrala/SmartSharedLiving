// Analytics tracking utilities
// Supports both client and server-side event tracking

type EventCategory = 
    | 'auth'
    | 'profile'
    | 'house'
    | 'listing'
    | 'application'
    | 'message'
    | 'navigation'
    | 'error'
    | 'chore'
    | 'notice'
    | 'exit_request'
    | 'agreement'
    | 'rent'

interface AnalyticsEvent {
    category: EventCategory
    action: string
    label?: string
    value?: number
    metadata?: Record<string, unknown>
}

interface PageView {
    path: string
    title?: string
    referrer?: string
}

interface UserProperties {
    userId?: string
    email?: string
    city?: string
    role?: string
    [key: string]: unknown
}

class Analytics {
    private isEnabled: boolean
    private userId: string | null = null
    private sessionId: string
    private queue: AnalyticsEvent[] = []

    constructor() {
        this.isEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'
        this.sessionId = this.generateSessionId()
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    setUser(userId: string | null, properties?: UserProperties): void {
        this.userId = userId
        if (this.isEnabled && userId) {
            this.log('user_identified', { userId, ...properties })
        }
    }

    trackEvent(event: AnalyticsEvent): void {
        const enrichedEvent = {
            ...event,
            timestamp: new Date().toISOString(),
            userId: this.userId,
            sessionId: this.sessionId,
        }

        if (this.isEnabled) {
            this.sendEvent(enrichedEvent)
        }
        
        // Always log in development
        if (process.env.NODE_ENV === 'development') {
            this.log('event', enrichedEvent)
        }
    }

    trackPageView(pageView: PageView): void {
        const event = {
            category: 'navigation' as EventCategory,
            action: 'page_view',
            label: pageView.path,
            metadata: {
                title: pageView.title,
                referrer: pageView.referrer,
            },
        }
        this.trackEvent(event)
    }

    // Auth events
    trackLogin(method: string): void {
        this.trackEvent({
            category: 'auth',
            action: 'login',
            label: method,
        })
    }

    trackSignup(method: string): void {
        this.trackEvent({
            category: 'auth',
            action: 'signup',
            label: method,
        })
    }

    trackLogout(): void {
        this.trackEvent({
            category: 'auth',
            action: 'logout',
        })
    }

    // Profile events
    trackProfileSetup(completed: boolean): void {
        this.trackEvent({
            category: 'profile',
            action: completed ? 'setup_completed' : 'setup_started',
        })
    }

    trackProfileUpdate(fields: string[]): void {
        this.trackEvent({
            category: 'profile',
            action: 'update',
            metadata: { fields },
        })
    }

    // House events
    trackHouseCreated(houseId: string, city: string): void {
        this.trackEvent({
            category: 'house',
            action: 'created',
            label: city,
            metadata: { houseId },
        })
    }

    trackHouseJoined(houseId: string): void {
        this.trackEvent({
            category: 'house',
            action: 'joined',
            metadata: { houseId },
        })
    }

    trackHouseLeft(houseId: string): void {
        this.trackEvent({
            category: 'house',
            action: 'left',
            metadata: { houseId },
        })
    }

    trackMemberInvited(houseId: string): void {
        this.trackEvent({
            category: 'house',
            action: 'member_invited',
            metadata: { houseId },
        })
    }

    // Listing events
    trackListingCreated(listingId: string, city: string, rent: number): void {
        this.trackEvent({
            category: 'listing',
            action: 'created',
            label: city,
            value: rent,
            metadata: { listingId },
        })
    }

    trackListingViewed(listingId: string): void {
        this.trackEvent({
            category: 'listing',
            action: 'viewed',
            metadata: { listingId },
        })
    }

    // Application events
    trackApplicationSubmitted(targetId: string, targetType: 'listing' | 'house'): void {
        this.trackEvent({
            category: 'application',
            action: 'submitted',
            label: targetType,
            metadata: { targetId },
        })
    }

    trackApplicationStatusChanged(applicationId: string, status: string): void {
        this.trackEvent({
            category: 'application',
            action: 'status_changed',
            label: status,
            metadata: { applicationId },
        })
    }

    // Message events
    trackMessageSent(conversationType: 'direct' | 'house'): void {
        this.trackEvent({
            category: 'message',
            action: 'sent',
            label: conversationType,
        })
    }

    trackConversationStarted(recipientId: string): void {
        this.trackEvent({
            category: 'message',
            action: 'conversation_started',
            metadata: { recipientId },
        })
    }

    // Error tracking
    trackError(errorCode: string, errorMessage: string, context?: Record<string, unknown>): void {
        this.trackEvent({
            category: 'error',
            action: errorCode,
            label: errorMessage,
            metadata: context,
        })
    }

    // Chore events
    trackChoreCreated(houseId: string, choreId: string, frequency: string): void {
        this.trackEvent({
            category: 'chore',
            action: 'created',
            label: frequency,
            metadata: { houseId, choreId },
        })
    }

    trackChoreCompleted(houseId: string, choreId: string): void {
        this.trackEvent({
            category: 'chore',
            action: 'completed',
            metadata: { houseId, choreId },
        })
    }

    trackChoreAssigned(houseId: string, choreId: string, assigneeId: string): void {
        this.trackEvent({
            category: 'chore',
            action: 'assigned',
            metadata: { houseId, choreId, assigneeId },
        })
    }

    trackChoreDeleted(houseId: string, choreId: string): void {
        this.trackEvent({
            category: 'chore',
            action: 'deleted',
            metadata: { houseId, choreId },
        })
    }

    // Notice events
    trackNoticeCreated(houseId: string, noticeId: string, priority: string): void {
        this.trackEvent({
            category: 'notice',
            action: 'created',
            label: priority,
            metadata: { houseId, noticeId },
        })
    }

    trackNoticeAcknowledged(houseId: string, noticeId: string): void {
        this.trackEvent({
            category: 'notice',
            action: 'acknowledged',
            metadata: { houseId, noticeId },
        })
    }

    trackNoticePinned(houseId: string, noticeId: string, isPinned: boolean): void {
        this.trackEvent({
            category: 'notice',
            action: isPinned ? 'pinned' : 'unpinned',
            metadata: { houseId, noticeId },
        })
    }

    trackNoticeDeleted(houseId: string, noticeId: string): void {
        this.trackEvent({
            category: 'notice',
            action: 'deleted',
            metadata: { houseId, noticeId },
        })
    }

    // Exit request events
    trackExitRequestSubmitted(houseId: string, requestId: string, requestedExitDate: string): void {
        this.trackEvent({
            category: 'exit_request',
            action: 'submitted',
            metadata: { houseId, requestId, requestedExitDate },
        })
    }

    trackExitRequestApproved(houseId: string, requestId: string): void {
        this.trackEvent({
            category: 'exit_request',
            action: 'approved',
            metadata: { houseId, requestId },
        })
    }

    trackExitRequestRejected(houseId: string, requestId: string): void {
        this.trackEvent({
            category: 'exit_request',
            action: 'rejected',
            metadata: { houseId, requestId },
        })
    }

    trackExitRequestCancelled(houseId: string, requestId: string): void {
        this.trackEvent({
            category: 'exit_request',
            action: 'cancelled',
            metadata: { houseId, requestId },
        })
    }

    // Agreement events
    trackAgreementCreated(houseId: string, agreementId: string): void {
        this.trackEvent({
            category: 'agreement',
            action: 'created',
            metadata: { houseId, agreementId },
        })
    }

    trackAgreementActivated(houseId: string, agreementId: string): void {
        this.trackEvent({
            category: 'agreement',
            action: 'activated',
            metadata: { houseId, agreementId },
        })
    }

    trackAgreementAccepted(agreementId: string): void {
        this.trackEvent({
            category: 'agreement',
            action: 'accepted',
            metadata: { agreementId },
        })
    }

    trackAgreementArchived(houseId: string, agreementId: string): void {
        this.trackEvent({
            category: 'agreement',
            action: 'archived',
            metadata: { houseId, agreementId },
        })
    }

    // Rent events
    trackRentCycleCreated(houseId: string, cycleId: string, totalAmount: number): void {
        this.trackEvent({
            category: 'rent',
            action: 'cycle_created',
            value: totalAmount,
            metadata: { houseId, cycleId },
        })
    }

    trackRentMarkedPaid(houseId: string, entryId: string, amount: number): void {
        this.trackEvent({
            category: 'rent',
            action: 'marked_paid',
            value: amount,
            metadata: { houseId, entryId },
        })
    }

    trackRentStatusChanged(houseId: string, entryId: string, status: string): void {
        this.trackEvent({
            category: 'rent',
            action: 'status_changed',
            label: status,
            metadata: { houseId, entryId },
        })
    }

    trackRentCycleDeleted(houseId: string, cycleId: string): void {
        this.trackEvent({
            category: 'rent',
            action: 'cycle_deleted',
            metadata: { houseId, cycleId },
        })
    }

    private async sendEvent(event: unknown): Promise<void> {
        // In production, send to analytics service
        // For now, we'll use a simple console log and could integrate with:
        // - Google Analytics
        // - Mixpanel
        // - Amplitude
        // - PostHog
        // - Custom backend
        
        if (typeof window !== 'undefined' && (window as any).gtag) {
            const { category, action, label, value, metadata } = event as AnalyticsEvent
            ;(window as any).gtag('event', action, {
                event_category: category,
                event_label: label,
                value,
                ...metadata,
            })
        }
    }

    private log(type: string, data: unknown): void {
        console.log(`[Analytics:${type}]`, JSON.stringify(data, null, 2))
    }
}

// Singleton instance
export const analytics = new Analytics()

// Server-side analytics helper
export function trackServerEvent(event: AnalyticsEvent): void {
    // Log server-side events
    console.log('[ServerAnalytics]', JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
    }))
}
